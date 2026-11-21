import logging

from .ai_errors import generation_error
from .ai_provider import create_provider
from .study_output import validate_flashcards, validate_quiz
from .study_prompts import flashcard_prompts, quiz_prompts
from .study_response import decode_study_response


def _generate(prompts, count, validate, provider):
    try:
        if provider is None:
            provider = create_provider()
        content = provider.complete(*prompts)
        return validate(decode_study_response(content), count)
    except Exception as error:
        failure = generation_error(error)
        logging.getLogger(__name__).warning(
            "Generation failed: status=%s code=%s", failure.status, failure.code
        )
        raise failure from None


def generate_flashcards(text, count=5, *, provider=None):
    return _generate(flashcard_prompts(text, count), count, validate_flashcards, provider)


def generate_quiz_questions(text, count=5, *, provider=None):
    return _generate(quiz_prompts(text, count), count, validate_quiz, provider)
