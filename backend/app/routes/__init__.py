from flask import Blueprint

from .db_viewer import db_viewer_bp
from .dashboard import dashboard_bp
from .finance import finance_bp
from .health import health_bp
from .home_planning import home_planning_bp
from .homelab import homelab_bp
from .planning import planning_bp
from .projects import projects_bp
from .tasks import tasks_bp
from .tools import tools_bp

api_bp = Blueprint('api', __name__)
api_bp.register_blueprint(health_bp)
api_bp.register_blueprint(db_viewer_bp)
api_bp.register_blueprint(dashboard_bp)
api_bp.register_blueprint(projects_bp)
api_bp.register_blueprint(tasks_bp)
api_bp.register_blueprint(finance_bp)
api_bp.register_blueprint(planning_bp)
api_bp.register_blueprint(homelab_bp)
api_bp.register_blueprint(home_planning_bp)
api_bp.register_blueprint(tools_bp)
