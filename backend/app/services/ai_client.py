from __future__ import annotations

from datetime import datetime, UTC
import json
from time import perf_counter, sleep
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from flask import current_app


def _gateway_url() -> str:
    return str(current_app.config.get('AI_GATEWAY_URL', 'http://ai-gateway:5000')).rstrip('/')


def _timeout_seconds() -> float:
    return float(current_app.config.get('AI_GATEWAY_TIMEOUT_SECONDS', 20))


def _max_retries() -> int:
    return int(current_app.config.get('AI_GATEWAY_RETRIES', 2))


def chat_endpoint() -> str:
    endpoint = str(current_app.config.get('AI_GATEWAY_CHAT_ENDPOINT', '/api/chat')).strip() or '/api/chat'
    if not endpoint.startswith('/'):
        endpoint = f'/{endpoint}'
    return endpoint


def _build_request(url: str, method: str = 'POST', payload: dict[str, Any] | None = None) -> Request:
    data = None
    headers = {'Content-Type': 'application/json'}
    if payload is not None:
        data = json.dumps(payload).encode('utf-8')
    return Request(url, data=data, headers=headers, method=method)


def _log_gateway_event(endpoint: str, success: bool, latency_ms: float, attempt: int, status_code: int | None, error: str | None) -> None:
    current_app.logger.info(
        '[AI_GATEWAY] ts=%s endpoint=%s success=%s latency_ms=%.2f attempt=%s status=%s error=%s',
        datetime.now(UTC).isoformat(),
        endpoint,
        success,
        latency_ms,
        attempt,
        status_code if status_code is not None else '-',
        error or '-',
    )


def send_ai_request(payload: dict[str, Any], endpoint: str = '/api/chat') -> dict[str, Any]:
    target = f'{_gateway_url()}{endpoint}'
    retries = _max_retries()

    last_error = 'AI service unavailable'
    for attempt in range(1, retries + 2):
        started = perf_counter()
        status_code: int | None = None
        try:
            request = _build_request(target, method='POST', payload=payload)
            with urlopen(request, timeout=_timeout_seconds()) as response:
                status_code = response.getcode()
                raw = response.read().decode('utf-8')
                data = json.loads(raw) if raw else {}
                _log_gateway_event(endpoint, True, (perf_counter() - started) * 1000, attempt, status_code, None)
                return data if isinstance(data, dict) else {'data': data}
        except HTTPError as error:
            status_code = error.code
            last_error = error.read().decode('utf-8', errors='ignore') or str(error)
            _log_gateway_event(endpoint, False, (perf_counter() - started) * 1000, attempt, status_code, last_error)
        except (URLError, TimeoutError, json.JSONDecodeError, ValueError) as error:
            last_error = str(error)
            _log_gateway_event(endpoint, False, (perf_counter() - started) * 1000, attempt, status_code, last_error)

        if attempt <= retries:
            sleep(0.35 * attempt)

    raise RuntimeError(f'AI service unavailable: {last_error}')


def check_ai_gateway_status() -> dict[str, Any]:
    health_candidates = ['/health', '/api/health', '/']
    for endpoint in health_candidates:
        target = f'{_gateway_url()}{endpoint}'
        started = perf_counter()
        try:
            request = _build_request(target, method='GET')
            with urlopen(request, timeout=_timeout_seconds()) as response:
                raw = response.read().decode('utf-8')
                payload = json.loads(raw) if raw else {}
                _log_gateway_event(endpoint, True, (perf_counter() - started) * 1000, 1, response.getcode(), None)
                return {
                    'ok': True,
                    'endpoint': endpoint,
                    'payload': payload if isinstance(payload, dict) else {'data': payload},
                }
        except Exception as error:  # noqa: BLE001 - status endpoint should try both candidates
            _log_gateway_event(endpoint, False, (perf_counter() - started) * 1000, 1, None, str(error))
            continue
    return {'ok': False, 'endpoint': None, 'payload': {'error': 'AI service unavailable'}}


def extract_ai_text(gateway_payload: dict[str, Any]) -> str:
    if not isinstance(gateway_payload, dict):
        raise ValueError('Invalid AI gateway payload')

    candidates: list[Any] = [
        gateway_payload.get('response'),
        gateway_payload.get('content'),
        gateway_payload.get('text'),
        gateway_payload.get('message'),
        gateway_payload.get('output_text'),
    ]

    data = gateway_payload.get('data')
    if isinstance(data, dict):
        candidates.extend([
            data.get('response'),
            data.get('content'),
            data.get('text'),
            data.get('message'),
            data.get('output_text'),
        ])

        choices = data.get('choices')
        if isinstance(choices, list) and choices:
            first = choices[0]
            if isinstance(first, dict):
                message = first.get('message')
                if isinstance(message, dict):
                    candidates.append(message.get('content'))

    choices = gateway_payload.get('choices')
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get('message')
            if isinstance(message, dict):
                candidates.append(message.get('content'))

    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    raise ValueError('AI gateway payload did not contain response text')
