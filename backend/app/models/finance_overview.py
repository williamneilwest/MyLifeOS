from datetime import datetime
from uuid import uuid4

from ..db import db


class Debt(db.Model):
    __tablename__ = 'debts'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    debt_type = db.Column(db.String(64), nullable=False)
    balance = db.Column(db.Float, nullable=False, default=0.0)
    interest_rate = db.Column(db.Float, nullable=False, default=0.0)
    minimum_payment = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'type': self.debt_type,
            'balance': self.balance,
            'interest_rate': self.interest_rate,
            'minimum_payment': self.minimum_payment,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class IncomeSource(db.Model):
    __tablename__ = 'income_sources'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    monthly_amount = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'monthly_amount': self.monthly_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class AllocationRule(db.Model):
    __tablename__ = 'allocation_rules'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    user_id = db.Column(db.String(64), nullable=False, index=True)
    category = db.Column(db.String(32), nullable=False)
    percentage = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'category': self.category,
            'percentage': self.percentage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
