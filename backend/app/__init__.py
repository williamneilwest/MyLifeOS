from pathlib import Path

from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text

from config import Config
from .db import db
from .routes import api_bp


def _resolve_sqlite_file_path(database_uri: str) -> Path | None:
    if not database_uri.startswith('sqlite:///'):
        return None
    return Path(database_uri.replace('sqlite:///', '', 1))


def _ensure_legacy_task_columns(app: Flask) -> None:
    """Add newer task columns for existing SQLite DBs created with the old schema."""
    if not app.config['SQLALCHEMY_DATABASE_URI'].startswith('sqlite:///'):
        return

    inspector = inspect(db.engine)
    if 'tasks' not in inspector.get_table_names():
        return

    existing_columns = {column['name'] for column in inspector.get_columns('tasks')}
    migrations: list[tuple[str, str]] = [
        ('due_date', 'ALTER TABLE tasks ADD COLUMN due_date DATE'),
        ('priority', "ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'"),
        ('status', "ALTER TABLE tasks ADD COLUMN status VARCHAR(20) DEFAULT 'todo'"),
        ('notes', 'ALTER TABLE tasks ADD COLUMN notes TEXT'),
        ('project_id', 'ALTER TABLE tasks ADD COLUMN project_id VARCHAR(64)'),
        ('updated_at', 'ALTER TABLE tasks ADD COLUMN updated_at DATETIME'),
    ]

    for column_name, ddl in migrations:
        if column_name in existing_columns:
            continue
        db.session.execute(text(ddl))

    db.session.commit()


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.logger.setLevel('INFO')

    CORS(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})
    db.init_app(app)
    app.register_blueprint(api_bp, url_prefix='/api')

    # Ensure models are loaded into SQLAlchemy metadata before table creation.
    from . import models  # noqa: F401

    with app.app_context():
        database_uri = app.config['SQLALCHEMY_DATABASE_URI']
        sqlite_path = _resolve_sqlite_file_path(database_uri)

        if sqlite_path:
            sqlite_path.parent.mkdir(parents=True, exist_ok=True)

        db.create_all()
        _ensure_legacy_task_columns(app)
        tables = inspect(db.engine).get_table_names()

        app.logger.info('Database URI: %s', database_uri)
        if sqlite_path:
            app.logger.info('SQLite path: %s', sqlite_path)
            app.logger.info('SQLite file exists: %s', sqlite_path.exists())
        app.logger.info('Detected tables: %s', ', '.join(tables) if tables else '(none)')

    return app
