import json
import re
from json import JSONDecodeError
from pathlib import Path
from typing import Any

from .ai_client import chat_endpoint, extract_ai_text, send_ai_request


def detect_configured_endpoints() -> list[str]:
    candidates: set[str] = set()
    import os

    for key in (
        'APP_DOMAIN',
        'FRONTEND_URL',
        'PUBLIC_URL',
        'API_BASE_URL',
        'BACKEND_URL',
        'VITE_API_BASE_URL',
        'CORS_ORIGINS',
    ):
        env_value = os.getenv(key, '').strip()
        if env_value:
            for token in re.split(r'[\s,;]+', env_value):
                if token.startswith('http://') or token.startswith('https://'):
                    candidates.add(token.rstrip('/'))

    repo_root = Path(__file__).resolve().parents[3]
    files_to_scan = [
        repo_root / 'docker-compose.yml',
        repo_root / 'frontend' / '.env',
        repo_root / 'frontend' / '.env.example',
        repo_root / 'frontend' / 'vite.config.ts',
        repo_root / 'frontend' / 'vite.config.js',
    ]

    url_pattern = re.compile(r'https?://[a-zA-Z0-9\.\-:_/]+')
    host_pattern = re.compile(r'\b([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b')
    for file_path in files_to_scan:
        if not file_path.exists():
            continue
        content = file_path.read_text(encoding='utf-8', errors='ignore')
        for match in url_pattern.findall(content):
            candidates.add(match.rstrip('/'))
        for host in host_pattern.findall(content):
            if host.startswith('localhost'):
                continue
            candidates.add(f'https://{host}'.rstrip('/'))

    prioritized = sorted(candidates, key=lambda value: (0 if 'pridebytes.com' in value else 1, value))
    return prioritized


def _extract_json_object(text: str) -> dict[str, Any]:
    normalized = text.strip()
    fence_match = re.match(r'^```(?:json)?\s*(.*?)\s*```$', normalized, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        normalized = fence_match.group(1).strip()

    try:
        payload = json.loads(normalized)
    except JSONDecodeError:
        start = normalized.find('{')
        end = normalized.rfind('}')
        if start == -1 or end == -1 or start >= end:
            raise
        payload = json.loads(normalized[start:end + 1])

    if not isinstance(payload, dict):
        raise ValueError('Generated payload is not a JSON object')
    return payload


def _sanitize_generation_payload(payload: dict[str, Any]) -> dict[str, Any]:
    feature_name = str(payload.get('feature_name') or '').strip()
    summary = str(payload.get('summary') or '').strip()
    codex_prompt = str(payload.get('codex_prompt') or '').strip()
    risk_level = str(payload.get('risk_level') or 'Medium').strip().title()
    files_affected_raw = payload.get('files_affected') or []
    rollback_plan = str(payload.get('rollback_plan') or '').strip()

    if not feature_name:
        raise ValueError('feature_name is required in generation payload')
    if not summary:
        raise ValueError('summary is required in generation payload')
    if not codex_prompt:
        raise ValueError('codex_prompt is required in generation payload')
    if not rollback_plan:
        raise ValueError('rollback_plan is required in generation payload')
    if risk_level not in {'Low', 'Medium', 'High'}:
        risk_level = 'Medium'
    if not isinstance(files_affected_raw, list):
        raise ValueError('files_affected must be an array')

    files_affected = [str(item).strip() for item in files_affected_raw if str(item).strip()]

    return {
        'feature_name': feature_name,
        'summary': summary,
        'codex_prompt': codex_prompt,
        'risk_level': risk_level,
        'files_affected': files_affected,
        'rollback_plan': rollback_plan,
    }


def generate_ai_builder_payload(idea: str, model: str) -> tuple[dict[str, Any], str]:
    endpoints = detect_configured_endpoints()
    endpoint_block = '\n'.join(f'- {endpoint}' for endpoint in endpoints) if endpoints else '- No domain endpoint configured in repository; use local/internal API endpoints.'

    prompt = f"""You are generating a safe implementation plan for an existing production-minded app.

Tech stack:
- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Flask + SQLAlchemy
- Database: SQLite now, portable later
- Git is used for checkpointing/rollback

Known configured endpoints/domains discovered from code/env:
{endpoint_block}

Return STRICT JSON only (no markdown, no prose outside JSON) using this schema:
{{
  "feature_name": "string",
  "summary": "string",
  "codex_prompt": "string",
  "risk_level": "Low | Medium | High",
  "files_affected": ["string"],
  "rollback_plan": "string"
}}

Rules:
- Prefer additive and safe changes
- Mention testing instructions in codex_prompt
- Mention domain-endpoint validation where appropriate
- Do not invent endpoints not present in the provided list
- Keep files_affected realistic and concise

Idea:
{idea}
"""

    raw_response = ''
    error_message = ''

    for attempt in range(2):
        if attempt == 0:
            request_payload = {
                'model': model,
                'temperature': 0.2,
                'prompt': prompt,
                'messages': [{'role': 'user', 'content': prompt}],
            }
        else:
            request_payload = {
                'model': model,
                'temperature': 0,
                'prompt': (
                    'Repair the previous output. Return valid JSON only, matching schema exactly.\n'
                    f'{raw_response}'
                ),
                'messages': [
                    {'role': 'system', 'content': 'Repair the previous output. Return valid JSON only, matching schema exactly.'},
                    {'role': 'user', 'content': raw_response},
                ],
            }

        gateway_payload = send_ai_request(request_payload, endpoint=chat_endpoint())
        raw_response = extract_ai_text(gateway_payload).strip()

        try:
            parsed = _extract_json_object(raw_response)
            sanitized = _sanitize_generation_payload(parsed)
            return sanitized, raw_response
        except Exception as error:  # noqa: BLE001 - parse/shape errors are retried once
            error_message = str(error)

    raise ValueError(f'Unable to parse valid generation JSON: {error_message}')
