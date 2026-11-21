"""Run one explicitly authorized Groq request with synthetic study notes."""

import argparse
import os

from app.ai import generate_flashcards, generate_quiz_questions
from app.ai_errors import GenerationError
from app.ai_provider import create_provider


NOTES = (
    "A triangle has three sides. An equilateral triangle has three equal sides. "
    "A right triangle has a 90-degree angle. A rectangle has four right angles. "
    "A square is a rectangle with four equal sides. A pentagon has five sides. "
    "A hexagon has six sides. A polygon is a closed shape formed by line segments."
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=("flashcards", "quiz"))
    parser.add_argument("--live", action="store_true", help="Authorize one request that may consume quota.")
    args = parser.parse_args()
    if not args.live:
        parser.error("--live is required to authorize a network request")
    if os.getenv("AI_PROVIDER", "").strip() != "groq":
        parser.error("Set AI_PROVIDER=groq before running this command")

    generate = generate_flashcards if args.kind == "flashcards" else generate_quiz_questions
    try:
        items = generate(NOTES, count=5, provider=create_provider())
    except GenerationError as error:
        parser.exit(1, f"Groq smoke test failed ({error.code}).\n")
    print(f"Groq returned {len(items)} validated {args.kind} items.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
