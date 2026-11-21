import os
import re
import json
import logging
from openai import OpenAI
from dotenv import load_dotenv

from .study_output import validate_flashcards, validate_quiz

load_dotenv()


class GenerationError(Exception):
    def __init__(self, code, message, status=502):
        super().__init__(message)
        self.code = code
        self.status = status


def generation_error(error):
    status = getattr(error, "status_code", None)
    code = getattr(error, "code", None)
    # Log diagnostic identifiers, never document content or API credentials.
    logging.getLogger(__name__).warning(
        "Generation failed: type=%s status=%s code=%s",
        type(error).__name__, status, code,
    )
    if isinstance(error, GenerationError):
        return error
    if status == 401:
        return GenerationError("invalid_api_key", "The server's OpenAI API key is invalid. Update OPENAI_API_KEY in the backend deployment.")
    if code == "insufficient_quota":
        return GenerationError("insufficient_quota", "The OpenAI project has insufficient API quota. Check its billing and usage limits.")
    if status == 429:
        return GenerationError("rate_limited", "The AI service is busy. Please wait a moment and try again.", 429)
    if status in (403, 404):
        return GenerationError("model_access", "The server cannot access the configured AI model. Check the API project's model permissions.")
    if type(error).__name__ == "APITimeoutError":
        return GenerationError("ai_timeout", "AI generation timed out. Please try again with fewer items.", 504)
    if isinstance(error, (json.JSONDecodeError, ValueError)):
        return GenerationError("invalid_ai_response", "The AI returned an incomplete or invalid response. Try again with fewer items.")
    return GenerationError("ai_unavailable", "The AI service could not complete generation. Please try again.")


def create_client():
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise GenerationError("missing_api_key", "OPENAI_API_KEY is missing from the backend deployment. Configure it and redeploy.")
    return OpenAI(api_key=key, timeout=40.0, max_retries=0)


def _decode_completion(response):
    if not response.choices or response.choices[0].finish_reason == "length":
        raise ValueError("Missing or truncated AI response")
    content = response.choices[0].message.content
    if not isinstance(content, str):
        raise ValueError("Expected AI response text")
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()
    try:
        return json.loads(content)
    except RecursionError:
        raise ValueError("AI response JSON is nested too deeply") from None


def generate_flashcards(text, count=5):
    prompt = f"""
    You are a helpful study assistant. Based on the following text, generate {count} flashcards. 
    Each flashcard must be in this JSON format:
    {{ "question": "...", "answer": "..." }}

    Return only a JSON array, and nothing else.

    Text:
    {text}
    """

    try:
        # A missing key must not prevent uploads or CORS initialization.
        client = create_client()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate flashcards from study notes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        return validate_flashcards(_decode_completion(response), count)

    except Exception as e:
        raise generation_error(e) from e


def generate_quiz_questions(text, count=5):
    prompt = f"""
    You are a helpful quiz generator. Based on the following text, generate {count} multiple choice questions.
    Each question must include:
    - a "question" field
    - four "options" (as a list)
    - a "correct_answer" field

    Return only a JSON array.

    Text:
    {text}
    """

    try:
        # A missing key must not prevent uploads or CORS initialization.
        client = create_client()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate multiple choice quiz questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        return validate_quiz(_decode_completion(response), count)

    except Exception as e:
        raise generation_error(e) from e
