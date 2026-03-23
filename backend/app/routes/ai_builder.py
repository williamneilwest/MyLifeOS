from datetime import UTC, datetime
import json
import re

from flask import Blueprint, current_app, jsonify, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import AIBuild
from ..services.ai_builder_executor import (
    apply_build_with_git_checkpoint,
    get_git_status_snapshot,
    revert_build_from_commit_chain,
)
from ..services.ai_builder_runtime import execute_ai_builder_apply
from ..services.ai_client import check_ai_gateway_status, send_ai_request


ai_builder_bp = Blueprint('ai_builder', __name__)


def _default_build_payload() -> dict[str, object]:
    return {
        'codexPrompt': '',
        'risk': 'medium',
        'filesAffected': [],
        'rollbackPlan': '',
    }


def _failure_build_payload() -> dict[str, object]:
    return {
        'codexPrompt': 'AI failed. Try again.',
        'risk': 'unknown',
        'filesAffected': [],
        'rollbackPlan': 'Retry operation',
    }


def _extract_json_object(raw_text: str) -> dict[str, object]:
    normalized = raw_text.strip()
    fence_match = re.match(r'^```(?:json)?\s*(.*?)\s*```$', normalized, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        normalized = fence_match.group(1).strip()

    parsed = json.loads(normalized)
    if not isinstance(parsed, dict):
        raise ValueError('Expected JSON object')
    return parsed


def _normalize_build_payload(parsed: dict[str, object]) -> dict[str, object]:
    codex_prompt = str(parsed.get('codexPrompt') or parsed.get('codex_prompt') or '').strip()
    risk = str(parsed.get('risk') or 'medium').strip().lower()
    rollback_plan = str(parsed.get('rollbackPlan') or parsed.get('rollback_plan') or '').strip()
    files_affected_raw = parsed.get('filesAffected') or parsed.get('files_affected') or []

    if risk not in {'low', 'medium', 'high'}:
        risk = 'medium'
    if not isinstance(files_affected_raw, list):
        files_affected_raw = []

    files_affected = [str(item).strip() for item in files_affected_raw if str(item).strip()]
    return {
        'codexPrompt': codex_prompt,
        'risk': risk,
        'filesAffected': files_affected,
        'rollbackPlan': rollback_plan,
    }


@ai_builder_bp.post('/ai-builder/generate', strict_slashes=False)
def generate_build():
    payload = request.get_json(silent=True) or {}
    idea = str(payload.get('idea') or '').strip()
    if not idea:
        return jsonify({'success': False, 'build': _failure_build_payload()}), 400

    model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')
    prompt = f"""
Convert this idea into a structured build plan.

Return ONLY JSON in this format:

{{
"codexPrompt": "...",
"risk": "low|medium|high",
"filesAffected": ["..."],
"rollbackPlan": "..."
}}

Idea:
{idea}
""".strip()

    try:
        gateway_response = send_ai_request(
            {
                'model': model,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.2,
            },
            endpoint='/v1/chat/completions',
        )

        raw_response = ''
        choices = gateway_response.get('choices')
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                message = first_choice.get('message')
                if isinstance(message, dict):
                    raw_response = str(message.get('content') or '').strip()
        print('AI RAW RESPONSE:', raw_response)

        build_payload = _default_build_payload()
        if raw_response:
            try:
                parsed = _extract_json_object(raw_response)
                build_payload = _normalize_build_payload(parsed)
            except Exception:  # noqa: BLE001 - fallback payload is intentional
                build_payload = _default_build_payload()

        risk_map = {'low': 'Low', 'medium': 'Medium', 'high': 'High'}
        build = AIBuild(
            idea=idea,
            feature_name='AI Generated Build',
            summary='Generated from idea input',
            codex_prompt=str(build_payload.get('codexPrompt') or ''),
            risk_level=risk_map.get(str(build_payload.get('risk') or 'medium'), 'Medium'),
            rollback_plan=str(build_payload.get('rollbackPlan') or ''),
            status='Generated',
            generation_model=model,
            generation_raw_response=raw_response,
            error_message=None,
        )
        build.set_files_affected(build_payload.get('filesAffected') if isinstance(build_payload.get('filesAffected'), list) else [])
        db.session.add(build)
        db.session.commit()
        build_payload['id'] = build.id
        return jsonify({'success': True, 'build': build_payload}), 201
    except Exception as error:  # noqa: BLE001 - route returns clear error payload
        current_app.logger.exception('[AI_BUILDER] Generation failed: %s', error)
        fallback = _failure_build_payload()
        return jsonify({'success': False, 'build': fallback}), 200


@ai_builder_bp.get('/ai-builder/test', strict_slashes=False)
def ai_builder_test():
    model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')
    try:
        response = send_ai_request(
            {
                'model': model,
                'messages': [{'role': 'user', 'content': 'Return JSON: {"ok": true}'}],
                'temperature': 0,
            },
            endpoint='/v1/chat/completions',
        )
        return jsonify({'success': True, 'raw': response}), 200
    except Exception as error:  # noqa: BLE001
        return jsonify({'success': False, 'raw': {'error': str(error)}}), 200


@ai_builder_bp.get('/ai-builder/health', strict_slashes=False)
def ai_builder_health():
    gateway_status = check_ai_gateway_status()
    return jsonify(
        {
            'backend': 'ok',
            'gateway': 'reachable' if gateway_status.get('ok') else 'unreachable',
        }
    ), 200


@ai_builder_bp.post('/ai-builder/apply', strict_slashes=False)
def apply_generated_build():
    payload = request.get_json(silent=True) or {}
    build_payload = payload.get('build') if isinstance(payload.get('build'), dict) else {}
    model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')

    try:
        result = execute_ai_builder_apply(build_payload, model=model)
        return jsonify(result), 200
    except ValueError as error:
        return jsonify({'success': False, 'message': str(error), 'filesApplied': [], 'commandResults': []}), 400
    except Exception as error:  # noqa: BLE001 - always return structured failure
        current_app.logger.exception('[AI_BUILDER] Runtime apply failed: %s', error)
        return jsonify({'success': False, 'message': str(error), 'filesApplied': [], 'commandResults': []}), 500


@ai_builder_bp.get('/ai-builder/builds', strict_slashes=False)
def list_builds():
    builds = AIBuild.query.order_by(AIBuild.created_at.desc()).all()
    return success_response({'builds': [build.to_dict() for build in builds]})


@ai_builder_bp.get('/ai-builder/builds/<string:build_id>', strict_slashes=False)
def get_build(build_id: str):
    build = AIBuild.query.get_or_404(build_id)
    return success_response({'build': build.to_dict()})


@ai_builder_bp.post('/ai-builder/builds/<string:build_id>/apply', strict_slashes=False)
def apply_build(build_id: str):
    build = AIBuild.query.get_or_404(build_id)
    if build.status not in {'Generated', 'Failed', 'Reverted'}:
        return error_response(f'Build in status {build.status} cannot be applied', 400)

    build.status = 'Applying'
    build.apply_requested_at = datetime.now(UTC)
    build.error_message = None
    db.session.commit()

    try:
        result = apply_build_with_git_checkpoint(build)
        build.pre_change_commit_hash = result.pre_commit
        build.post_change_commit_hash = result.post_commit
        build.apply_log = result.log
        build.status = 'Applied'
        build.applied_at = datetime.now(UTC)
        build.error_message = None
        db.session.commit()
        return jsonify({'success': True, 'commit_hash': result.post_commit}), 200
    except Exception as error:  # noqa: BLE001 - apply errors must be persisted
        db.session.rollback()
        build = AIBuild.query.get(build_id)
        if build:
            build.status = 'Failed'
            build.error_message = str(error)
            build.apply_log = (build.apply_log or '') + f'\n{error}'
            db.session.commit()
        current_app.logger.exception('[AI_BUILDER] Apply failed for build %s: %s', build_id, error)
        return error_response(str(error), 500)


@ai_builder_bp.post('/ai-builder/builds/<string:build_id>/revert', strict_slashes=False)
def revert_build(build_id: str):
    build = AIBuild.query.get_or_404(build_id)
    if build.status != 'Applied':
        return error_response(f'Build in status {build.status} cannot be reverted', 400)

    try:
        reverted_commit, revert_log = revert_build_from_commit_chain(build)
        build.status = 'Reverted'
        build.reverted_at = datetime.now(UTC)
        build.apply_log = (build.apply_log or '') + '\n' + revert_log
        build.post_change_commit_hash = reverted_commit
        build.error_message = None
        db.session.commit()
        return success_response({'build': build.to_dict()})
    except Exception as error:  # noqa: BLE001
        current_app.logger.exception('[AI_BUILDER] Revert failed for build %s: %s', build_id, error)
        build.error_message = str(error)
        build.status = 'Failed'
        db.session.commit()
        return error_response(str(error), 500)


@ai_builder_bp.get('/ai-builder/status', strict_slashes=False)
def builder_status():
    latest = AIBuild.query.order_by(AIBuild.updated_at.desc()).first()
    return success_response(
        {
            'git': get_git_status_snapshot(),
            'latest_build': latest.to_dict() if latest else None,
        }
    )
