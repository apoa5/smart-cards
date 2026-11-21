import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app import create_app
from app.ai_errors import generation_error
from test_study_output import study_items


class GenerationErrorTests(unittest.TestCase):
    def setUp(self):
        provider_config = patch.dict(os.environ, {"AI_PROVIDER": "legacy_openai", "AI_MODEL": ""})
        provider_config.start()
        self.addCleanup(provider_config.stop)

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
        with patch("app.legacy_openai.create_client") as factory:
            factory.return_value.chat.completions.create.return_value = response
            client = create_app().test_client()
            result = client.post("/api/generate_flashcards", json={"text": "Notes"})
        self.assertEqual(result.status_code, 502)
        self.assertEqual(result.json["code"], "invalid_ai_response")

    @patch("app.legacy_openai.create_client")
    def test_invalid_model_output_is_rejected_by_both_routes(self, factory):
        completion = factory.return_value.chat.completions.create
        client = create_app().test_client()
        for kind in ("flashcards", "quiz"):
            items = study_items(kind)
            invalid_item = {**items[0], "question": " "}
            if kind == "quiz":
                invalid_item = {**items[0], "correct_answer": "Absent"}
            cases = {
                "malformed": '[{"private marker":',
                "null": "null",
                "non-array": json.dumps({"items": items}),
                "wrong count": json.dumps(items[:-1]),
                "invalid item": json.dumps([invalid_item, *items[1:]]),
                "missing content": None,
            }
            for case, content in cases.items():
                with self.subTest(route=kind, case=case):
                    completion.return_value = SimpleNamespace(choices=[SimpleNamespace(
                        finish_reason="stop", message=SimpleNamespace(content=content),
                    )])
                    completion.reset_mock()
                    with self.assertLogs("app.ai", level="WARNING") as logs:
                        response = client.post(f"/api/generate_{kind}", json={"text": "Private input marker"})
                    self.assertEqual(response.status_code, 502)
                    self.assertEqual(response.json, {
                        "error": "The AI returned an incomplete or invalid response. Try again with fewer items.",
                        "code": "invalid_ai_response",
                    })
                    completion.assert_called_once()
                    self.assertNotIn("private marker", "\n".join(logs.output))
                    self.assertNotIn("Private input marker", "\n".join(logs.output))
