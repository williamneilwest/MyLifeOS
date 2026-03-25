from datetime import date
import logging

from flask import Flask
from flask_cors import CORS
from sqlalchemy import inspect, text
from werkzeug.exceptions import HTTPException

from config import Config
from .api_response import error_response
from .db import db
from .routes import api_bp


def _seed_if_empty() -> None:
    from .models import (
        CommandSnippet,
        FinanceEntry,
        HomePlanningProfile,
        HomePlanningScenario,
        HomelabService,
        PlanningItem,
        Project,
        Task,
        ToolLink,
    )

    if not Task.query.first():
        db.session.add(Task(title='Initial Task', completed=False, status='todo', priority='medium'))
        db.session.add(Task(title='Review API Integrations', completed=False, status='in-progress', priority='high'))

    if not Project.query.first():
        db.session.add(Project(name='Life OS Build', description='Initial seeded project', status='In Progress', notes='Initial seeded project'))
        db.session.add(Project(name='Container Reliability', description='Improve startup health checks', status='Backlog', notes='Improve startup health checks'))

    if not FinanceEntry.query.first():
        db.session.add(
            FinanceEntry(
                entry_type='income',
                amount=2500,
                category='Salary',
                name='Seed Income',
                date=date.today(),
            )
        )
        db.session.add(
            FinanceEntry(
                entry_type='expense',
                amount=600,
                category='Infrastructure',
                name='Cloud Services',
                date=date.today(),
            )
        )

    if not PlanningItem.query.first():
        db.session.add(
            PlanningItem(
                title='Buy a house scenario',
                scenario='Home',
                notes='Initial seeded planning row',
            )
        )
        db.session.add(
            PlanningItem(
                title='Scale dashboard metrics',
                scenario='Work',
                notes='Add backend summary and operational analytics',
            )
        )

    if not HomelabService.query.first():
        db.session.add(HomelabService(name='Plex', endpoint='https://plex.local', status='healthy', uptime_days=44))

    if not HomePlanningProfile.query.get('default'):
        db.session.add(HomePlanningProfile(id='default'))

    if not HomePlanningScenario.query.first():
        db.session.add(HomePlanningScenario(label='Conservative', multiplier=0.8))
        db.session.add(HomePlanningScenario(label='Moderate', multiplier=1.0))
        db.session.add(HomePlanningScenario(label='Aggressive', multiplier=1.25))

    if not ToolLink.query.first():
        db.session.add(ToolLink(name='GitHub', url='https://github.com', category='Dev'))

    if not CommandSnippet.query.first():
        db.session.add(CommandSnippet(title='Run Dev Server', command='npm run dev'))

    db.session.commit()


def _ensure_projects_description_column() -> None:
    inspector = inspect(db.engine)
    if 'projects' not in inspector.get_table_names():
        return

    column_names = {column['name'] for column in inspector.get_columns('projects')}
    if 'description' in column_names:
        return

    db.session.execute(text("ALTER TABLE projects ADD COLUMN description TEXT NOT NULL DEFAULT ''"))
    db.session.commit()


def _ensure_quick_links_table() -> None:
    from .models import QuickLink

    inspector = inspect(db.engine)
    if 'quick_links' in inspector.get_table_names():
        columns = {column['name'] for column in inspector.get_columns('quick_links')}
        if 'user_id' not in columns:
            db.session.execute(text("ALTER TABLE quick_links ADD COLUMN user_id VARCHAR(64)"))
            db.session.execute(text("UPDATE quick_links SET user_id = 'legacy-user' WHERE user_id IS NULL"))
            db.session.execute(text("ALTER TABLE quick_links ALTER COLUMN user_id SET NOT NULL"))
            db.session.commit()
        return

    QuickLink.__table__.create(bind=db.engine, checkfirst=True)


def _ensure_scripts_table() -> None:
    from .models import Script

    inspector = inspect(db.engine)
    if 'scripts' in inspector.get_table_names():
        columns = {column['name'] for column in inspector.get_columns('scripts')}
        if 'user_id' not in columns:
            db.session.execute(text("ALTER TABLE scripts ADD COLUMN user_id VARCHAR(64)"))
            db.session.execute(text("UPDATE scripts SET user_id = 'legacy-user' WHERE user_id IS NULL"))
            db.session.execute(text("ALTER TABLE scripts ALTER COLUMN user_id SET NOT NULL"))
            db.session.commit()
        return

    Script.__table__.create(bind=db.engine, checkfirst=True)


def _ensure_users_table() -> None:
    from .models import User

    User.__table__.create(bind=db.engine, checkfirst=True)


def _ensure_flow_runs_user_id() -> None:
    inspector = inspect(db.engine)
    if 'flow_runs' not in inspector.get_table_names():
        return
    columns = {column['name'] for column in inspector.get_columns('flow_runs')}
    if 'user_id' in columns:
        return
    db.session.execute(text("ALTER TABLE flow_runs ADD COLUMN user_id VARCHAR(64)"))
    db.session.execute(text("UPDATE flow_runs SET user_id = 'legacy-user' WHERE user_id IS NULL"))
    db.session.execute(text("ALTER TABLE flow_runs ALTER COLUMN user_id SET NOT NULL"))
    db.session.commit()


def _ensure_tool_modules_table() -> None:
    from .models import UserTool

    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())

    # Fresh create for the canonical table name.
    UserTool.__table__.create(bind=db.engine, checkfirst=True)

    # One-time migration from legacy `user_tools` to `tool_modules`.
    current_tables = set(inspect(db.engine).get_table_names())
    if 'user_tools' in existing_tables and 'tool_modules' in current_tables:
        db.session.execute(
            text(
                """
                INSERT INTO tool_modules (id, name, type, config_json, created_at, updated_at)
                SELECT u.id, u.name, u.type, u.config_json, u.created_at, u.updated_at
                FROM user_tools u
                LEFT JOIN tool_modules t ON t.id = u.id
                WHERE t.id IS NULL
                """
            )
        )
        db.session.execute(text("DROP TABLE IF EXISTS user_tools"))
        db.session.commit()


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.logger.setLevel(logging.INFO)
    app.logger.info('[BOOT] Initializing application')

    @app.after_request
    def add_no_cache_headers(response):
        response.headers['Cache-Control'] = 'no-store'
        return response

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return error_response(error.description or 'Request failed', error.code or 500)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception('[ERROR] Unhandled exception: %s', error)
        return error_response('Internal server error', 500)

    try:
        CORS(
            app,
            resources={
                r'/api/*': {
                    'origins': ['https://life.wnwest.com'],
                    'methods': ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
                }
            },
        )
        app.register_blueprint(api_bp)
        print('\n=== REGISTERED ROUTES ===')
        for rule in app.url_map.iter_rules():
            print(rule)
        print('========================\n')
        db.init_app(app)

        # Ensure models are loaded into SQLAlchemy metadata before table creation.
        from . import models  # noqa: F401

        app.logger.info('[MODELS] Loaded models: %s', ', '.join(sorted(db.metadata.tables.keys())))

        with app.app_context():
            database_uri = app.config['SQLALCHEMY_DATABASE_URI']
            if not database_uri or not database_uri.startswith('postgresql://'):
                raise RuntimeError('[DB] DATABASE_URL must be a PostgreSQL URI (postgresql://...)')

            app.logger.info('[DB] Using database URI: %s', database_uri)
            db.session.execute(text('SELECT 1'))
            app.logger.info('[DB] Connection check successful')

            environment = (app.config.get('FLASK_ENV') or 'development').lower()
            if environment != 'production':
                app.logger.info('[DB] Running db.create_all() in %s mode', environment)
                db.create_all()
            else:
                app.logger.info('[DB] Production mode: ensuring required dynamic tables exist')

            _ensure_users_table()
            _ensure_quick_links_table()
            _ensure_scripts_table()
            _ensure_flow_runs_user_id()
            _ensure_tool_modules_table()

            _ensure_projects_description_column()

            expected_tables = set(db.metadata.tables.keys())
            actual_tables = set(inspect(db.engine).get_table_names())
            missing_tables = sorted(expected_tables - actual_tables)
            unexpected_tables = sorted(actual_tables - expected_tables)

            app.logger.info('[DB] Expected tables: %s', ', '.join(sorted(expected_tables)) or '(none)')
            app.logger.info('[DB] Actual tables: %s', ', '.join(sorted(actual_tables)) or '(none)')
            if missing_tables:
                app.logger.warning('[DB] Missing tables: %s', ', '.join(missing_tables))
            if unexpected_tables:
                app.logger.warning('[DB] Unexpected tables: %s', ', '.join(unexpected_tables))

            _seed_if_empty()

        app.logger.info('[BOOT] Initialization complete')
        return app
    except Exception as error:
        app.logger.exception('[ERROR] Application boot failed: %s', error)
        raise
