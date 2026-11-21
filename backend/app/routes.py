from flask import Blueprint, abort, current_app, jsonify, request
from werkzeug.exceptions import HTTPException
from app.utils.utils import extract_text_from_file
from app.ai import GenerationError, generate_flashcards, generate_quiz_questions

main = Blueprint("main", __name__)

MAX_UPLOAD_BYTES = 4_000_000
MAX_GENERATION_WORDS = 2_000  # Matches document preprocessing.
MAX_GENERATION_CHARACTERS = 32_000
GENERATION_COUNTS = (5, 10, 15)
UPLOAD_LIMIT_MESSAGE = "File too large. Upload a file of 4 MB or less."


@main.errorhandler(400)
@main.errorhandler(415)
def handle_invalid_request(error: HTTPException):
    return jsonify({"error": error.description}), error.code


@main.errorhandler(GenerationError)
def handle_generation_error(error):
    return jsonify({"error": str(error), "code": error.code}), error.status


@main.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@main.route("/api/upload", methods=["POST"])
def upload_file():
    uploaded_file = request.files.get("file")

    if uploaded_file is None or not (uploaded_file.filename or "").strip():
        return jsonify({"error": "No file uploaded"}), 400

    filename = uploaded_file.filename.lower()

    if filename.endswith(".doc") or filename.endswith(".ppt"):
        return jsonify({
            "error": "Files in .doc or .ppt format are not supported. Please upload as .docx or .pptx instead."
        }), 400

    if not filename.endswith((".txt", ".pdf", ".docx", ".pptx")):
        return jsonify({"error": "Please upload a TXT, PDF, DOCX, or PPTX file."}), 400

    try:
        uploaded_file.seek(0, 2)
        file_size = uploaded_file.tell()
        uploaded_file.seek(0)
        if file_size > MAX_UPLOAD_BYTES:
            return jsonify({"error": UPLOAD_LIMIT_MESSAGE}), 413

        processed_text = extract_text_from_file(uploaded_file)
    except Exception as error:
        current_app.logger.warning("Document extraction failed: %s", type(error).__name__)
        return jsonify({"error": "Could not read this document. Check that it is valid and not password protected."}), 400

    if not processed_text:
        return jsonify({"error": "Could not extract text"}), 400

    return jsonify({
        "preview": processed_text,
        "word_count": len(processed_text.split())
    })


def validate_generation_request():
    if not request.is_json and (request.mimetype or request.content_length):
        abort(415, description="Send the request with a JSON content type.")

    invalid_body = "Request body must be a valid JSON object."
    try:
        data = request.get_json(silent=True)
    except RecursionError:
        abort(400, description=invalid_body)
    if not isinstance(data, dict):
        abort(400, description=invalid_body)

    text = data.get("text")
    if not isinstance(text, str):
        abort(400, description="Text must be a non-empty string.")
    if len(text) > MAX_GENERATION_CHARACTERS:
        abort(413, description="Text exceeds the 32,000-character limit.")

    text = text.strip()
    if not text:
        abort(400, description="Text must be a non-empty string.")
    if len(text.split()) > MAX_GENERATION_WORDS:
        abort(413, description="Text exceeds the 2,000-word limit.")

    count = data.get("count", 5)
    if type(count) is not int or count not in GENERATION_COUNTS:
        abort(400, description="Count must be an integer of 5, 10, or 15.")

    return text, count


def generate_response(generate, field):
    text, count = validate_generation_request()
    items = generate(text, count=count)
    if not items:
        return jsonify({"error": "Generation failed. Please try again. If this persists, check the server API key and provider quota."}), 502
    return jsonify({field: items})


@main.route("/api/generate_flashcards", methods=["POST"])
def flashcard_route():
    return generate_response(generate_flashcards, "flashcards")


@main.route("/api/generate_quiz", methods=["POST"])
def quiz_route():
    return generate_response(generate_quiz_questions, "quiz")
