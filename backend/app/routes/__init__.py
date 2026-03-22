from flask import Blueprint

from .health import health_bp
from .tasks import tasks_bp

api_bp = Blueprint('api', __name__)
api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(tasks_bp)
