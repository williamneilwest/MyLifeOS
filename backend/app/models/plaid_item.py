from datetime import datetime
from uuid import uuid4

from ..db import db


class PlaidItem(db.Model):
    __tablename__ = 'plaid_items'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    access_token = db.Column(db.Text, nullable=False)
    item_id = db.Column(db.String(128), nullable=False, index=True)
    institution_name = db.Column(db.String(255), nullable=True)
    cursor = db.Column(db.Text, nullable=True)
    last_synced_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
