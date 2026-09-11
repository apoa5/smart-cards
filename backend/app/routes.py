from flask import Blueprint, request, jsonify, current_app
from app.utils.utils import extract_text_from_file
from app.ai import GenerationError, generate_flashcards, generate_quiz_questions

main = Blueprint("main", __name__)


@main.errorhandler(GenerationError)
def handle_generation_error(error):
    return jsonify({"error": str(error), "code": error.code}), error.status


@main.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@main.route("/api/upload", methods=["POST"])
def upload_file():
    uploaded_file = request.files.get("file")

    if not uploaded_file:
        return jsonify({"error": "No file uploaded"}), 400

    filename = uploaded_file.filename.lower()

    if filename.endswith(".doc") or filename.endswith(".ppt"):
        return jsonify({
            "error": "Files in .doc or .ppt format are not supported. Please upload as .docx or .pptx instead."
        }), 400

    if not filename.endswith((".txt", ".pdf", ".docx", ".pptx")):
        return jsonify({"error": "Please upload a TXT, PDF, DOCX, or PPTX file."}), 400

    uploaded_file.seek(0, 2)
    file_size = uploaded_file.tell()
    uploaded_file.seek(0)
    if file_size > 4_000_000:
        return jsonify({"error": "File too large. Upload a file of 4 MB or less."}), 413

    try:
        processed_text = extract_text_from_file(uploaded_file)
    except Exception:
        current_app.logger.exception("Document extraction failed")
        return jsonify({"error": "Could not read this document. Check that it is valid and not password protected."}), 400

    if not processed_text:
        return jsonify({"error": "Could not extract text"}), 400

    return jsonify({
        "preview": processed_text,
        "word_count": len(processed_text.split())
    })


@main.route("/api/generate_flashcards", methods=["POST"])
def flashcard_route():
    data = request.get_json()
    text = data.get("text", "")
    count = data.get("count", 5)

    if not text:
        return jsonify({"error": "No text provided"}), 400

    flashcards = generate_flashcards(text, count=count)
    if not flashcards:
        return jsonify({"error": "Generation failed. Please try again. If this persists, check the server API key and provider quota."}), 502
    return jsonify({"flashcards": flashcards})

@main.route("/api/generate_quiz", methods=["POST"])
def quiz_route():
    data = request.get_json()
    text = data.get("text", "")
    count = data.get("count", 5)

    if not text:
        return jsonify({"error": "No text provided"}), 400

    quiz = generate_quiz_questions(text, count=count)
    if not quiz:
        return jsonify({"error": "Generation failed. Please try again. If this persists, check the server API key and provider quota."}), 502
    return jsonify({"quiz": quiz})

