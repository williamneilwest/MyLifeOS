from datetime import UTC, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import Project


projects_bp = Blueprint('projects', __name__)


def _projects_last_updated() -> str:
    last = db.session.query(db.func.max(Project.updated_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


@projects_bp.get('/projects/', strict_slashes=False)
def get_projects():
    current_app.logger.info('[DB] Fetching table: projects')
    projects = Project.query.order_by(Project.updated_at.desc()).all()
    current_app.logger.info('[DB] projects rows returned: %s', len(projects))
    return success_response({'data': [project.to_dict() for project in projects], 'lastUpdated': _projects_last_updated()})


@projects_bp.get('/projects/last-updated', strict_slashes=False)
def get_projects_last_updated():
    return success_response({'lastUpdated': _projects_last_updated()})


@projects_bp.get('/projects/<string:project_id>', strict_slashes=False)
def get_project_by_id(project_id: str):
    project = Project.query.get_or_404(project_id)
    return success_response(project.to_dict())


@projects_bp.post('/projects/', strict_slashes=False)
def create_project():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()

    if not name:
        return error_response('name is required', 400)

    project = Project(
        id=str(data.get('id') or '').strip() or None,
        name=name,
        description=str(data.get('description') or ''),
        status=str(data.get('status') or 'Backlog'),
        notes=str(data.get('notes') or ''),
        link=str(data.get('link')).strip() if data.get('link') else None,
        tags=list(data.get('tags') or []),
    )

    db.session.add(project)
    db.session.commit()
    return success_response(project.to_dict(), 201)


@projects_bp.patch('/projects/<string:project_id>', strict_slashes=False)
def update_project(project_id: str):
    data = request.get_json(silent=True) or {}
    project = Project.query.get_or_404(project_id)

    if 'name' in data:
        name = str(data.get('name') or '').strip()
        if not name:
            return error_response('name cannot be empty', 400)
        project.name = name

    if 'status' in data:
        project.status = str(data.get('status') or project.status)
    if 'description' in data:
        project.description = str(data.get('description') or '')
    if 'notes' in data:
        project.notes = str(data.get('notes') or '')
    if 'link' in data:
        project.link = str(data.get('link')).strip() if data.get('link') else None
    if 'tags' in data:
        project.tags = list(data.get('tags') or [])

    db.session.commit()
    return success_response(project.to_dict())


@projects_bp.delete('/projects/<string:project_id>', strict_slashes=False)
def delete_project(project_id: str):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return success_response({'deleted': True})
