from datetime import UTC, datetime

from flask import Blueprint, current_app, jsonify, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import AIBuild
from ..services.ai_builder_executor import (
    apply_build_with_git_checkpoint,
    get_git_status_snapshot,
    revert_build_from_commit_chain,
)
from ..services.ai_builder_generation import generate_ai_builder_payload


ai_builder_bp = Blueprint('ai_builder', __name__)


@ai_builder_bp.post('/ai-builder/generate', strict_slashes=False)
def generate_build():
    payload = request.get_json(silent=True) or {}
    idea = str(payload.get('idea') or '').strip()
    if not idea:
        return error_response('idea is required', 400)

    model = current_app.config.get('AI_GATEWAY_MODEL', 'gpt-4.1-mini')

    try:
        generated, raw_response = generate_ai_builder_payload(idea=idea, model=model)
        build = AIBuild(
            idea=idea,
            feature_name=generated['feature_name'],
            summary=generated['summary'],
            codex_prompt=generated['codex_prompt'],
            risk_level=generated['risk_level'],
            rollback_plan=generated['rollback_plan'],
            status='Generated',
            generation_model=model,
            generation_raw_response=raw_response,
            error_message=None,
        )
        build.set_files_affected(generated['files_affected'])
        db.session.add(build)
        db.session.commit()
        return success_response({'build': build.to_dict()}, 201)
    except Exception as error:  # noqa: BLE001 - route returns clear error payload
        current_app.logger.exception('[AI_BUILDER] Generation failed: %s', error)
        error_message = 'AI service unavailable' if 'AI service unavailable' in str(error) else str(error)
        failed = AIBuild(
            idea=idea,
            feature_name='',
            summary='',
            codex_prompt='',
            risk_level='Medium',
            rollback_plan='',
            status='Failed',
            generation_model=model,
            generation_raw_response='',
            error_message=error_message,
        )
        failed.set_files_affected([])
        db.session.add(failed)
        db.session.commit()
        if error_message == 'AI service unavailable':
            return error_response(error_message, 503)
        return error_response(error_message, 500)


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
