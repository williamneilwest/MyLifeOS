from datetime import datetime
import json
from uuid import uuid4

from ..db import db


class AIBuild(db.Model):
    __tablename__ = 'ai_builds'

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid4()))
    idea = db.Column(db.Text, nullable=False)
    feature_name = db.Column(db.String(255), nullable=False, default='')
    summary = db.Column(db.Text, nullable=False, default='')
    codex_prompt = db.Column(db.Text, nullable=False, default='')
    risk_level = db.Column(db.String(20), nullable=False, default='Medium')
    files_affected_json = db.Column(db.Text, nullable=False, default='[]')
    rollback_plan = db.Column(db.Text, nullable=False, default='')
    status = db.Column(db.String(20), nullable=False, default='Draft')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    apply_requested_at = db.Column(db.DateTime, nullable=True)
    applied_at = db.Column(db.DateTime, nullable=True)
    reverted_at = db.Column(db.DateTime, nullable=True)
    pre_change_commit_hash = db.Column(db.String(64), nullable=True)
    post_change_commit_hash = db.Column(db.String(64), nullable=True)
    generation_model = db.Column(db.String(120), nullable=True)
    generation_raw_response = db.Column(db.Text, nullable=True)
    apply_log = db.Column(db.Text, nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    def set_files_affected(self, files: list[str]) -> None:
        cleaned = [str(path).strip() for path in files if str(path).strip()]
        self.files_affected_json = json.dumps(cleaned)

    def get_files_affected(self) -> list[str]:
        try:
            parsed = json.loads(self.files_affected_json or '[]')
        except json.JSONDecodeError:
            return []
        if not isinstance(parsed, list):
            return []
        return [str(path) for path in parsed if str(path).strip()]

    def to_dict(self) -> dict[str, object]:
        return {
            'id': self.id,
            'idea': self.idea,
            'feature_name': self.feature_name,
            'summary': self.summary,
            'codex_prompt': self.codex_prompt,
            'risk_level': self.risk_level,
            'files_affected': self.get_files_affected(),
            'rollback_plan': self.rollback_plan,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'apply_requested_at': self.apply_requested_at.isoformat() if self.apply_requested_at else None,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
            'reverted_at': self.reverted_at.isoformat() if self.reverted_at else None,
            'pre_change_commit_hash': self.pre_change_commit_hash,
            'post_change_commit_hash': self.post_change_commit_hash,
            'generation_model': self.generation_model,
            'generation_raw_response': self.generation_raw_response,
            'apply_log': self.apply_log,
            'error_message': self.error_message,
        }
