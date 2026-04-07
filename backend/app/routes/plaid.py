from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any

from flask import Blueprint, request
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql import func
from plaid.model.country_code import CountryCode
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.item_remove_request import ItemRemoveRequest
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.transactions_sync_request import TransactionsSyncRequest

from ..api_response import error_response, success_response
from ..auth import finance_owner_required, get_current_user
from ..db import db
from ..models import PlaidAccount, PlaidCallLog, PlaidItem, PlaidTransaction
from ..services.plaid_content import plaid_client


plaid_bp = Blueprint('plaid', __name__)

SYNC_RATE_LIMIT_MINUTES = 10
SYNC_CACHE_HOURS = 12
MAX_SYNC_PAGES = 100


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _to_utc_timestamp(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _iso(value: datetime | None) -> str | None:
    timestamp = _to_utc_timestamp(value)
    return timestamp.isoformat() if timestamp else None


def _to_dict(response: Any) -> dict[str, Any]:
    if hasattr(response, 'to_dict'):
        return response.to_dict()
    if isinstance(response, dict):
        return response
    return {}


def _json_safe(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value


def _parse_optional_float(value: object) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_date(value: object) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _serialize_cached_accounts(user_id: str) -> list[dict[str, object]]:
    rows = PlaidAccount.query.filter_by(user_id=user_id).order_by(PlaidAccount.updated_at.desc()).all()
    return [row.to_dict() for row in rows]


def _serialize_cached_transactions(user_id: str, account_id: str | None = None, limit: int = 500) -> list[dict[str, object]]:
    query = PlaidTransaction.query.filter_by(user_id=user_id)
    if account_id:
        query = query.filter(PlaidTransaction.account_id == account_id)
    rows = query.order_by(PlaidTransaction.date.desc(), PlaidTransaction.updated_at.desc()).limit(limit).all()
    return [row.to_dict() for row in rows]


def _last_synced_at(user_id: str) -> datetime | None:
    timestamp = db.session.query(db.func.max(PlaidItem.last_synced_at)).filter(PlaidItem.user_id == user_id).scalar()
    if isinstance(timestamp, datetime):
        return _to_utc_timestamp(timestamp)
    return None


def _log_plaid_call(user_id: str, call_type: str) -> None:
    db.session.add(PlaidCallLog(user_id=user_id, call_type=call_type))
    db.session.commit()


def _within_rate_limit_window(user_id: str, now: datetime) -> tuple[bool, int]:
    window_start = now - timedelta(minutes=SYNC_RATE_LIMIT_MINUTES)
    attempts = (
        PlaidCallLog.query.filter(
            PlaidCallLog.user_id == user_id,
            PlaidCallLog.timestamp >= window_start,
            PlaidCallLog.call_type.in_(['initial', 'refresh', 'forced_refresh']),
        )
        .count()
    )
    return attempts >= 1, attempts


def _upsert_plaid_item(user_id: str, item_id: str, access_token: str, institution_name: str | None = None) -> PlaidItem:
    row = PlaidItem.query.filter_by(user_id=user_id, item_id=item_id).first()
    if row is None:
        row = PlaidItem(
            user_id=user_id,
            item_id=item_id,
            access_token=access_token,
            institution_name=institution_name or 'Linked Institution',
        )
        db.session.add(row)
    else:
        row.access_token = access_token
        if institution_name:
            row.institution_name = institution_name

    db.session.commit()
    return row


def _upsert_accounts(user_id: str, item_id: str, accounts: list[dict[str, Any]]) -> None:
    rows_to_upsert: list[dict[str, Any]] = []
    for item in accounts:
        account_id = str(item.get('account_id') or '').strip()
        if not account_id:
            continue

        balances = item.get('balances') if isinstance(item.get('balances'), dict) else {}
        rows_to_upsert.append(
            {
                'user_id': user_id,
                'item_id': item_id,
                'account_id': account_id,
                'name': str(item.get('name') or '').strip() or 'Plaid Account',
                'mask': str(item.get('mask') or '').strip() or None,
                'type': str(item.get('type') or '').strip() or None,
                'subtype': str(item.get('subtype') or '').strip() or None,
                'current_balance': _parse_optional_float(balances.get('current')) or 0.0,
                'available_balance': _parse_optional_float(balances.get('available')),
                'is_selected': True,
                'updated_at': _utc_now(),
            }
        )

    if not rows_to_upsert:
        return

    table = PlaidAccount.__table__
    stmt = insert(table).values(rows_to_upsert)
    update_map = {
        'item_id': stmt.excluded.item_id,
        'name': stmt.excluded.name,
        'mask': stmt.excluded.mask,
        'type': stmt.excluded.type,
        'subtype': stmt.excluded.subtype,
        'current_balance': stmt.excluded.current_balance,
        'available_balance': stmt.excluded.available_balance,
        # Preserve explicit user selection state during account refresh.
        'is_selected': table.c.is_selected,
        'updated_at': func.now(),
    }
    stmt = stmt.on_conflict_do_update(
        index_elements=[table.c.user_id, table.c.account_id],
        set_=update_map,
    )
    db.session.execute(stmt)
    db.session.commit()


def _upsert_transactions(user_id: str, transactions: list[dict[str, Any]]) -> tuple[int, int]:
    rows_to_upsert: list[dict[str, Any]] = []
    valid_transaction_ids: list[str] = []

    for item in transactions:
        transaction_id = str(item.get('transaction_id') or '').strip()
        account_id = str(item.get('account_id') or '').strip()
        if not transaction_id or not account_id:
            continue

        valid_transaction_ids.append(transaction_id)
        category = item.get('category')
        rows_to_upsert.append(
            {
                'user_id': user_id,
                'account_id': account_id,
                'transaction_id': transaction_id,
                'name': str(item.get('name') or '').strip() or 'Plaid Transaction',
                'amount': _parse_optional_float(item.get('amount')) or 0.0,
                'category': category if isinstance(category, list) else [],
                'date': _parse_date(item.get('date')),
                'pending': bool(item.get('pending') or False),
                'merchant_name': str(item.get('merchant_name') or '').strip() or None,
                'raw_json': _json_safe(item),
                'updated_at': _utc_now(),
            }
        )

    if not rows_to_upsert:
        return 0, 0

    existing_rows = (
        PlaidTransaction.query.filter(
            PlaidTransaction.user_id == user_id,
            PlaidTransaction.transaction_id.in_(valid_transaction_ids),
        )
        .all()
    )
    existing_ids = {row.transaction_id for row in existing_rows}
    created = sum(1 for row in rows_to_upsert if row['transaction_id'] not in existing_ids)
    updated = len(rows_to_upsert) - created

    table = PlaidTransaction.__table__
    stmt = insert(table).values(rows_to_upsert)
    update_map = {
        'account_id': stmt.excluded.account_id,
        'name': stmt.excluded.name,
        'amount': stmt.excluded.amount,
        'category': stmt.excluded.category,
        'date': stmt.excluded.date,
        'pending': stmt.excluded.pending,
        'merchant_name': stmt.excluded.merchant_name,
        'raw_json': stmt.excluded.raw_json,
        'updated_at': func.now(),
    }
    stmt = stmt.on_conflict_do_update(
        index_elements=[table.c.user_id, table.c.transaction_id],
        set_=update_map,
    )
    db.session.execute(stmt)
    db.session.commit()
    return created, updated


def _sync_item_data(user_id: str, item: PlaidItem) -> dict[str, int | str | None]:
    accounts_response = plaid_client.accounts_get(AccountsGetRequest(access_token=item.access_token))
    accounts_payload = _to_dict(accounts_response)
    accounts = accounts_payload.get('accounts') or []
    if not isinstance(accounts, list):
        accounts = []
    _upsert_accounts(user_id, item.item_id, accounts)

    cursor = item.cursor
    total_added_or_modified: list[dict[str, Any]] = []
    sync_warning: str | None = None

    def run_sync_loop(initial_cursor: str | None) -> tuple[str | None, list[dict[str, Any]]]:
        loop_cursor = initial_cursor
        has_more = True
        page_count = 0
        collected: list[dict[str, Any]] = []

        while has_more and page_count < MAX_SYNC_PAGES:
            request_payload: dict[str, Any] = {'access_token': item.access_token}
            if isinstance(loop_cursor, str) and loop_cursor.strip():
                request_payload['cursor'] = loop_cursor

            sync_response = plaid_client.transactions_sync(
                TransactionsSyncRequest(**request_payload)
            )
            sync_payload = _to_dict(sync_response)
            print('PLAID RAW:', sync_payload)

            added = sync_payload.get('added') or []
            modified = sync_payload.get('modified') or []
            if not isinstance(added, list):
                added = []
            if not isinstance(modified, list):
                modified = []

            collected.extend(added)
            collected.extend(modified)

            loop_cursor = str(sync_payload.get('next_cursor') or loop_cursor or '').strip() or None
            has_more = bool(sync_payload.get('has_more'))
            page_count += 1

        return loop_cursor, collected

    try:
        cursor, batch = run_sync_loop(cursor)
        total_added_or_modified.extend(batch)

        # Plaid can return an empty first sync; retry once to bootstrap data.
        if len(total_added_or_modified) == 0:
            retry_cursor, retry_batch = run_sync_loop(cursor)
            cursor = retry_cursor
            total_added_or_modified.extend(retry_batch)
    except Exception as sync_error:
        sync_warning = f'transactions/sync failed: {sync_error}'
        raise

    created_count, updated_count = _upsert_transactions(user_id, total_added_or_modified)
    print(f'Saved {len(total_added_or_modified)} transactions')
    transaction_count = (
        db.session.query(func.count(PlaidTransaction.id))
        .filter(PlaidTransaction.user_id == user_id)
        .scalar()
    ) or 0
    print('DB COUNT:', int(transaction_count))

    item.cursor = cursor
    item.last_synced_at = _utc_now()
    db.session.commit()

    return {
        'accounts_count': len(accounts),
        'transactions_created': created_count,
        'transactions_updated': updated_count,
        'cursor': cursor,
        'warning': sync_warning,
    }


@plaid_bp.post('/plaid/create-link-token')
@finance_owner_required
def create_link_token():
    try:
        user = get_current_user()
        request_data = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=user.id),
            client_name='LifeOS',
            products=[Products('transactions')],
            country_codes=[CountryCode('US')],
            language='en',
        )
        response = plaid_client.link_token_create(request_data)
        return success_response(_to_dict(response))
    except Exception as error:
        return error_response(f'Failed to create Plaid link token: {error}', 500)


@plaid_bp.post('/plaid/exchange-token')
@finance_owner_required
def exchange_token():
    try:
        payload = request.get_json(silent=True) or {}
        public_token = str(payload.get('public_token') or '').strip()
        if not public_token:
            return error_response('public_token is required', 400)

        exchange_response = plaid_client.item_public_token_exchange(
            ItemPublicTokenExchangeRequest(public_token=public_token)
        )
        exchange_data = _to_dict(exchange_response)

        access_token = str(exchange_data.get('access_token') or '').strip()
        item_id = str(exchange_data.get('item_id') or '').strip()
        if not access_token or not item_id:
            return error_response('Plaid token exchange returned an invalid response', 502)

        user = get_current_user()
        plaid_item = _upsert_plaid_item(user.id, item_id, access_token)

        # Backward-compatible fields retained on users table.
        user.plaid_access_token = access_token
        db.session.commit()

        # Initial sync on link: accounts + balances + transactions/sync cursor bootstrap.
        sync_result = _sync_item_data(user.id, plaid_item)
        user.last_synced_at = _utc_now()
        db.session.commit()
        _log_plaid_call(user.id, 'initial')

        return success_response(
            {
                'status': 'success',
                'item_id': item_id,
                'accounts_synced': sync_result['accounts_count'],
                'transactions_created': sync_result['transactions_created'],
                'transactions_updated': sync_result['transactions_updated'],
                'last_synced_at': _iso(_last_synced_at(user.id)),
                'warning': sync_result.get('warning'),
            }
        )
    except Exception as error:
        return error_response(f'Failed to exchange public token: {error}', 500)


@plaid_bp.get('/plaid/sync-status')
@finance_owner_required
def get_sync_status():
    user = get_current_user()
    last_synced_at = _last_synced_at(user.id)
    should_sync = last_synced_at is None or (_utc_now() - last_synced_at) >= timedelta(hours=SYNC_CACHE_HOURS)
    return success_response(
        {
            'last_synced_at': _iso(last_synced_at),
            'transactions': _serialize_cached_transactions(user.id),
            'should_sync': should_sync,
        }
    )


@plaid_bp.post('/plaid/sync')
@finance_owner_required
def sync_transactions():
    user = get_current_user()
    now = _utc_now()
    force_requested = str(request.args.get('force') or '').strip().lower() in {'1', 'true', 'yes', 'on'}

    is_rate_limited, attempts_in_window = _within_rate_limit_window(user.id, now)
    if is_rate_limited and not force_requested:
        return success_response(
            {
                'transactions': _serialize_cached_transactions(user.id),
                'cached': True,
                'last_synced_at': _iso(_last_synced_at(user.id)),
                'warning': {
                    'message': 'Too many sync attempts',
                    'attempts_in_window': attempts_in_window,
                    'can_force': True,
                },
            }
        )

    items = PlaidItem.query.filter_by(user_id=user.id).all()
    if not items:
        return error_response('No linked Plaid account', 400)

    try:
        total_accounts = 0
        total_created = 0
        total_updated = 0

        warnings: list[str] = []
        successful_items = 0
        for item in items:
            try:
                result = _sync_item_data(user.id, item)
                total_accounts += int(result['accounts_count'] or 0)
                total_created += int(result['transactions_created'] or 0)
                total_updated += int(result['transactions_updated'] or 0)
                successful_items += 1
                if result.get('warning'):
                    warnings.append(f"{item.item_id}: {result['warning']}")
            except Exception as item_error:
                db.session.rollback()
                warnings.append(f'{item.item_id}: {item_error}')
                continue

        if successful_items == 0:
            return error_response(
                f'Failed to sync transactions: {warnings[0] if warnings else "no syncs succeeded"}',
                500,
            )

        try:
            user.last_synced_at = _utc_now()
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        call_type = 'forced_refresh' if force_requested else 'refresh'
        _log_plaid_call(user.id, call_type)

        return success_response(
            {
                'transactions': _serialize_cached_transactions(user.id),
                'cached': False,
                'last_synced_at': _iso(_last_synced_at(user.id)),
                'warning': None,
                'meta': {
                    'accounts_synced': total_accounts,
                    'transactions_created': total_created,
                    'transactions_updated': total_updated,
                },
                'sync_warnings': warnings,
            }
        )
    except Exception as error:
        db.session.rollback()
        return error_response(f'Failed to sync transactions: {error}', 500)


@plaid_bp.get('/plaid/accounts')
@finance_owner_required
def get_accounts():
    user = get_current_user()
    return success_response(
        {
            'accounts': _serialize_cached_accounts(user.id),
            'last_synced_at': _iso(_last_synced_at(user.id)),
            'cached': True,
        }
    )


@plaid_bp.get('/plaid/transactions')
@finance_owner_required
def get_transactions():
    user = get_current_user()
    account_id = str(request.args.get('account_id') or '').strip() or None
    limit = request.args.get('limit', default=500, type=int) or 500
    limit = max(1, min(limit, 5000))
    return success_response(
        {
            'transactions': _serialize_cached_transactions(user.id, account_id=account_id, limit=limit),
            'last_synced_at': _iso(_last_synced_at(user.id)),
            'cached': True,
        }
    )


@plaid_bp.patch('/plaid/accounts/selection')
@finance_owner_required
def update_account_selection():
    user = get_current_user()
    payload = request.get_json(silent=True) or {}
    selected_account_ids = payload.get('selected_account_ids')
    if not isinstance(selected_account_ids, list):
        return error_response('selected_account_ids must be an array', 400)

    selected_set = {str(item).strip() for item in selected_account_ids if str(item).strip()}
    rows = PlaidAccount.query.filter_by(user_id=user.id).all()

    # Optional selection flag support even when legacy rows predate this behavior.
    if not hasattr(PlaidAccount, 'is_selected'):
        return success_response({'accounts': _serialize_cached_accounts(user.id)})

    for row in rows:
        setattr(row, 'is_selected', row.account_id in selected_set)

    db.session.commit()
    return success_response({'accounts': _serialize_cached_accounts(user.id)})


@plaid_bp.post('/plaid/disconnect-all')
@finance_owner_required
def disconnect_all_plaid_items():
    user = get_current_user()
    items = PlaidItem.query.filter_by(user_id=user.id).all()
    if not items:
        return success_response({'disconnected': 0, 'accounts_removed': 0, 'transactions_removed': 0, 'warnings': []})

    warnings: list[str] = []
    item_ids = [item.item_id for item in items]

    # Remove upstream Plaid items first (best effort).
    for item in items:
        try:
            plaid_client.item_remove(ItemRemoveRequest(access_token=item.access_token))
        except Exception as error:
            warnings.append(f'{item.item_id}: {error}')

    # Remove cached account data for disconnected items.
    # Keep transaction cache so historical finance views remain available after disconnect.
    account_ids = [
        row.account_id
        for row in PlaidAccount.query.filter(
            PlaidAccount.user_id == user.id,
            PlaidAccount.item_id.in_(item_ids),
        ).all()
    ]

    accounts_removed = PlaidAccount.query.filter(
        PlaidAccount.user_id == user.id,
        PlaidAccount.item_id.in_(item_ids),
    ).delete(synchronize_session=False)

    transactions_removed = 0

    disconnected_count = PlaidItem.query.filter(
        PlaidItem.user_id == user.id,
        PlaidItem.item_id.in_(item_ids),
    ).delete(synchronize_session=False)

    # Clear legacy user-level plaid token fields.
    user.plaid_access_token = None
    user.last_synced_at = None
    db.session.commit()

    return success_response(
        {
            'disconnected': disconnected_count,
            'accounts_removed': accounts_removed,
            'transactions_removed': transactions_removed,
            'warnings': warnings,
        }
    )
