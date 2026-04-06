from datetime import datetime
from uuid import uuid4

from ..db import db


class PlaidCallLog(db.Model):
    __tablename__ = 'plaid_call_logs'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    call_type = db.Column(db.String(32), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
