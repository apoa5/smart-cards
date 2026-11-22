import os

from flask import Flask, jsonify, request
from flask_cors import CORS


def _cors_origins():
    configured_origins = os.getenv("CORS_ORIGINS", "")
    origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]

    return origins or ["http://localhost:5173", "http://127.0.0.1:5173", "https://smart-cards-olive.vercel.app"]

def create_app(*, on_vercel=False):
    app = Flask(__name__)
    # Allow multipart overhead while staying below Vercel's 4.5 MB limit.
    app.config["MAX_CONTENT_LENGTH"] = 4_100_000
    CORS(app, resources={r"/api/*": {"origins": _cors_origins()}})

    from .rate_limit import install_usage_controls
    from .routes import UPLOAD_LIMIT_MESSAGE, main

    @app.errorhandler(413)
    def payload_too_large(error):
        if request.endpoint == "main.upload_file":
            message = UPLOAD_LIMIT_MESSAGE
        else:
            message = error.description
        return jsonify({"error": message}), 413

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "The server could not complete the request. Please try again."}), 500

    app.register_blueprint(main)
    install_usage_controls(app, on_vercel=on_vercel)

    return app
