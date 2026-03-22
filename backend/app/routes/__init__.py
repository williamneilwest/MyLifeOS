from flask import Blueprint

from .finance import finance_bp
from .health import health_bp
from .planning import planning_bp
from .projects import projects_bp
from .tasks import tasks_bp

api_bp = Blueprint('api', __name__)
api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(projects_bp)
api_bp.register_blueprint(tasks_bp)
api_bp.register_blueprint(finance_bp)
api_bp.register_blueprint(planning_bp)
