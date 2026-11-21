import os
from typing import Protocol

from dotenv import load_dotenv

from .ai_errors import GenerationError
from .groq_provider import GROQ_DEFAULT_MODEL, GroqProvider
from .legacy_openai import LegacyOpenAIProvider

load_dotenv()


class StudyProvider(Protocol):
    def complete(self, system_prompt: str, user_prompt: str) -> str | None:
        """Return untrusted completion text or raise on provider failure."""


def create_provider() -> StudyProvider:
    configured = os.getenv("AI_PROVIDER", "").strip()

    if configured == "groq":
        key = os.getenv("GROQ_API_KEY", "").strip()
        if not key:
            raise GenerationError("missing_api_key", "GROQ_API_KEY is missing from the backend configuration.")
        model = os.getenv("AI_MODEL", "").strip() or GROQ_DEFAULT_MODEL
        return GroqProvider(key, model)

    # Existing installations can keep using their explicitly provisioned legacy key.
    if configured == "legacy_openai" or (
        not configured and os.getenv("OPENAI_API_KEY", "").strip()
    ):
        model = os.getenv("AI_MODEL", "").strip() or "gpt-3.5-turbo"
        return LegacyOpenAIProvider(model)

    if not configured:
        raise GenerationError("missing_api_key", "No inference provider credentials are configured on the server.")

    raise GenerationError(
        "ai_unavailable",
        "No supported AI provider is configured on the server.",
    )
