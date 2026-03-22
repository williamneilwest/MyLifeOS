from datetime import date, datetime
from decimal import Decimal

from flask import Blueprint, current_app
from sqlalchemy import inspect, select
from sqlalchemy.sql.schema import Table

from ..api_response import error_response, success_response
from ..db import db


db_viewer_bp = Blueprint('db_viewer', __name__)


def _serialize_value(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    return value


@db_viewer_bp.get('/db/tables', strict_slashes=False)
def get_tables():
    current_app.logger.info('[DB] Fetching tables')
    tables = inspect(db.engine).get_table_names()
    return success_response(sorted(tables))


@db_viewer_bp.get('/db/table/<string:table_name>', strict_slashes=False)
def get_table_rows(table_name: str):
    current_app.logger.info('[DB] Fetching table: %s', table_name)

    inspector = inspect(db.engine)
    allowed_tables = set(inspector.get_table_names())
    if table_name not in allowed_tables:
        return error_response('Unknown table', 404)

    table = Table(table_name, db.metadata, autoload_with=db.engine)
    rows = db.session.execute(select(table)).mappings().all()
    normalized_rows = [{key: _serialize_value(value) for key, value in row.items()} for row in rows]

    return success_response(normalized_rows)

