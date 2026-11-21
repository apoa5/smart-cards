import json
import os
import unittest
from unittest.mock import Mock, patch

from httpx import Request
from openai import APITimeoutError

from app import create_app
from app.ai import generate_flashcards, generate_quiz_questions
from app.ai_errors import GenerationError
from app.ai_provider import create_provider
from app.legacy_openai import LegacyOpenAIProvider
from test_study_output import study_items


class ProviderTests(unittest.TestCase):
    def test_service_accepts_a_fake_provider(self):
        for generate, kind in ((generate_flashcards, "flashcards"),
                               (generate_quiz_questions, "quiz")):
            with self.subTest(kind=kind):
                items = study_items(kind, 10)
                provider = Mock(spec=["complete"])
                provider.complete.return_value = json.dumps(items)
                self.assertEqual(generate("Synthetic notes", 10, provider=provider), items)
                provider.complete.assert_called_once()
                self.assertIn("generate 10", provider.complete.call_args.args[1])
                self.assertIn("Synthetic notes", provider.complete.call_args.args[1])

    def test_flask_routes_use_provider_factory(self):
        client = create_app().test_client()
        provider = Mock(spec=["complete"])
        provider.complete.return_value = json.dumps(study_items("quiz"))
        with patch("app.ai.create_provider", return_value=provider) as factory:
            response = client.post("/api/generate_quiz", json={"text": "Synthetic notes"})
        factory.assert_called_once_with()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {"quiz": study_items("quiz")})

    def test_factory_keeps_existing_keyed_installations_compatible(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "synthetic"}, clear=True):
            provider = create_provider()
        self.assertIsInstance(provider, LegacyOpenAIProvider)
        self.assertEqual(provider.model, "gpt-3.5-turbo")

    def test_factory_accepts_explicit_legacy_model(self):
        with patch.dict(os.environ, {"AI_PROVIDER": "legacy_openai", "AI_MODEL": "example-model"}, clear=True):
            provider = create_provider()
        self.assertIsInstance(provider, LegacyOpenAIProvider)
        self.assertEqual(provider.model, "example-model")

    def test_factory_rejects_unconfigured_and_unimplemented_providers(self):
        for env, code in (
            ({}, "missing_api_key"),
            ({"AI_PROVIDER": "openai_compatible", "OPENAI_API_KEY": "synthetic"}, "ai_unavailable"),
        ):
            with self.subTest(provider=env.get("AI_PROVIDER")):
                with patch.dict(os.environ, env, clear=True), self.assertRaises(GenerationError) as error:
                    create_provider()
                self.assertEqual(error.exception.code, code)
                self.assertEqual(error.exception.status, 502)

    @patch("app.legacy_openai.create_client")
    def test_legacy_timeout_keeps_public_status_and_code(self, create_client):
        complete = create_client.return_value.chat.completions.create
        complete.side_effect = APITimeoutError(request=Request("POST", "https://example.invalid"))
        with self.assertRaises(GenerationError) as error:
            generate_flashcards("Synthetic notes", provider=LegacyOpenAIProvider("gpt-3.5-turbo"))
        self.assertEqual(error.exception.code, "ai_timeout")
        self.assertEqual(error.exception.status, 504)
