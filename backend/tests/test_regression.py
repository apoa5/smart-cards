import io
import json
import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from docx import Document
from pptx import Presentation
from pptx.util import Inches
from PyPDF2 import PdfWriter
from PyPDF2.generic import DecodedStreamObject, DictionaryObject, NameObject

from app import create_app


NOTES = "A triangle has three sides."
ORIGIN = "http://localhost:5173"
ROUTES = ("flashcards", "quiz")


def write_pdf(buffer):
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    page = writer.pages[0]
    page[NameObject("/Resources")] = DictionaryObject({
        NameObject("/Font"): DictionaryObject({
            NameObject("/F1"): DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            }),
        }),
    })
    stream = DecodedStreamObject()
    stream.set_data(f"BT /F1 12 Tf 10 10 Td ({NOTES}) Tj ET".encode("ascii"))
    page[NameObject("/Contents")] = stream
    writer.write(buffer)


def write_docx(buffer):
    document = Document()
    document.add_paragraph(NOTES)
    document.save(buffer)


def write_pptx(buffer):
    presentation = Presentation()
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    box = slide.shapes.add_textbox(Inches(1), Inches(1), Inches(4), Inches(1))
    box.text = NOTES
    presentation.save(buffer)


class ApiRegressionTests(unittest.TestCase):
    def setUp(self):
        provider_config = patch.dict(os.environ, {"AI_PROVIDER": "legacy_openai", "AI_MODEL": ""})
        provider_config.start()
        self.addCleanup(provider_config.stop)
        with patch.dict(os.environ, {"CORS_ORIGINS": ORIGIN}):
            app = create_app()
        self.client = app.test_client()

    def upload(self, filename, content):
        return self.client.post(
            "/api/upload", data={"file": (io.BytesIO(content), filename)}
        )

    def test_health_and_origin_policy(self):
        for origin, allowed in ((ORIGIN, ORIGIN), ("https://example.invalid", None)):
            with self.subTest(origin=origin):
                response = self.client.get("/api/health", headers={"Origin": origin})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json, {"status": "ok"})
                self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), allowed)

    def test_supported_upload_formats(self):
        fixtures = {"notes.TXT": NOTES.encode()}
        for extension, write in (("pdf", write_pdf), ("docx", write_docx), ("pptx", write_pptx)):
            buffer = io.BytesIO()
            write(buffer)
            fixtures[f"notes.{extension}"] = buffer.getvalue()

        for filename, content in fixtures.items():
            with self.subTest(filename=filename):
                response = self.upload(filename, content)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json, {"preview": NOTES, "word_count": 5})

    def test_missing_empty_and_unsupported_uploads(self):
        response = self.client.post("/api/upload")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json, {"error": "No file uploaded"})

        for filename, content in (
            ("notes.doc", b"Legacy"), ("notes.exe", b"Unsupported"),
            ("empty.txt", b" \n"), ("invalid.txt", b"\xff"),
        ):
            with self.subTest(filename=filename):
                response = self.upload(filename, content)
                self.assertEqual(response.status_code, 400)
                self.assertTrue(response.json["error"])

    def test_upload_at_exact_size_limit_trims_to_2000_words(self):
        response = self.upload("notes.txt", b"word " * 800_000)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json, {
            "preview": " ".join(["word"] * 2000), "word_count": 2000,
        })

    @patch("app.legacy_openai.create_client")
    def test_generation_counts_and_response_contract(self, create_client):
        complete = create_client.return_value.chat.completions.create
        for route in ROUTES:
            for count in (None, 5, 10, 15):
                with self.subTest(route=route, count=count):
                    effective_count = 5 if count is None else count
                    items = []
                    for index in range(effective_count):
                        item = {"question": f"Question {index + 1}?"}
                        if route == "flashcards":
                            item["answer"] = "Three"
                        else:
                            item.update(options=["One", "Two", "Three", "Four"], correct_answer="Three")
                        items.append(item)
                    complete.reset_mock()
                    complete.return_value = SimpleNamespace(choices=[SimpleNamespace(
                        finish_reason="stop",
                        message=SimpleNamespace(content=f"```json\n{json.dumps(items)}\n```"),
                    )])
                    payload = {"text": NOTES}
                    if count is not None:
                        payload["count"] = count
                    response = self.client.post(f"/api/generate_{route}", json=payload)
                    self.assertEqual(response.status_code, 200)
                    self.assertEqual(response.json, {route: items})
                    complete.assert_called_once()
                    request = complete.call_args.kwargs
                    self.assertEqual(request["model"], "gpt-3.5-turbo")
                    prompt = request["messages"][-1]["content"]
                    self.assertIn(f"generate {effective_count} ", prompt)
                    self.assertIn(NOTES, prompt)

    @patch("app.legacy_openai.create_client")
    def test_invalid_generation_requests_do_not_call_provider(self, create_client):
        invalid_object = "Request body must be a valid JSON object."
        invalid_text = "Text must be a non-empty string."
        invalid_count = "Count must be an integer of 5, 10, or 15."
        cases = [
            ({}, 400, invalid_object),
            ({"content_type": "application/json"}, 400, invalid_object),
            ({"data": "{", "content_type": "application/json"}, 400, invalid_object),
            ({"data": "null", "content_type": "application/json"}, 400, invalid_object),
            ({"json": ["text"]}, 400, invalid_object),
            ({"json": NOTES}, 400, invalid_object),
            ({"data": "[" * 2_000, "content_type": "application/json"}, 400, invalid_object),
            ({"data": '{"text":"Notes"}', "content_type": "text/plain"},
             415, "Send the request with a JSON content type."),
            ({"json": {}}, 400, invalid_text),
        ]
        cases.extend(
            ({"json": {"text": value}}, 400, invalid_text)
            for value in ("", " \t\n", 3, True, None, ["Notes"], {"notes": NOTES})
        )
        cases.extend(
            ({"json": {"text": NOTES, "count": value}}, 400, invalid_count)
            for value in (True, False, "5", 5.0, 10.5, -5, 0, 7, 20, None, [])
        )
        for route in ROUTES:
            for kwargs, status, error in cases:
                with self.subTest(route=route, kwargs=kwargs):
                    response = self.client.post(
                        f"/api/generate_{route}", headers={"Origin": ORIGIN}, **kwargs
                    )
                    self.assertEqual(response.status_code, status)
                    self.assertEqual(response.json, {"error": error})
                    self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), ORIGIN)
        create_client.assert_not_called()

    def test_generation_accepts_limits_and_passes_trimmed_input(self):
        for route, function in (("flashcards", "generate_flashcards"),
                                ("quiz", "generate_quiz_questions")):
            with patch(f"app.routes.{function}", return_value=[{"question": "Example?"}]) as generate:
                for text, expected in (
                    (" \t" + NOTES + "\n ", NOTES),
                    (" ".join(["word"] * 2_000), " ".join(["word"] * 2_000)),
                    ("x" * 32_000, "x" * 32_000),
                ):
                    with self.subTest(route=route, characters=len(text)):
                        response = self.client.post(
                            f"/api/generate_{route}", json={"text": text, "count": 10}
                        )
                        self.assertEqual(response.status_code, 200)
                        self.assertEqual(response.json, {route: generate.return_value})
                        generate.assert_called_once_with(expected, count=10)
                        generate.reset_mock()

    @patch("app.legacy_openai.create_client")
    def test_generation_rejects_text_and_request_size_over_limits(self, create_client):
        for route in ROUTES:
            for text, message in (
                ("word " * 2_001, "Text exceeds the 2,000-word limit."),
                ("x" * 32_001, "Text exceeds the 32,000-character limit."),
                (" " + "x" * 32_000, "Text exceeds the 32,000-character limit."),
            ):
                with self.subTest(route=route, message=message, characters=len(text)):
                    response = self.client.post(f"/api/generate_{route}", json={"text": text})
                    self.assertEqual(response.status_code, 413)
                    self.assertEqual(response.json, {"error": message})

            with self.subTest(route=route, limit="request body"):
                response = self.client.post(
                    f"/api/generate_{route}", json={"text": "x" * 4_100_000}
                )
                self.assertEqual(response.status_code, 413)
                self.assertEqual(set(response.json), {"error"})
                self.assertNotIn("upload", response.json["error"].lower())
        create_client.assert_not_called()

    def test_upload_rejects_blank_filenames(self):
        for filename in ("", " \t"):
            with self.subTest(filename=filename):
                response = self.upload(filename, NOTES.encode())
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response.json, {"error": "No file uploaded"})

    @patch("app.routes.extract_text_from_file", side_effect=ValueError("Synthetic parser detail"))
    def test_upload_parser_errors_omit_exception_details(self, extract):
        with self.assertLogs("app", level="WARNING") as logs:
            response = self.upload("notes.txt", NOTES.encode())
        extract.assert_called_once()
        self.assertEqual(response.status_code, 400)
        self.assertIn("Could not read this document", response.json["error"])
        self.assertNotIn("Synthetic parser detail", response.json["error"])
        self.assertNotIn("Synthetic parser detail", "\n".join(logs.output))

    @patch("app.legacy_openai.create_client")
    def test_provider_error_status_envelope_and_cors(self, create_client):
        complete = create_client.return_value.chat.completions.create
        for route in ROUTES:
            for upstream_status, upstream_code, status, code in (
                (401, None, 502, "invalid_api_key"),
                (429, "insufficient_quota", 502, "insufficient_quota"),
                (429, None, 429, "rate_limited"),
                (403, None, 502, "model_access"),
                (503, None, 502, "ai_unavailable"),
            ):
                with self.subTest(route=route, code=code):
                    error = RuntimeError("Synthetic upstream detail")
                    error.status_code = upstream_status
                    error.code = upstream_code
                    complete.side_effect = error
                    response = self.client.post(
                        f"/api/generate_{route}", json={"text": NOTES}, headers={"Origin": ORIGIN}
                    )
                    self.assertEqual(response.status_code, status)
                    self.assertEqual(set(response.json), {"error", "code"})
                    self.assertEqual(response.json["code"], code)
                    self.assertNotIn(str(error), response.json["error"])
                    self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), ORIGIN)
