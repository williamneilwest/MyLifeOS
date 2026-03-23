from dataclasses import dataclass
from datetime import datetime, UTC
from pathlib import Path
import json
import subprocess

from ..models import AIBuild


@dataclass
class ExecutionResult:
    pre_commit: str
    post_commit: str
    changed_files: list[str]
    log: str


def _resolve_repo_root() -> Path:
    cursor = Path(__file__).resolve()
    for candidate in [cursor, *cursor.parents]:
        if (candidate / '.git').exists():
            return candidate
    # Fallback to backend app root when git metadata is unavailable in runtime image.
    return Path(__file__).resolve().parents[2]


def _run_command(command: list[str], cwd: Path) -> tuple[int, str]:
    completed = subprocess.run(command, cwd=str(cwd), capture_output=True, text=True)
    output = (completed.stdout or '') + (completed.stderr or '')
    return completed.returncode, output


def _git(command: list[str], repo_root: Path) -> tuple[int, str]:
    return _run_command(['git', '-c', f'safe.directory={repo_root}', *command], repo_root)


def _git_or_raise(command: list[str], repo_root: Path) -> str:
    code, output = _git(command, repo_root)
    if code != 0:
        raise RuntimeError(f'git {" ".join(command)} failed:\n{output}')
    return output.strip()


def _ensure_git_identity(repo_root: Path) -> None:
    code_name, name_output = _git(['config', '--get', 'user.name'], repo_root)
    code_email, email_output = _git(['config', '--get', 'user.email'], repo_root)

    if code_name != 0 or not name_output.strip():
        _git_or_raise(['config', 'user.name', 'AI Builder'], repo_root)
    if code_email != 0 or not email_output.strip():
        _git_or_raise(['config', 'user.email', 'ai-builder@local'], repo_root)


def _write_execution_artifacts(build: AIBuild, repo_root: Path) -> list[str]:
    artifacts_dir = repo_root / 'ai_builder_artifacts'
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    markdown_path = artifacts_dir / f'{build.id}.md'
    metadata_path = artifacts_dir / f'{build.id}.json'

    markdown_content = f"""# AI Builder Build {build.id}

Generated at: {datetime.now(UTC).isoformat()}
Status: {build.status}

## Idea
{build.idea}

## Feature Name
{build.feature_name}

## Summary
{build.summary}

## Codex Prompt
{build.codex_prompt}

## Rollback Plan
{build.rollback_plan}
"""
    markdown_path.write_text(markdown_content, encoding='utf-8')

    metadata_content = {
        'id': build.id,
        'feature_name': build.feature_name,
        'risk_level': build.risk_level,
        'files_affected': build.get_files_affected(),
        'generated_at': datetime.now(UTC).isoformat(),
    }
    metadata_path.write_text(json.dumps(metadata_content, indent=2), encoding='utf-8')

    return [str(markdown_path.relative_to(repo_root)), str(metadata_path.relative_to(repo_root))]


def apply_build_with_git_checkpoint(build: AIBuild) -> ExecutionResult:
    repo_root = _resolve_repo_root()
    logs: list[str] = []

    pre_commit = _git_or_raise(['rev-parse', 'HEAD'], repo_root)
    logs.append(f'Pre-change commit: {pre_commit}')
    logs.append(f'Applying build "{build.feature_name}" using stored codex_prompt:\n{build.codex_prompt}')

    changed_files = _write_execution_artifacts(build, repo_root)
    logs.append(f'Execution adapter wrote files: {", ".join(changed_files)}')

    _ensure_git_identity(repo_root)
    _git_or_raise(['add', '.'], repo_root)
    commit_message = f'AI Build: {build.feature_name}'
    _git_or_raise(['commit', '-m', commit_message], repo_root)
    post_commit = _git_or_raise(['rev-parse', 'HEAD'], repo_root)
    logs.append(f'Post-change commit: {post_commit}')

    return ExecutionResult(
        pre_commit=pre_commit,
        post_commit=post_commit,
        changed_files=changed_files,
        log='\n\n'.join(logs),
    )


def revert_build_from_commit_chain(build: AIBuild) -> tuple[str, str]:
    if not build.pre_change_commit_hash or not build.post_change_commit_hash:
        raise RuntimeError('Missing commit chain for revert')

    repo_root = _resolve_repo_root()
    logs: list[str] = []

    diff_output = _git_or_raise(
        ['diff-tree', '--no-commit-id', '--name-only', '-r', build.post_change_commit_hash],
        repo_root,
    )
    changed_files = [line.strip() for line in diff_output.splitlines() if line.strip()]
    if not changed_files:
        raise RuntimeError('No changed files found for post-change commit')

    for relative_path in changed_files:
        target_path = repo_root / relative_path
        show_code, show_output = _git(
            ['show', f'{build.pre_change_commit_hash}:{relative_path}'],
            repo_root,
        )

        if show_code == 0:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_text(show_output, encoding='utf-8')
            logs.append(f'Restored file from pre-change commit: {relative_path}')
        else:
            if target_path.exists():
                target_path.unlink()
                logs.append(f'Removed file absent in pre-change commit: {relative_path}')

    _git_or_raise(['add', *changed_files], repo_root)
    commit_message = f'AI Builder: revert feature {build.feature_name}'
    _git_or_raise(['commit', '-m', commit_message], repo_root)
    reverted_commit = _git_or_raise(['rev-parse', 'HEAD'], repo_root)
    logs.append(f'Revert commit: {reverted_commit}')

    return reverted_commit, '\n'.join(logs)


def get_git_status_snapshot() -> dict[str, str]:
    repo_root = _resolve_repo_root()
    branch_code, branch_output = _git(['rev-parse', '--abbrev-ref', 'HEAD'], repo_root)
    commit_code, commit_output = _git(['rev-parse', 'HEAD'], repo_root)
    dirty_code, dirty_output = _git(['status', '--porcelain'], repo_root)

    return {
        'branch': branch_output.strip() if branch_code == 0 else 'unknown',
        'commit': commit_output.strip() if commit_code == 0 else 'unknown',
        'dirty': 'yes' if dirty_code == 0 and bool(dirty_output.strip()) else 'no',
    }
