from datetime import datetime
from uuid import uuid4

from ..db import db


class PlaidAccount(db.Model):
    __tablename__ = 'plaid_accounts'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'account_id', name='uq_plaid_accounts_user_account'),
    )

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    item_id = db.Column(db.String(128), nullable=True, index=True)
    account_id = db.Column(db.String(128), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, default='Plaid Account')
    mask = db.Column(db.String(16), nullable=True)
    type = db.Column(db.String(64), nullable=True)
    subtype = db.Column(db.String(64), nullable=True)
    current_balance = db.Column(db.Float, nullable=False, default=0.0)
    available_balance = db.Column(db.Float, nullable=True)
    is_selected = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.account_id,
            'account_id': self.account_id,
            'name': self.name,
            'mask': self.mask,
            'type': self.type,
            'subtype': self.subtype,
            'current_balance': self.current_balance,
            'available_balance': self.available_balance,
            'balance': self.current_balance,
            'selected': self.is_selected,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
