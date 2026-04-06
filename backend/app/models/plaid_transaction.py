from datetime import date, datetime
from uuid import uuid4

from ..db import db


class PlaidTransaction(db.Model):
    __tablename__ = 'plaid_transactions'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'transaction_id', name='uq_plaid_tx_user_transaction'),
    )

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    account_id = db.Column(db.String(128), nullable=False, index=True)
    transaction_id = db.Column(db.String(128), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, default='Plaid Transaction')
    amount = db.Column(db.Float, nullable=False, default=0.0)
    category = db.Column(db.JSON, nullable=False, default=list)
    date = db.Column(db.Date, nullable=True, index=True)
    pending = db.Column(db.Boolean, nullable=False, default=False)
    merchant_name = db.Column(db.String(255), nullable=True)
    raw_json = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        tx_date = self.date.isoformat() if isinstance(self.date, date) else None
        return {
            'id': self.id,
            'transaction_id': self.transaction_id,
            'account_id': self.account_id,
            'name': self.name,
            'amount': self.amount,
            'category': self.category or [],
            'date': tx_date,
            'pending': self.pending,
            'merchant_name': self.merchant_name,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
