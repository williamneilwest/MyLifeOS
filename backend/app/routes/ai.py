import json
import re
from json import JSONDecodeError
from typing import Any

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import Project, Task
from ..services.ai_client import check_ai_gateway_status, chat_endpoint, extract_ai_text, send_ai_request


ai_bp = Blueprint('ai', __name__)

PROMPT_TEMPLATE = """Convert the following idea into a structured software project.

Return ONLY valid JSON.

Required JSON schema:
{
"name": "string",
"description": "string",
"status": "New",
"tags": ["string"],
"plan": ["string"],
"difficulty": "Easy | Medium | Hard",
"estimated_time": "string"
}

Rules:

* Do NOT include any explanation outside JSON
* Keep plan steps concise and actionable
* Tags should be relevant technologies or concepts
* Description should be clean and professional

Idea:
{{idea}}"""


def _extract_json_payload(raw_text: str) -> dict[str, Any]:
    normalized = raw_text.strip()
    fence_match = re.match(r'^```(?:json)?\s*(.*?)\s*```$', normalized, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        normalized = fence_match.group(1).strip()

    try:
        parsed = json.loads(normalized)
    except JSONDecodeError:
        start = normalized.find('{')
        end = normalized.rfind('}')
        if start == -1 or end == -1 or start >= end:
            raise
        parsed = json.loads(normalized[start:end + 1])

    if not isinstance(parsed, dict):
        raise ValueError('AI response JSON must be an object')
    return parsed


def _validate_ai_payload(payload: dict[str, Any]) -> tuple[str, str, list[str], list[str], str, str]:
    name = str(payload.get('name') or '').strip()
    description = str(payload.get('description') or '').strip()
    tags_raw = payload.get('tags') or []
    plan_raw = payload.get('plan') or []
    difficulty = str(payload.get('difficulty') or '').strip()
    estimated_time = str(payload.get('estimated_time') or '').strip()

    if not name:
        raise ValueError('AI payload is missing "name"')
    if not description:
        raise ValueError('AI payload is missing "description"')
    if not isinstance(tags_raw, list):
        raise ValueError('AI payload "tags" must be an array')
    if not isinstance(plan_raw, list):
        raise ValueError('AI payload "plan" must be an array')

    tags = [str(item).strip() for item in tags_raw if str(item).strip()]
    plan = [str(item).strip() for item in plan_raw if str(item).strip()]
    if not plan:
        raise ValueError('AI payload "plan" must contain at least one step')

    if difficulty not in {'Easy', 'Medium', 'Hard'}:
        difficulty = 'Medium'
    if not estimated_time:
        estimated_time = 'TBD'

    return name, description, tags, plan, difficulty, estimated_time


def _call_ai_gateway_for_project(idea: str) -> dict[str, Any]:
    prompt = PROMPT_TEMPLATE.replace('{{idea}}', idea)
    model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')

    last_error: Exception | None = None
    for attempt in range(2):
        gateway_payload = send_ai_request(
            {
                'model': model,
                'temperature': 0.2,
                'prompt': prompt,
                'messages': [{'role': 'user', 'content': prompt}],
            },
            endpoint=chat_endpoint(),
        )
        raw = extract_ai_text(gateway_payload).strip()
        current_app.logger.info('[AI] Raw create-project response (attempt %s): %s', attempt + 1, raw)

        try:
            return _extract_json_payload(raw)
        except Exception as error:  # noqa: BLE001 - we need to retry on all parsing issues
            last_error = error
            current_app.logger.warning('[AI] JSON parse failed on attempt %s: %s', attempt + 1, error)

    raise ValueError(f'Unable to parse AI JSON response: {last_error}')


@ai_bp.post('/create-project', strict_slashes=False)
def create_project_from_idea():
    payload = request.get_json(silent=True) or {}
    idea = str(payload.get('idea') or '').strip()
    generate_tasks = bool(payload.get('generateTasks', True))

    if not idea:
        return error_response('idea is required', 400)

    try:
        ai_payload = _call_ai_gateway_for_project(idea)
        name, description, tags, plan, difficulty, estimated_time = _validate_ai_payload(ai_payload)

        notes_lines = plan + ['', f'Difficulty: {difficulty}', f'Estimated time: {estimated_time}']
        project = Project(
            name=name,
            description=description,
            status='New',
            tags=tags,
            notes='\n'.join(notes_lines),
        )
        db.session.add(project)
        db.session.flush()

        created_tasks: list[Task] = []
        if generate_tasks:
            for step in plan:
                task = Task(
                    title=step,
                    completed=False,
                    status='todo',
                    priority='medium',
                    project_id=project.id,
                )
                db.session.add(task)
                created_tasks.append(task)

        db.session.commit()

        return success_response(
            {
                'project': project.to_dict(),
                'tasks': [task.to_dict() for task in created_tasks],
                'ai': {
                    'difficulty': difficulty,
                    'estimated_time': estimated_time,
                },
            },
            201,
        )
    except Exception as error:  # noqa: BLE001 - route must fail gracefully for any AI/runtime error
        db.session.rollback()
        current_app.logger.exception('[AI] Failed to create project from idea: %s', error)
        if 'AI service unavailable' in str(error):
            return error_response('AI service unavailable', 503)
        return error_response(str(error), 500)


@ai_bp.post('/chat', strict_slashes=False)
def chat_via_gateway():
    payload = request.get_json(silent=True) or {}
    user_input = str(payload.get('message') or payload.get('idea') or payload.get('prompt') or '').strip()
    if not user_input:
        return error_response('message is required', 400)

    try:
        model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')
        gateway_payload = send_ai_request(
            {
                'model': model,
                'temperature': payload.get('temperature', 0.2),
                'prompt': user_input,
                'messages': payload.get('messages') or [{'role': 'user', 'content': user_input}],
            },
            endpoint=chat_endpoint(),
        )
        response_text = extract_ai_text(gateway_payload)
        return success_response({'response': response_text, 'gateway': gateway_payload})
    except Exception as error:  # noqa: BLE001 - gateway failures should return stable payload
        current_app.logger.exception('[AI] Gateway chat failed: %s', error)
        return error_response('AI service unavailable', 503)


@ai_bp.get('/status', strict_slashes=False)
def ai_status():
    status_payload = check_ai_gateway_status()
    if status_payload.get('ok'):
        return success_response({'gateway': status_payload})
    return error_response('AI service unavailable', 503)


@ai_bp.get('/test', strict_slashes=False)
def ai_test():
    try:
        model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')
        gateway_payload = send_ai_request(
            {
                'model': model,
                'temperature': 0,
                'prompt': 'Reply with exactly: AI gateway test ok',
                'messages': [{'role': 'user', 'content': 'Reply with exactly: AI gateway test ok'}],
            },
            endpoint=chat_endpoint(),
        )
        response_text = extract_ai_text(gateway_payload)
        return success_response({'message': response_text, 'gateway': gateway_payload})
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[AI] Gateway test failed: %s', error)
        return error_response('AI service unavailable', 503)
