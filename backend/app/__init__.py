import os

from flask import Flask, jsonify
from flask_cors import CORS


def _cors_origins():
    configured_origins = os.getenv("CORS_ORIGINS", "")
    origins = [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]

    return origins or ["http://localhost:5173", "http://127.0.0.1:5173", "https://smart-cards-olive.vercel.app"]

def create_app():
    app = Flask(__name__)
    # Allow multipart overhead while staying below Vercel's 4.5 MB limit.
    app.config["MAX_CONTENT_LENGTH"] = 4_100_000
    CORS(app, resources={r"/api/*": {"origins": _cors_origins()}})

    @app.errorhandler(413)
    def payload_too_large(error):
        return jsonify({"error": "File too large. Upload a file of 4 MB or less."}), 413

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "The server could not complete the request. Please try again."}), 500

    from .routes import main
    app.register_blueprint(main)

    return app
