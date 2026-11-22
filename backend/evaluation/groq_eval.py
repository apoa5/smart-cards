"""Evaluate Groq on original synthetic SmartCards passages."""

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
import json
from math import ceil
import os
from pathlib import Path
from statistics import median
from time import perf_counter

from openai import DefaultHttpxClient, OpenAI

from app.ai import generate_flashcards, generate_quiz_questions
from app.ai_errors import GenerationError
from app.groq_provider import GROQ_DEFAULT_MODEL, GroqProvider
from app.study_prompts import PROMPT_VERSIONS
from app.study_response import decode_study_response

from .corpus import PASSAGES, Passage


GENERATORS = {"flashcards": generate_flashcards, "quiz": generate_quiz_questions}
COMBINATIONS = tuple((kind, count) for count in (5, 10, 15) for kind in GENERATORS)
MAX_REQUESTS = 6
REPORT_DIR = Path(__file__).resolve().parents[2] / "docs" / "evaluation"


@dataclass(frozen=True)
class Case:
    passage: Passage
    kind: str
    count: int

    @property
    def label(self):
        return f"{self.passage.id} / {self.kind} / {self.count}"


def evaluation_cases():
    # Put one case for each type/count and two per domain in the first batch.
    first = [Case(passage, *combination) for passage, combination in zip(PASSAGES, COMBINATIONS)]
    remaining = [
        Case(passage, *combination)
        for passage in PASSAGES for combination in COMBINATIONS
        if Case(passage, *combination) not in first
    ]
    return first + remaining


class Observation:
    def __init__(self):
        self.status = None
        self.finish_reason = None
        self.usage = {}
        self.content = None

    def capture(self, response):
        self.status = response.status_code
        if not response.is_success:
            return
        response.read()
        try:
            body = response.json()
        except (ValueError, RecursionError):
            return
        if not isinstance(body, dict):
            return
        usage = body.get("usage")
        if isinstance(usage, dict):
            self.usage = {
                name: usage[name] for name in ("prompt_tokens", "completion_tokens", "total_tokens")
                if type(usage.get(name)) is int and usage[name] >= 0
            }
        choices = body.get("choices")
        if isinstance(choices, list) and choices and isinstance(choices[0], dict):
            choice = choices[0]
            self.finish_reason = choice.get("finish_reason")
            message = choice.get("message")
            if isinstance(message, dict):
                self.content = message.get("content")


def structural_metrics(content, case):
    try:
        items = decode_study_response(content)
    except ValueError:
        return None, None, None
    if not isinstance(items, list):
        return None, None, None

    questions = [
        item["question"].strip() for item in items
        if isinstance(item, dict) and isinstance(item.get("question"), str)
    ]
    duplicates = len(questions) - len(set(questions)) if len(questions) == len(items) else None
    mappings = None
    if case.kind == "quiz":
        mappings = sum(
            isinstance(item, dict)
            and isinstance(item.get("options"), list)
            and isinstance(item.get("correct_answer"), str)
            and item["options"].count(item["correct_answer"]) == 1
            for item in items
        )
    return len(items), duplicates, mappings


def run_case(case, key, model, *, prompt_version="original", http_client_factory=DefaultHttpxClient):
    observation = Observation()

    def client_factory(**options):
        with_options = http_client_factory(
            timeout=options["timeout"], follow_redirects=False,
            event_hooks={"response": [observation.capture]},
        )
        return OpenAI(**options, http_client=with_options)

    provider = GroqProvider(key, model, client_factory=client_factory)
    start = perf_counter()
    items, error = None, None
    try:
        items = GENERATORS[case.kind](
            case.passage.text, case.count, provider=provider, prompt_version=prompt_version,
        )
    except GenerationError as failure:
        error = failure.code
    latency = perf_counter() - start
    count, duplicates, mappings = structural_metrics(observation.content, case)
    return {
        "case": case, "http": observation.status, "error": error, "latency": latency,
        "count": count, "duplicates": duplicates, "mappings": mappings,
        "truncated": (observation.finish_reason == "length" if observation.finish_reason else None),
        "usage": observation.usage, "items": items,
    }


def render_report(model, started, results, skipped, *, prompt_version="original"):
    def show(value):
        return "—" if value is None else str(value)

    http_successes = sum(row["http"] is not None and 200 <= row["http"] < 300 for row in results)
    valid = sum(row["items"] is not None for row in results)
    exact = sum(row["count"] == row["case"].count for row in results)
    errors = Counter(row["error"] for row in results if row["error"])
    latencies = sorted(row["latency"] for row in results)
    lines = [
        "# Groq evaluation run", "",
        f"- Started (UTC): {started.isoformat()}",
        f"- Model: `{model}`",
        f"- Prompt version: `{prompt_version}`",
        f"- Requests attempted: {len(results)} of {len(results) + len(skipped)} planned",
        f"- HTTP 2xx: {http_successes}/{len(results)}",
        f"- Validated outputs: {valid}/{len(results)}",
        f"- Exact count: {exact}/{len(results)}",
        f"- Truncated completions reported by Groq: {sum(row['truncated'] is True for row in results)}",
        f"- Timeouts: {errors['ai_timeout']}",
        f"- HTTP 429 responses: {sum(row['http'] == 429 for row in results)}",
        f"- Median / p95 elapsed time for attempts: {median(latencies):.3f} s / "
        f"{latencies[ceil(0.95 * len(latencies)) - 1]:.3f} s (nearest-rank p95)",
        "- Factual grounding, clarity, relevance and distractor quality: **pending human review**.",
        "- Cost was not measured. Apply your account's token prices to the reported usage.",
        "- Decision: pending human review and representative live evidence.", "",
        "## Per-case measurements", "",
        "| Case | HTTP | Schema | Items / requested | Duplicate questions | Exact answer mappings | Truncated | Seconds | Input / output / total tokens | Error |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for row in results:
        case = row["case"]
        tokens = " / ".join(show(row["usage"].get(name)) for name in (
            "prompt_tokens", "completion_tokens", "total_tokens",
        ))
        schema = "Pass" if row["items"] is not None else (
            "Fail" if row["error"] == "invalid_ai_response" else "—"
        )
        lines.append(
            f"| {case.label} | {show(row['http'])} | {schema} | {show(row['count'])} / {case.count} "
            f"| {show(row['duplicates'])} | {show(row['mappings'])} "
            f"| {show(row['truncated'])} | {row['latency']:.3f} | {tokens} | {show(row['error'])} |"
        )
    if skipped:
        lines += ["", "## Cases skipped after a credential, model access, quota, or rate-limit error", ""]
        lines.extend(f"- {case.label}" for case in skipped)
    lines += ["", "## Human review material", "", "Use the [evaluation rubric](README.md#human-review)."]
    for row in results:
        if row["items"] is None:
            continue
        case = row["case"]
        lines += ["", f"### {case.label}", "", "Reference facts", ""]
        lines.extend(f"- {fact}" for fact in case.passage.facts)
        lines += ["", "Validated output", "", "<pre>",
                  escape(json.dumps(row["items"], ensure_ascii=True, indent=2)), "</pre>"]
    return "\n".join(lines) + "\n"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--live", action="store_true", help="Authorize live Groq requests that consume quota.")
    parser.add_argument("--budget", type=int, default=MAX_REQUESTS, choices=range(1, MAX_REQUESTS + 1))
    parser.add_argument("--offset", type=int, default=0, help="Zero-based case offset for a later batch.")
    parser.add_argument("--model", default=os.getenv("AI_MODEL", "").strip() or GROQ_DEFAULT_MODEL)
    parser.add_argument("--prompt-version", choices=PROMPT_VERSIONS, default="original")
    args = parser.parse_args(argv)
    cases = evaluation_cases()
    if not 0 <= args.offset < len(cases):
        parser.error(f"--offset must be between 0 and {len(cases) - 1}")
    # Only permit model identifiers so operator input cannot inject report markup.
    if not args.model or any(not (char.isascii() and (char.isalnum() or char in "-_./")) for char in args.model):
        parser.error("--model must be a Groq model identifier")
    selected = cases[args.offset:args.offset + args.budget]
    print(f"Groq model: {args.model}\nPrompt version: {args.prompt_version}", flush=True)
    print(f"Planned requests: {len(selected)}", flush=True)
    for case in selected:
        print(f"- {case.label}", flush=True)
    if not args.live:
        print("Plan only. No requests sent.")
        return 0

    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        parser.error("GROQ_API_KEY is required for live evaluation")
    started = datetime.now(timezone.utc)
    results = []
    for case in selected:
        row = run_case(case, key, args.model, prompt_version=args.prompt_version)
        results.append(row)
        if row["http"] == 429 or row["error"] in {
            "invalid_api_key", "missing_api_key", "model_access", "rate_limited", "insufficient_quota",
        }:
            break
    path = REPORT_DIR / f"groq-{started.strftime('%Y%m%dT%H%M%S%fZ')}.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    report = render_report(
        args.model, started, results, selected[len(results):], prompt_version=args.prompt_version,
    )
    path.write_text(report, encoding="utf-8")
    print(f"Evaluation report: {path}")
    return int(any(row["error"] for row in results))


if __name__ == "__main__":
    raise SystemExit(main())
