import io
import os
import unittest
from unittest.mock import patch

from app import create_app


class ApiTests(unittest.TestCase):
    def setUp(self):
        with patch.dict(os.environ, {"CORS_ORIGINS": ""}):
            self.app = create_app()
        self.client = self.app.test_client()
        self.origin = "https://smart-cards-olive.vercel.app"
        self.headers = {"Origin": self.origin}

    def assert_cors(self, response):
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), self.origin)

    def test_preflights(self):
        for route in ("upload", "generate_flashcards", "generate_quiz"):
            response = self.client.options(f"/api/{route}", headers={
                **self.headers,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            })
            self.assertEqual(response.status_code, 200)
            self.assert_cors(response)
            self.assertIn("content-type", response.headers["Access-Control-Allow-Headers"].lower())

    def test_upload(self):
        response = self.client.post("/api/upload", headers=self.headers,
                                    data={"file": (io.BytesIO(b"Study notes about biology."), "notes.txt")})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["preview"])
        self.assert_cors(response)

    def test_invalid_and_oversized_uploads(self):
        for filename, content, status in (
            ("slides.ppt", b"legacy", 400),
            ("broken.pdf", b"invalid", 400),
            ("large.txt", b"x" * 4_000_001, 413),
            ("large.txt", b"x" * 4_200_000, 413),
        ):
            response = self.client.post("/api/upload", headers=self.headers,
                                        data={"file": (io.BytesIO(content), filename)})
            self.assertEqual(response.status_code, status)
            self.assertIn("error", response.json)
            self.assert_cors(response)

    def test_generation_success_and_failure(self):
        for route, function, field in (
            ("generate_flashcards", "generate_flashcards", "flashcards"),
            ("generate_quiz", "generate_quiz_questions", "quiz"),
        ):
            for result, status in (([], 502), ([{"question": "Example?"}], 200)):
                with patch(f"app.routes.{function}", return_value=result):
                    response = self.client.post(f"/api/{route}", headers=self.headers,
                                                json={"text": "Notes", "count": 5})
                self.assertEqual(response.status_code, status)
                self.assert_cors(response)
                self.assertIn(field if status == 200 else "error", response.json)

    def test_explicit_origin_overrides_defaults(self):
        with patch.dict(os.environ, {"CORS_ORIGINS": "https://example.com/"}):
            client = create_app().test_client()
        response = client.get("/api/health", headers={"Origin": "https://example.com"})
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], "https://example.com")
        response = client.get("/api/health", headers=self.headers)
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)


if __name__ == "__main__":
    unittest.main()
