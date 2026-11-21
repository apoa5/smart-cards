import json
import os
import unittest
from unittest.mock import patch

import httpx
from openai import OpenAI

from app import create_app
from app.ai_provider import create_provider
from app.groq_provider import GroqProvider
from test_study_output import study_items


class GroqProviderTests(unittest.TestCase):
    def setUp(self):
        environment = patch.dict(os.environ, {
            "AI_PROVIDER": "groq", "GROQ_API_KEY": "synthetic-groq-key",
        }, clear=True)
        environment.start()
        self.addCleanup(environment.stop)
        self.client = create_app().test_client()

    def mock_transport(self, handler):
        def make_client(**options):
            self.assertEqual(options, {
                "api_key": "synthetic-groq-key",
                "base_url": "https://api.groq.com/openai/v1",
                "timeout": 30.0,
                "max_retries": 0,
            })
            return OpenAI(**options, http_client=httpx.Client(transport=httpx.MockTransport(handler)))

        return patch("app.groq_provider.OpenAI", side_effect=make_client)

    def test_factory_configures_groq_without_openai_key(self):
        provider = create_provider()
        self.assertIsInstance(provider, GroqProvider)
        self.assertEqual(provider.model, "openai/gpt-oss-20b")
        with patch.dict(os.environ, {"AI_MODEL": "openai/gpt-oss-120b"}):
            self.assertEqual(create_provider().model, "openai/gpt-oss-120b")

    def test_missing_groq_key_does_not_use_legacy_key(self):
        with patch.dict(os.environ, {"GROQ_API_KEY": " ", "OPENAI_API_KEY": "legacy-key"}):
            with patch("app.legacy_openai.create_client") as legacy, patch("app.groq_provider.OpenAI") as groq:
                self.assertEqual(self.client.get("/api/health").status_code, 200)
                response = self.client.post("/api/generate_quiz", json={"text": "Synthetic notes"})
            legacy.assert_not_called()
            groq.assert_not_called()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(response.json["code"], "missing_api_key")

    def test_both_routes_send_expected_requests_and_return_validated_arrays(self):
        for kind, count in (("flashcards", 5), ("quiz", 15)):
            items = study_items(kind, count)

            def respond(request):
                self.assertEqual(str(request.url), "https://api.groq.com/openai/v1/chat/completions")
                self.assertEqual(request.method, "POST")
                self.assertEqual(request.headers["Authorization"], "Bearer synthetic-groq-key")
                payload = json.loads(request.content)
                self.assertEqual(payload["model"], "openai/gpt-oss-20b")
                self.assertEqual(payload["temperature"], 0.7)
                self.assertEqual(payload["max_completion_tokens"], 4096)
                self.assertNotIn("response_format", payload)
                self.assertEqual([item["role"] for item in payload["messages"]], ["system", "user"])
                self.assertIn(f"generate {count}", payload["messages"][1]["content"])
                self.assertIn("Synthetic notes", payload["messages"][1]["content"])
                return self.completion(json.dumps(items))

            with self.subTest(kind=kind), self.mock_transport(respond) as sdk:
                response = self.client.post(f"/api/generate_{kind}", json={"text": "Synthetic notes", "count": count})
                sdk.assert_called_once()
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json, {kind: items})

    def test_bad_completions_use_existing_output_error(self):
        for upstream in (
            self.completion("not JSON"),
            self.completion("[]"),
            self.completion(json.dumps(study_items("quiz")), finish_reason="length"),
            httpx.Response(200, json={"choices": []}),
        ):
            with self.subTest(body=upstream.text), self.mock_transport(lambda request: upstream):
                response = self.client.post("/api/generate_quiz", json={"text": "Synthetic notes"})
                self.assertEqual(response.status_code, 502)
                self.assertEqual(response.json["code"], "invalid_ai_response")

    def test_provider_error_mapping_and_no_retries_or_fallback(self):
        for upstream_status, upstream_code, status, code in (
            (401, None, 502, "invalid_api_key"),
            (402, None, 502, "insufficient_quota"),
            (429, "insufficient_quota", 502, "insufficient_quota"),
            (429, None, 429, "rate_limited"),
            (403, None, 502, "model_access"),
            (404, None, 502, "model_access"),
            (400, "model_decommissioned", 502, "model_access"),
            (400, "json_validate_failed", 502, "invalid_ai_response"),
            (503, None, 502, "ai_unavailable"),
            (None, httpx.ReadTimeout, 504, "ai_timeout"),
            (None, httpx.ConnectError, 502, "ai_unavailable"),
        ):
            calls = []

            def respond(request):
                calls.append(request)
                if upstream_status is None:
                    raise upstream_code("Sensitive upstream detail", request=request)
                return httpx.Response(upstream_status, json={"error": {
                    "code": upstream_code, "message": "Sensitive upstream detail",
                }})

            with self.subTest(upstream_status=upstream_status, code=code):
                with self.mock_transport(respond), patch("app.legacy_openai.create_client") as legacy:
                    with patch.dict(os.environ, {"OPENAI_API_KEY": "legacy-key"}):
                        with self.assertLogs("app.ai", level="WARNING") as logs:
                            response = self.client.post("/api/generate_quiz", json={"text": "Synthetic notes"})
                self.assertEqual(len(calls), 1)
                legacy.assert_not_called()
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.json["code"], code)
                self.assertNotIn("Sensitive upstream detail", response.json["error"])
                self.assertNotIn("Sensitive upstream detail", "\n".join(logs.output))

    @staticmethod
    def completion(content, finish_reason="stop"):
        return httpx.Response(200, json={
            "id": "mock-completion", "object": "chat.completion",
            "created": 0, "model": "openai/gpt-oss-20b",
            "choices": [{
                "index": 0, "finish_reason": finish_reason,
                "message": {"role": "assistant", "content": content},
            }],
        })
