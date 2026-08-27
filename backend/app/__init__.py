import os

from flask import Flask
from flask_cors import CORS


def _cors_origins():
    configured_origins = os.getenv("CORS_ORIGINS", "")
    origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]

    return origins or ["http://localhost:5173", "http://127.0.0.1:5173"]

def create_app():
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": _cors_origins()}})

    from .routes import main
    app.register_blueprint(main)

    return app
