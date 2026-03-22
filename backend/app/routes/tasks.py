from datetime import datetime, UTC

from flask import Blueprint, jsonify, request

from ..db import db
from ..models import Task


tasks_bp = Blueprint('tasks', __name__)


@tasks_bp.get('/tasks')
def get_tasks():
    tasks = Task.query.order_by(Task.created_at.desc()).all()
    return jsonify({
        'data': [task.to_dict() for task in tasks],
        'lastUpdated': datetime.now(UTC).isoformat(),
    })


@tasks_bp.get('/tasks/last-updated')
def get_tasks_last_updated():
    return jsonify({'lastUpdated': datetime.now(UTC).isoformat()})


@tasks_bp.post('/tasks')
def create_task():
    data = request.get_json(silent=True) or {}
    title = str(data.get('title', '')).strip()

    if not title:
        return jsonify({'error': 'title is required'}), 400

    task = Task(title=title)
    db.session.add(task)
    db.session.commit()

    return jsonify(task.to_dict()), 201


@tasks_bp.patch('/tasks/<int:task_id>')
def update_task(task_id: int):
    data = request.get_json(silent=True) or {}
    task = Task.query.get_or_404(task_id)

    if 'title' in data:
        title = str(data['title']).strip()
        if not title:
            return jsonify({'error': 'title cannot be empty'}), 400
        task.title = title

    if 'completed' in data:
        task.completed = bool(data['completed'])

    db.session.commit()
    return jsonify(task.to_dict())


@tasks_bp.delete('/tasks/<int:task_id>')
def delete_task(task_id: int):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return '', 204
