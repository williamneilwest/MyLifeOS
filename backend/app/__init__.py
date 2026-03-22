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

    if not Project.query.first():
        db.session.add(Project(name='Life OS Build', status='In Progress', notes='Initial seeded project'))

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

    if not PlanningItem.query.first():
        db.session.add(
            PlanningItem(
                title='Buy a house scenario',
                scenario='Home',
                notes='Initial seeded planning row',
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


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.logger.setLevel(logging.INFO)
    app.logger.info('[BOOT] Initializing application')

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return error_response(error.description or 'Request failed', error.code or 500)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception('[ERROR] Unhandled exception: %s', error)
        return error_response('Internal server error', 500)

    try:
        CORS(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})
        db.init_app(app)
        app.register_blueprint(api_bp, url_prefix='/api')

        # Ensure models are loaded into SQLAlchemy metadata before table creation.
        from . import models  # noqa: F401

        app.logger.info('[MODELS] Loaded models: %s', ', '.join(sorted(db.metadata.tables.keys())))

        with app.app_context():
            database_uri = app.config['SQLALCHEMY_DATABASE_URI']
            app.logger.info('[DB] Using database URI: %s', database_uri)
            db.session.execute(text('SELECT 1'))

            environment = (app.config.get('FLASK_ENV') or 'development').lower()
            if environment != 'production':
                app.logger.info('[DB] Running db.create_all() in %s mode', environment)
                db.create_all()

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
