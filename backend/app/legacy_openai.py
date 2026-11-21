import os

from openai import APITimeoutError, OpenAI

from .ai_errors import GenerationError


def create_client():
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise GenerationError(
            "missing_api_key",
            "OPENAI_API_KEY is missing from the backend deployment. Configure it and redeploy.",
        )
    return OpenAI(api_key=key, timeout=40.0, max_retries=0)


class LegacyOpenAIProvider:
    def __init__(self, model):
        self.model = model

    def complete(self, system_prompt, user_prompt):
        client = create_client()
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )
        except APITimeoutError:
            raise TimeoutError("AI completion timed out") from None

        if not response.choices or response.choices[0].finish_reason == "length":
            raise ValueError("Missing or truncated AI response")
        return response.choices[0].message.content
