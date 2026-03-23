from datetime import date, datetime
from uuid import uuid4

from ..db import db


class FinanceEntry(db.Model):
    __tablename__ = 'finance_entries'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    entry_type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(120), nullable=False)
    date = db.Column(db.Date, nullable=False)
    name = db.Column(db.String(200), nullable=False, default='Entry')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'type': self.entry_type,
            'amount': self.amount,
            'category': self.category,
            'date': self.date.isoformat() if isinstance(self.date, date) else None,
            'name': self.name,
        }
