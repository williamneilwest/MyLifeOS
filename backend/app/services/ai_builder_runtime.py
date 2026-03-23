from __future__ import annotations

from pathlib import Path
import json
import os
import re
import subprocess
from typing import Any

from .ai_client import send_ai_request


PROJECT_ROOT = Path('/app').resolve()
ALLOWED_COMMANDS = ('npm install', 'npm run build', 'pip install')


def _extract_gateway_content(response: dict[str, Any]) -> str:
    choices = response.get('choices')
    if isinstance(choices, list) and choices:
        first = choices[0]
        if isinstance(first, dict):
            message = first.get('message')
            if isinstance(message, dict):
                content = message.get('content')
                if isinstance(content, str):
                    return content.strip()
    raise ValueError('Invalid AI response shape: missing choices[0].message.content')


def _parse_execution_plan(raw: str) -> dict[str, Any]:
    normalized = raw.strip()
    if normalized.startswith('```'):
        normalized = normalized.strip('`').replace('json', '', 1).strip()

    parsed = json.loads(normalized)
    if not isinstance(parsed, dict):
        raise ValueError('Execution plan must be a JSON object')

    files = parsed.get('files')
    commands = parsed.get('commands')
    if not isinstance(files, list):
        raise ValueError('"files" must be an array')
    if not isinstance(commands, list):
        raise ValueError('"commands" must be an array')
    return {'files': files, 'commands': commands}


def _parse_execution_plan_object(plan_obj: dict[str, Any]) -> dict[str, Any]:
    files = plan_obj.get('files')
    commands = plan_obj.get('commands')
    if not isinstance(files, list):
        raise ValueError('"files" must be an array')
    if not isinstance(commands, list):
        raise ValueError('"commands" must be an array')
    return {'files': files, 'commands': commands}


def _resolve_safe_target(path_value: str) -> Path:
    cleaned = str(path_value or '').strip()
    if not cleaned:
        raise ValueError('File path is required')
    if '..' in cleaned.split('/'):
        raise ValueError(f'Unsafe path traversal detected: {cleaned}')
    relative = Path(cleaned)
    if relative.is_absolute():
        raise ValueError(f'Absolute paths are not allowed: {cleaned}')

    target = (PROJECT_ROOT / relative).resolve()
    if not str(target).startswith(str(PROJECT_ROOT)):
        raise ValueError(f'Unsafe path outside /app: {cleaned}')
    return target


def _apply_files(files: list[Any]) -> list[str]:
    applied: list[str] = []
    for entry in files:
        if not isinstance(entry, dict):
            raise ValueError('Each file entry must be an object')

        path_value = str(entry.get('path') or '').strip()
        action = str(entry.get('action') or '').strip().lower()
        content = str(entry.get('content') or '')

        if action not in {'create', 'update'}:
            raise ValueError(f'Unsupported file action: {action}')

        target = _resolve_safe_target(path_value)
        os.makedirs(target.parent, exist_ok=True)
        with open(target, 'w', encoding='utf-8') as file_handle:
            file_handle.write(content)
        applied.append(str(target.relative_to(PROJECT_ROOT)))
    return applied


def _is_allowed_command(command: str) -> bool:
    stripped = command.strip()
    if stripped in {'npm install', 'npm run build', 'pip install'}:
        return True
    return stripped.startswith('pip install ')


def _run_commands(commands: list[Any]) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for raw_command in commands:
        command = str(raw_command or '').strip()
        if not command:
            continue
        if not _is_allowed_command(command):
            raise ValueError(f'Command not allowed: {command}')

        completed = subprocess.run(
            command,
            shell=True,
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        results.append(
            {
                'command': command,
                'stdout': completed.stdout,
                'stderr': completed.stderr,
                'returnCode': completed.returncode,
            }
        )
    return results


def _fallback_plan_from_prompt(codex_prompt: str) -> dict[str, Any]:
    prompt = codex_prompt.strip()
    create_patterns = [
        r'create\s+(?:a\s+)?(?:test\s+)?file\s+called\s+([A-Za-z0-9._/\-]+)\s+with\s+(.+)',
        r'create\s+file\s+([A-Za-z0-9._/\-]+)\s+containing\s+(.+)',
    ]

    for pattern in create_patterns:
        match = re.search(pattern, prompt, flags=re.IGNORECASE)
        if match:
            file_path = match.group(1).strip()
            content = match.group(2).strip().strip('"').strip("'")
            return {
                'files': [{'path': file_path, 'action': 'create', 'content': content}],
                'commands': [],
            }

    raise ValueError('Failed to derive execution plan from codexPrompt')


def _backup_commit() -> dict[str, Any]:
    add_cmd = ['git', '-c', 'safe.directory=/app', 'add', '.']
    commit_cmd = ['git', '-c', 'safe.directory=/app', 'commit', '-m', 'pre-ai-builder-backup']
    add_proc = subprocess.run(add_cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
    commit_proc = subprocess.run(commit_cmd, cwd=str(PROJECT_ROOT), capture_output=True, text=True)
    return {
        'addCode': add_proc.returncode,
        'addStdout': add_proc.stdout,
        'addStderr': add_proc.stderr,
        'commitCode': commit_proc.returncode,
        'commitStdout': commit_proc.stdout,
        'commitStderr': commit_proc.stderr,
    }


def execute_ai_builder_apply(build_payload: dict[str, Any], model: str) -> dict[str, Any]:
    codex_prompt = str(build_payload.get('codexPrompt') or '').strip()
    if not codex_prompt:
        raise ValueError('build.codexPrompt is required')
    execution_plan_override = build_payload.get('executionPlan')

    prompt = f"""Convert the following build plan into executable changes.

Return ONLY JSON in this format:

{{
"files": [
{{
"path": "relative/path/to/file",
"action": "create|update",
"content": "full file content"
}}
],
"commands": [
"npm install",
"npm run build"
]
}}

Plan:
{codex_prompt}
"""

    parsed_plan: dict[str, Any]
    try:
        gateway_response = send_ai_request(
            {
                'model': model,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': 0.1,
            },
            endpoint='/v1/chat/completions',
        )

        raw_content = _extract_gateway_content(gateway_response)
        print('AI EXEC RAW RESPONSE:', raw_content)
        parsed_plan = _parse_execution_plan(raw_content)
    except Exception:
        if isinstance(execution_plan_override, dict):
            parsed_plan = _parse_execution_plan_object(execution_plan_override)
        else:
            parsed_plan = _fallback_plan_from_prompt(codex_prompt)

    backup_result = _backup_commit()
    files_applied = _apply_files(parsed_plan['files'])
    command_results = _run_commands(parsed_plan['commands'])

    return {
        'success': True,
        'filesApplied': files_applied,
        'commandResults': command_results,
        'message': 'Changes applied successfully',
        'backup': backup_result,
    }
