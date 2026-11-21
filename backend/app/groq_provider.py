from openai import APIResponseValidationError, APIStatusError, APITimeoutError, OpenAI

from .ai_errors import GenerationError


GROQ_BASE_URL = "https://api.groq.com/openai/v1"
GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b"


class GroqProvider:
    def __init__(self, api_key: str, model: str = GROQ_DEFAULT_MODEL):
        self._api_key = api_key
        self.model = model

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        try:
            with OpenAI(
                api_key=self._api_key, base_url=GROQ_BASE_URL, timeout=30.0, max_retries=0
            ) as client:
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=0.7,
                    max_completion_tokens=4096,
                )
        except APITimeoutError:
            raise TimeoutError("AI completion timed out") from None
        except APIResponseValidationError:
            raise ValueError("Invalid Groq completion") from None
        except APIStatusError as error:
            if error.status_code == 401:
                raise GenerationError("invalid_api_key", "The server's Groq API key is invalid.") from None
            if error.status_code == 402 or error.code in ("insufficient_quota", "billing_hard_limit_reached"):
                raise GenerationError("insufficient_quota", "The Groq account has insufficient API quota.") from None
            if error.code in ("model_not_found", "model_decommissioned"):
                raise GenerationError("model_access", "The server cannot access the configured AI model.") from None
            if error.code in ("json_validate_failed", "json_validation_failed"):
                raise ValueError("Invalid Groq completion") from None
            raise

        choices = getattr(response, "choices", None)
        if not choices or getattr(choices[0], "finish_reason", None) != "stop":
            raise ValueError("Missing or incomplete Groq completion")
        content = getattr(getattr(choices[0], "message", None), "content", None)
        if not isinstance(content, str):
            raise ValueError("Expected Groq completion text")
        return content
