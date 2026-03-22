from flask import Flask
from flask_cors import CORS

from config import Config
from .db import db
from .routes import api_bp


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r'/api/*': {'origins': app.config['CORS_ORIGINS']}})
    db.init_app(app)
    app.register_blueprint(api_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()

    return app
