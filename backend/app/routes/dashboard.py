from flask import Blueprint, current_app
from sqlalchemy import func

from ..api_response import success_response
from ..db import db
from ..models import FinanceEntry, PlanningItem, Project, Task


dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.get('/dashboard-summary', strict_slashes=False)
def get_dashboard_summary():
    current_app.logger.info('[DB] Fetching dashboard summary')

    tasks = Task.query.count()
    pending_tasks = Task.query.filter(Task.status != 'done').count()
    projects = Project.query.count()
    planning_count = PlanningItem.query.count()

    income = (
        db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
        .filter(FinanceEntry.entry_type == 'income')
        .scalar()
        or 0
    )
    expense = (
        db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
        .filter(FinanceEntry.entry_type == 'expense')
        .scalar()
        or 0
    )
    savings = (
        db.session.query(func.coalesce(func.sum(FinanceEntry.amount), 0))
        .filter(FinanceEntry.entry_type == 'savings')
        .scalar()
        or 0
    )

    total_balance = float(income) - float(expense) - float(savings)
    current_app.logger.info(
        '[DB] Dashboard summary rows: tasks=%s, projects=%s, finance_entries=%s, planning_items=%s',
        tasks,
        projects,
        FinanceEntry.query.count(),
        planning_count,
    )

    return success_response(
        {
            'total_tasks': tasks,
            'pending_tasks': pending_tasks,
            'total_projects': projects,
            'total_balance': total_balance,
            'planning_count': planning_count,
        }
    )
