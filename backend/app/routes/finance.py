from datetime import UTC, date, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..db import db
from ..models import FinanceEntry


finance_bp = Blueprint('finance', __name__)


def _parse_date(value: str | None) -> date:
    if value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return date.today()
    return date.today()


def _finance_last_updated() -> str:
    last = db.session.query(db.func.max(FinanceEntry.created_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


@finance_bp.get('/finance/', strict_slashes=False)
def get_finance():
    current_app.logger.info('[DB] Fetching table: finance_entries')
    entries = FinanceEntry.query.order_by(FinanceEntry.date.desc(), FinanceEntry.created_at.desc()).all()
    current_app.logger.info('[DB] finance_entries rows returned: %s', len(entries))
    return success_response({'data': [entry.to_dict() for entry in entries], 'lastUpdated': _finance_last_updated()})


@finance_bp.get('/finance/last-updated', strict_slashes=False)
def get_finance_last_updated():
    return success_response({'lastUpdated': _finance_last_updated()})


@finance_bp.get('/finance/<string:entry_id>', strict_slashes=False)
def get_finance_by_id(entry_id: str):
    entry = FinanceEntry.query.get_or_404(entry_id)
    return success_response(entry.to_dict())


@finance_bp.post('/finance/', strict_slashes=False)
def create_finance_entry():
    data = request.get_json(silent=True) or {}

    entry_type = str(data.get('type', '')).strip()
    if entry_type not in {'income', 'expense', 'savings'}:
        return error_response('type must be income, expense, or savings', 400)

    try:
        amount = float(data.get('amount', 0))
    except (TypeError, ValueError):
        return error_response('amount must be numeric', 400)

    category = str(data.get('category', '')).strip()
    if not category:
        return error_response('category is required', 400)

    entry = FinanceEntry(
        id=str(data.get('id') or '').strip() or None,
        entry_type=entry_type,
        amount=amount,
        category=category,
        date=_parse_date(data.get('date')),
        name=str(data.get('name') or 'Entry').strip() or 'Entry',
    )

    db.session.add(entry)
    db.session.commit()

    return success_response(entry.to_dict(), 201)


@finance_bp.patch('/finance/<string:entry_id>', strict_slashes=False)
def update_finance_entry(entry_id: str):
    data = request.get_json(silent=True) or {}
    entry = FinanceEntry.query.get_or_404(entry_id)

    if 'type' in data:
        entry_type = str(data.get('type') or '').strip()
        if entry_type not in {'income', 'expense', 'savings'}:
            return error_response('type must be income, expense, or savings', 400)
        entry.entry_type = entry_type

    if 'amount' in data:
        try:
            entry.amount = float(data.get('amount'))
        except (TypeError, ValueError):
            return error_response('amount must be numeric', 400)

    if 'category' in data:
        category = str(data.get('category') or '').strip()
        if not category:
            return error_response('category cannot be empty', 400)
        entry.category = category

    if 'date' in data:
        entry.date = _parse_date(data.get('date'))

    if 'name' in data:
        entry.name = str(data.get('name') or 'Entry').strip() or 'Entry'

    db.session.commit()
    return success_response(entry.to_dict())


@finance_bp.delete('/finance/<string:entry_id>', strict_slashes=False)
def delete_finance_entry(entry_id: str):
    entry = FinanceEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return success_response({'deleted': True})
