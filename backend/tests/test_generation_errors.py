import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import create_app
from app.ai import generation_error


class GenerationErrorTests(unittest.TestCase):
    def test_missing_key_on_both_routes(self):
        client = create_app().test_client()
        with patch.dict(os.environ, {"OPENAI_API_KEY": ""}):
            for route in ("generate_flashcards", "generate_quiz"):
                response = client.post(f"/api/{route}", json={"text": "Notes"},
                                       headers={"Origin": "http://localhost:5173"})
                self.assertEqual(response.status_code, 502)
                self.assertEqual(response.json["code"], "missing_api_key")

    def test_provider_error_classification(self):
        for status, code, expected in (
            (401, None, "invalid_api_key"),
            (429, "insufficient_quota", "insufficient_quota"),
            (429, "rate_limit_exceeded", "rate_limited"),
            (404, "model_not_found", "model_access"),
        ):
            error = Exception("Sensitive upstream detail")
            error.status_code = status
            error.code = code
            result = generation_error(error)
            self.assertEqual(result.code, expected)
            self.assertNotIn("Sensitive", str(result))

    def test_truncated_response(self):
        response = SimpleNamespace(choices=[SimpleNamespace(finish_reason="length")])
        with patch("app.ai.create_client") as factory:
            factory.return_value.chat.completions.create.return_value = response
            client = create_app().test_client()
            result = client.post("/api/generate_flashcards", json={"text": "Notes"})
        self.assertEqual(result.status_code, 502)
        self.assertEqual(result.json["code"], "invalid_ai_response")
