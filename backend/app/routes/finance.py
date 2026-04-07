from datetime import UTC, date, datetime

from flask import Blueprint, current_app, request

from ..api_response import error_response, success_response
from ..auth import finance_owner_required, get_current_user
from ..db import db
from ..models import AllocationRule, Debt, FinanceEntry, IncomeSource, PlaidTransaction


finance_bp = Blueprint('finance', __name__)


def _parse_date(value: str | None) -> date:
    if value:
        try:
            return date.fromisoformat(value)
        except ValueError:
            return date.today()
    return date.today()


def _parse_float(value: object, field_name: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _finance_last_updated() -> str:
    last = db.session.query(db.func.max(FinanceEntry.created_at)).scalar()
    if isinstance(last, datetime):
        return last.replace(tzinfo=UTC).isoformat()
    return datetime.now(UTC).isoformat()


def _map_transaction_bucket(transaction: PlaidTransaction) -> str:
    category_values = transaction.category if isinstance(transaction.category, list) else []
    category_text = ' '.join(str(item).lower() for item in category_values)

    if any(keyword in category_text for keyword in ['loan', 'credit card', 'debt']):
        return 'debt'
    if any(keyword in category_text for keyword in ['rent', 'utilities', 'insurance', 'medical', 'health', 'transportation']):
        return 'needs'
    if any(keyword in category_text for keyword in ['transfer', 'savings', 'investment']):
        return 'savings'
    return 'wants'


@finance_bp.get('/finance/overview', strict_slashes=False)
@finance_owner_required
def finance_overview():
    user = get_current_user()
    user_id = user.id

    debts = Debt.query.filter_by(user_id=user_id).order_by(Debt.created_at.desc()).all()
    income_sources = IncomeSource.query.filter_by(user_id=user_id).order_by(IncomeSource.created_at.desc()).all()
    allocation_rules = AllocationRule.query.filter_by(user_id=user_id).order_by(AllocationRule.category.asc()).all()
    transactions = PlaidTransaction.query.filter_by(user_id=user_id).order_by(PlaidTransaction.date.desc(), PlaidTransaction.updated_at.desc()).all()

    total_debt = sum(item.balance for item in debts)
    total_income = sum(item.monthly_amount for item in income_sources)
    total_minimum_payments = sum(item.minimum_payment for item in debts)
    debt_to_income_ratio = round((total_minimum_payments / total_income) * 100, 2) if total_income > 0 else 0.0

    allocation_map = {rule.category: rule.percentage for rule in allocation_rules}
    planned = {
        'needs': round(total_income * (allocation_map.get('needs', 0.0) / 100), 2),
        'wants': round(total_income * (allocation_map.get('wants', 0.0) / 100), 2),
        'savings': round(total_income * (allocation_map.get('savings', 0.0) / 100), 2),
        'debt': round(total_income * (allocation_map.get('debt', 0.0) / 100), 2),
    }

    actual = {'needs': 0.0, 'wants': 0.0, 'savings': 0.0, 'debt': 0.0}
    for transaction in transactions:
        amount = float(transaction.amount or 0.0)
        if amount <= 0:
            continue
        bucket = _map_transaction_bucket(transaction)
        actual[bucket] += amount

    actual = {key: round(value, 2) for key, value in actual.items()}
    overspending = {key: round(max(actual[key] - planned.get(key, 0.0), 0.0), 2) for key in actual.keys()}
    remaining_income_after_allocation = round(total_income - sum(planned.values()), 2)

    status = 'good'
    if debt_to_income_ratio >= 40 or any(value > 300 for value in overspending.values()):
        status = 'critical'
    elif debt_to_income_ratio >= 25 or any(value > 0 for value in overspending.values()):
        status = 'warning'

    return success_response(
        {
            'last_synced_at': user.last_synced_at.replace(tzinfo=UTC).isoformat() if isinstance(user.last_synced_at, datetime) else None,
            'debts': [item.to_dict() for item in debts],
            'income_sources': [item.to_dict() for item in income_sources],
            'allocation_rules': [item.to_dict() for item in allocation_rules],
            'transactions': [item.to_dict() for item in transactions],
            'financial_health': {
                'total_debt': round(total_debt, 2),
                'total_income': round(total_income, 2),
                'debt_to_income_ratio': debt_to_income_ratio,
                'total_minimum_payments': round(total_minimum_payments, 2),
                'remaining_income_after_allocation': remaining_income_after_allocation,
                'status': status,
            },
            'spending_vs_plan': {
                'planned': planned,
                'actual': actual,
                'overspending': overspending,
            },
        }
    )


@finance_bp.get('/finance/transactions', strict_slashes=False)
@finance_owner_required
def finance_transactions():
    user = get_current_user()
    plaid_rows = (
        PlaidTransaction.query.filter_by(user_id=user.id)
        .order_by(PlaidTransaction.date.desc(), PlaidTransaction.updated_at.desc())
        .all()
    )
    manual_rows = FinanceEntry.query.order_by(FinanceEntry.date.desc(), FinanceEntry.created_at.desc()).all()

    plaid_transactions = []
    for row in plaid_rows:
        category_value = row.category[0] if isinstance(row.category, list) and row.category else 'Linked Account'
        tx_type = 'income' if float(row.amount or 0) < 0 else 'expense'
        plaid_transactions.append(
            {
                'id': f'plaid-{row.transaction_id}',
                'transaction_id': row.transaction_id,
                'name': row.merchant_name or row.name,
                'amount': abs(float(row.amount or 0)),
                'category': str(category_value or 'Linked Account'),
                'type': tx_type,
                'date': row.date.isoformat() if isinstance(row.date, date) else '',
                'account_id': row.account_id,
                'source': 'plaid',
            }
        )

    manual_transactions = [
        {
            'id': row.id,
            'transaction_id': row.id,
            'name': row.name,
            'amount': float(row.amount or 0),
            'category': row.category,
            'type': row.entry_type,
            'date': row.date.isoformat() if isinstance(row.date, date) else '',
            'account_id': None,
            'source': 'manual',
        }
        for row in manual_rows
    ]

    transactions = sorted(
        [*plaid_transactions, *manual_transactions],
        key=lambda item: (item.get('date') or '', item.get('id') or ''),
        reverse=True,
    )

    print('PLAID TX COUNT:', len(plaid_rows))
    print('Returning TX count:', len(transactions))
    current_app.logger.info(
        '[DB] transactions returned: plaid=%s manual=%s total=%s',
        len(plaid_transactions),
        len(manual_transactions),
        len(transactions),
    )
    return success_response({'data': transactions, 'count': len(transactions)})


@finance_bp.get('/finance/debts', strict_slashes=False)
@finance_owner_required
def list_debts():
    user = get_current_user()
    debts = Debt.query.filter_by(user_id=user.id).order_by(Debt.created_at.desc()).all()
    return success_response({'data': [item.to_dict() for item in debts]})


@finance_bp.post('/finance/debts', strict_slashes=False)
@finance_owner_required
def create_debt():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}

    name = str(payload.get('name') or '').strip()
    debt_type = str(payload.get('type') or '').strip()
    balance = _parse_float(payload.get('balance'), 'balance')
    interest_rate = _parse_float(payload.get('interest_rate'), 'interest_rate')
    minimum_payment = _parse_float(payload.get('minimum_payment'), 'minimum_payment')

    if not name or not debt_type:
        return error_response('name and type are required', 400)
    if balance is None or interest_rate is None or minimum_payment is None:
        return error_response('balance, interest_rate, and minimum_payment must be numeric', 400)

    debt = Debt(
        user_id=user.id,
        name=name,
        debt_type=debt_type,
        balance=balance,
        interest_rate=interest_rate,
        minimum_payment=minimum_payment,
    )
    db.session.add(debt)
    db.session.commit()
    return success_response(debt.to_dict(), 201)


@finance_bp.patch('/finance/debts/<string:debt_id>', strict_slashes=False)
@finance_owner_required
def update_debt(debt_id: str):
    user = get_current_user()
    debt = Debt.query.filter_by(id=debt_id, user_id=user.id).first()
    if debt is None:
        return error_response('Debt not found', 404)

    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        debt.name = str(payload.get('name') or '').strip() or debt.name
    if 'type' in payload:
        debt.debt_type = str(payload.get('type') or '').strip() or debt.debt_type
    if 'balance' in payload:
        parsed = _parse_float(payload.get('balance'), 'balance')
        if parsed is None:
            return error_response('balance must be numeric', 400)
        debt.balance = parsed
    if 'interest_rate' in payload:
        parsed = _parse_float(payload.get('interest_rate'), 'interest_rate')
        if parsed is None:
            return error_response('interest_rate must be numeric', 400)
        debt.interest_rate = parsed
    if 'minimum_payment' in payload:
        parsed = _parse_float(payload.get('minimum_payment'), 'minimum_payment')
        if parsed is None:
            return error_response('minimum_payment must be numeric', 400)
        debt.minimum_payment = parsed

    db.session.commit()
    return success_response(debt.to_dict())


@finance_bp.delete('/finance/debts/<string:debt_id>', strict_slashes=False)
@finance_owner_required
def delete_debt(debt_id: str):
    user = get_current_user()
    debt = Debt.query.filter_by(id=debt_id, user_id=user.id).first()
    if debt is None:
        return error_response('Debt not found', 404)

    db.session.delete(debt)
    db.session.commit()
    return success_response({'deleted': True})


@finance_bp.get('/finance/income', strict_slashes=False)
@finance_owner_required
def list_income_sources():
    user = get_current_user()
    income_sources = IncomeSource.query.filter_by(user_id=user.id).order_by(IncomeSource.created_at.desc()).all()
    return success_response({'data': [item.to_dict() for item in income_sources]})


@finance_bp.post('/finance/income', strict_slashes=False)
@finance_owner_required
def create_income_source():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}

    name = str(payload.get('name') or '').strip()
    monthly_amount = _parse_float(payload.get('monthly_amount'), 'monthly_amount')
    if not name:
        return error_response('name is required', 400)
    if monthly_amount is None:
        return error_response('monthly_amount must be numeric', 400)

    item = IncomeSource(user_id=user.id, name=name, monthly_amount=monthly_amount)
    db.session.add(item)
    db.session.commit()
    return success_response(item.to_dict(), 201)


@finance_bp.patch('/finance/income/<string:income_id>', strict_slashes=False)
@finance_owner_required
def update_income_source(income_id: str):
    user = get_current_user()
    item = IncomeSource.query.filter_by(id=income_id, user_id=user.id).first()
    if item is None:
        return error_response('Income source not found', 404)

    payload = request.get_json(silent=True) or {}
    if 'name' in payload:
        item.name = str(payload.get('name') or '').strip() or item.name
    if 'monthly_amount' in payload:
        parsed = _parse_float(payload.get('monthly_amount'), 'monthly_amount')
        if parsed is None:
            return error_response('monthly_amount must be numeric', 400)
        item.monthly_amount = parsed

    db.session.commit()
    return success_response(item.to_dict())


@finance_bp.delete('/finance/income/<string:income_id>', strict_slashes=False)
@finance_owner_required
def delete_income_source(income_id: str):
    user = get_current_user()
    item = IncomeSource.query.filter_by(id=income_id, user_id=user.id).first()
    if item is None:
        return error_response('Income source not found', 404)

    db.session.delete(item)
    db.session.commit()
    return success_response({'deleted': True})


@finance_bp.get('/finance/allocation', strict_slashes=False)
@finance_owner_required
def list_allocation_rules():
    user = get_current_user()
    rules = AllocationRule.query.filter_by(user_id=user.id).order_by(AllocationRule.category.asc()).all()
    return success_response({'data': [item.to_dict() for item in rules]})


@finance_bp.post('/finance/allocation', strict_slashes=False)
@finance_owner_required
def create_allocation_rule():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}

    category = str(payload.get('category') or '').strip().lower()
    percentage = _parse_float(payload.get('percentage'), 'percentage')
    if category not in {'needs', 'wants', 'savings', 'debt'}:
        return error_response('category must be needs, wants, savings, or debt', 400)
    if percentage is None:
        return error_response('percentage must be numeric', 400)

    existing = AllocationRule.query.filter_by(user_id=user.id, category=category).first()
    if existing:
        existing.percentage = percentage
        db.session.commit()
        return success_response(existing.to_dict())

    rule = AllocationRule(user_id=user.id, category=category, percentage=percentage)
    db.session.add(rule)
    db.session.commit()
    return success_response(rule.to_dict(), 201)


@finance_bp.patch('/finance/allocation/<string:rule_id>', strict_slashes=False)
@finance_owner_required
def update_allocation_rule(rule_id: str):
    user = get_current_user()
    rule = AllocationRule.query.filter_by(id=rule_id, user_id=user.id).first()
    if rule is None:
        return error_response('Allocation rule not found', 404)

    payload = request.get_json(silent=True) or {}
    if 'category' in payload:
        category = str(payload.get('category') or '').strip().lower()
        if category not in {'needs', 'wants', 'savings', 'debt'}:
            return error_response('category must be needs, wants, savings, or debt', 400)
        rule.category = category
    if 'percentage' in payload:
        parsed = _parse_float(payload.get('percentage'), 'percentage')
        if parsed is None:
            return error_response('percentage must be numeric', 400)
        rule.percentage = parsed

    db.session.commit()
    return success_response(rule.to_dict())


@finance_bp.delete('/finance/allocation/<string:rule_id>', strict_slashes=False)
@finance_owner_required
def delete_allocation_rule(rule_id: str):
    user = get_current_user()
    rule = AllocationRule.query.filter_by(id=rule_id, user_id=user.id).first()
    if rule is None:
        return error_response('Allocation rule not found', 404)

    db.session.delete(rule)
    db.session.commit()
    return success_response({'deleted': True})


@finance_bp.get('/finance/', strict_slashes=False)
@finance_owner_required
def get_finance():
    current_app.logger.info('[DB] Fetching table: finance_entries')
    entries = FinanceEntry.query.order_by(FinanceEntry.date.desc(), FinanceEntry.created_at.desc()).all()
    current_app.logger.info('[DB] finance_entries rows returned: %s', len(entries))
    return success_response({'data': [entry.to_dict() for entry in entries], 'lastUpdated': _finance_last_updated()})


@finance_bp.get('/finance/last-updated', strict_slashes=False)
@finance_owner_required
def get_finance_last_updated():
    return success_response({'lastUpdated': _finance_last_updated()})


@finance_bp.get('/finance/<string:entry_id>', strict_slashes=False)
@finance_owner_required
def get_finance_by_id(entry_id: str):
    entry = FinanceEntry.query.get_or_404(entry_id)
    return success_response(entry.to_dict())


@finance_bp.post('/finance/', strict_slashes=False)
@finance_owner_required
def create_finance_entry():
    data = request.get_json(silent=True) or {}

    entry_type = str(data.get('type', '')).strip()
    if entry_type not in {'income', 'expense', 'savings'}:
        return error_response('type must be income, expense, or savings', 400)

    amount = _parse_float(data.get('amount', 0), 'amount')
    if amount is None:
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
@finance_owner_required
def update_finance_entry(entry_id: str):
    data = request.get_json(silent=True) or {}
    entry = FinanceEntry.query.get_or_404(entry_id)

    if 'type' in data:
        entry_type = str(data.get('type') or '').strip()
        if entry_type not in {'income', 'expense', 'savings'}:
            return error_response('type must be income, expense, or savings', 400)
        entry.entry_type = entry_type

    if 'amount' in data:
        parsed = _parse_float(data.get('amount'), 'amount')
        if parsed is None:
            return error_response('amount must be numeric', 400)
        entry.amount = parsed

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
@finance_owner_required
def delete_finance_entry(entry_id: str):
    entry = FinanceEntry.query.get_or_404(entry_id)
    db.session.delete(entry)
    db.session.commit()
    return success_response({'deleted': True})
