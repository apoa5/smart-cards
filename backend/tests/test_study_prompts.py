import json
import unittest
from unittest.mock import Mock

from app.ai import generate_flashcards, generate_quiz_questions
from app.ai_errors import GenerationError
from app.study_prompts import flashcard_prompts, quiz_prompts
from test_study_output import study_items


class StudyPromptTests(unittest.TestCase):
    def test_revised_prompts_keep_the_original_request_and_add_grounding_rules(self):
        for build, original_system, item_type, fields in (
            (flashcard_prompts, "You generate flashcards from study notes.",
             "flashcards", ('"question"', '"answer"')),
            (quiz_prompts, "You generate multiple choice quiz questions.",
             "multiple choice questions", ('"question"', '"options"', '"correct_answer"')),
        ):
            for count in (5, 10, 15):
                with self.subTest(item_type=item_type, count=count):
                    source = "Synthetic source text."
                    self.assertEqual(build(source, count), build(source, count, version="original"))
                    system, request = build(source, count)
                    revised_system, revised_request = build(source, count, version="revised")
                    self.assertEqual(system, original_system)
                    self.assertEqual(revised_request, request)
                    self.assertIn(f"generate {count} {item_type}", request)
                    self.assertIn("Return only a JSON array", request)
                    self.assertIn(source, request)
                    for field in fields:
                        self.assertIn(field, request)
                    for guidance in (
                        "Use only the supplied study text", "premise and correct answer",
                        "conditions and qualifiers", "outside facts or unstated assumptions",
                        "distinct important concepts", "duplicate or near-duplicate",
                    ):
                        self.assertIn(guidance, revised_system)

    def test_revised_quiz_demands_one_answer_and_meaningfully_distinct_distractors(self):
        instructions, request = quiz_prompts("Synthetic source text.", 5, version="revised")
        self.assertIn('four "options"', request)
        for guidance in (
            "exactly one defensibly correct option", "plausible distractors",
            "same category as the answer", "distinct in meaning", "clearly incorrect",
            "Copy the correct option verbatim into correct_answer",
        ):
            self.assertIn(guidance, instructions)

    def test_revised_generation_uses_existing_output_validation(self):
        for generate, kind in (
            (generate_flashcards, "flashcards"),
            (generate_quiz_questions, "quiz"),
        ):
            with self.subTest(kind=kind):
                items = study_items(kind, 5)
                provider = Mock(spec=["complete"])
                provider.complete.return_value = json.dumps(items)
                self.assertEqual(generate("Synthetic source text.", provider=provider,
                                          prompt_version="revised"), items)
                self.assertIn("Use only the supplied study text", provider.complete.call_args.args[0])
                provider.complete.return_value = json.dumps(items[:-1])
                with self.assertRaises(GenerationError) as error:
                    generate("Synthetic source text.", provider=provider, prompt_version="revised")
                self.assertEqual(error.exception.code, "invalid_ai_response")
