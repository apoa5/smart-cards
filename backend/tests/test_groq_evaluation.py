from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
import io
import json
import os
import unittest
from unittest.mock import patch

import httpx

from evaluation import groq_eval
from evaluation.corpus import PASSAGES
from test_study_output import study_items


class GroqEvaluationTests(unittest.TestCase):
    def test_schedule_covers_the_full_matrix_and_balanced_first_batch(self):
        cases = groq_eval.evaluation_cases()
        self.assertEqual(len(cases), len(PASSAGES) * 6)
        self.assertEqual(len(set(cases)), len(cases))
        first = cases[:6]
        self.assertEqual({(case.kind, case.count) for case in first}, set(groq_eval.COMBINATIONS))
        self.assertEqual(len({case.passage.domain for case in first}), 3)

    @patch("evaluation.groq_eval.run_case")
    def test_dry_run_and_missing_credentials_never_call_groq(self, run_case):
        with patch.dict(os.environ, {}, clear=True), redirect_stdout(io.StringIO()) as output:
            self.assertEqual(groq_eval.main(["--budget", "1"]), 0)
            with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as failure:
                groq_eval.main(["--live", "--budget", "1"])
        self.assertEqual(failure.exception.code, 2)
        self.assertIn("Planned requests: 1", output.getvalue())
        self.assertIn("algorithms / flashcards / 5", output.getvalue())
        run_case.assert_not_called()

    @patch("evaluation.groq_eval.run_case")
    @patch("evaluation.groq_eval.REPORT_DIR")
    def test_429_stops_the_batch_and_keeps_skipped_cases_in_report(self, report_dir, run_case):
        case = groq_eval.evaluation_cases()[0]
        run_case.return_value = {
            "case": case, "http": 429, "error": "rate_limited", "latency": 0.25,
            "count": None, "duplicates": None, "mappings": None, "truncated": None,
            "usage": {}, "items": None,
        }
        with patch.dict(os.environ, {"GROQ_API_KEY": "synthetic"}, clear=True):
            with redirect_stdout(io.StringIO()):
                self.assertEqual(groq_eval.main(["--live", "--budget", "2"]), 1)
        run_case.assert_called_once()
        report = (report_dir / "filename").write_text.call_args.args[0]
        self.assertIn("HTTP 429 responses: 1", report)
        self.assertIn("Cases skipped", report)
        self.assertIn("plant-cells / quiz / 5", report)
        self.assertNotIn("synthetic", report)

    def test_wire_observations_and_validation_are_measured_separately(self):
        case = groq_eval.evaluation_cases()[1]
        items = study_items("quiz")
        for mode, finish_reason in (("valid", "stop"), ("duplicate", "stop"), ("truncated", "length")):
            payload = json.loads(json.dumps(items))
            if mode == "duplicate":
                payload[1]["question"] = payload[0]["question"]
                payload[1]["correct_answer"] = "Absent"

            def handler(request):
                self.assertEqual(request.url.host, "api.groq.com")
                return httpx.Response(200, json={
                    "id": "mock", "object": "chat.completion", "created": 0,
                    "model": "openai/gpt-oss-20b",
                    "choices": [{
                        "index": 0, "finish_reason": finish_reason,
                        "message": {"role": "assistant", "content": json.dumps(payload)},
                    }],
                    "usage": {"prompt_tokens": 30, "completion_tokens": 12, "total_tokens": 42},
                })

            def client_factory(**kwargs):
                return httpx.Client(transport=httpx.MockTransport(handler), **kwargs)

            with self.subTest(mode=mode):
                row = groq_eval.run_case(
                    case, "synthetic", "openai/gpt-oss-20b", http_client_factory=client_factory,
                )
                self.assertEqual(row["http"], 200)
                self.assertEqual(row["count"], 5)
                self.assertEqual(row["duplicates"], int(mode == "duplicate"))
                self.assertEqual(row["mappings"], 5 - int(mode == "duplicate"))
                self.assertEqual(row["usage"]["total_tokens"], 42)
                self.assertEqual(row["truncated"], mode == "truncated")
                self.assertEqual(row["error"], None if mode == "valid" else "invalid_ai_response")
                report = groq_eval.render_report("openai/gpt-oss-20b", datetime.now(timezone.utc), [row], [])
                self.assertIn("pending human review", report)
                self.assertNotIn("synthetic", report)
