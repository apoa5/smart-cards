from flask import Blueprint, request, jsonify
from app.utils.utils import extract_text_from_file
from app.ai import generate_flashcards, generate_quiz_questions

main = Blueprint("main", __name__)

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

    processed_text = extract_text_from_file(uploaded_file)

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
    return jsonify({"flashcards": flashcards})

@main.route("/api/generate_quiz", methods=["POST"])
def quiz_route():
    data = request.get_json()
    text = data.get("text", "")
    count = data.get("count", 5)

    if not text:
        return jsonify({"error": "No text provided"}), 400

    quiz = generate_quiz_questions(text, count=count)
    return jsonify({"quiz": quiz})


