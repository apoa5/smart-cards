import unittest

from app.study_output import validate_flashcards, validate_quiz


def study_items(kind, count=5):
    items = [{"question": f"Question {number}?"} for number in range(count)]
    for item in items:
        if kind == "flashcards":
            item["answer"] = "Answer"
        else:
            item.update(options=["A", "B", "C", "D"], correct_answer="B")
    return items


VALIDATORS = {"flashcards": validate_flashcards, "quiz": validate_quiz}


class StudyOutputTests(unittest.TestCase):
    def test_valid_outputs_are_preserved_for_each_count(self):
        for kind, validate in VALIDATORS.items():
            for count in (5, 10, 15):
                with self.subTest(kind=kind, count=count):
                    items = study_items(kind, count)
                    items[0]["question"] = "  Question with padding? "
                    self.assertIs(validate(items, count), items)
                    self.assertEqual(items[0]["question"], "  Question with padding? ")

    def test_invalid_top_level_shape_or_count(self):
        for kind, validate in VALIDATORS.items():
            for value in (None, {}, "", True, [], study_items(kind, 4), study_items(kind, 6)):
                with self.subTest(kind=kind, value=value), self.assertRaises(ValueError):
                    validate(value, 5)
            for count in (True, 4, 5.0, "5"):
                with self.subTest(kind=kind, count=count), self.assertRaises(ValueError):
                    validate(study_items(kind), count)

    def test_invalid_items_and_questions(self):
        for kind, validate in VALIDATORS.items():
            items = study_items(kind)
            for item in (None, [], "Question?", {}, {**items[0], "extra": "value"}):
                with self.subTest(kind=kind, item=item), self.assertRaises(ValueError):
                    validate([item, *items[1:]], 5)
            for question in (None, 42, "", " \t\n", f" {items[1]['question']} "):
                with self.subTest(kind=kind, question=question), self.assertRaises(ValueError):
                    validate([{**items[0], "question": question}, *items[1:]], 5)

    def test_invalid_flashcard_answers(self):
        items = study_items("flashcards")
        invalid_cards = [{"question": items[0]["question"]}]
        invalid_cards.extend({**items[0], "answer": value} for value in (None, 42, [], "", " \n"))
        for card in invalid_cards:
            with self.subTest(card=card), self.assertRaises(ValueError):
                validate_flashcards([card, *items[1:]], 5)

    def test_invalid_quiz_options(self):
        items = study_items("quiz")
        for options in (
            None, "ABCD", ("A", "B", "C", "D"), ["A", "B", "C"],
            ["A", "B", "C", "D", "E"], ["A", "B", "C", None], ["A", "B", "C", 4],
            ["A", "B", "C", " "], ["A", "B", "C", "B"], ["A", "B", "C", " B "],
        ):
            with self.subTest(options=options), self.assertRaises(ValueError):
                validate_quiz([{**items[0], "options": options}, *items[1:]], 5)
        for field in ("options", "correct_answer"):
            item = items[0].copy()
            del item[field]
            with self.subTest(missing=field), self.assertRaises(ValueError):
                validate_quiz([item, *items[1:]], 5)

    def test_invalid_quiz_answer_mapping(self):
        items = study_items("quiz")
        for answer in (None, False, [], " ", "E", "b", " B "):
            with self.subTest(answer=answer), self.assertRaises(ValueError):
                validate_quiz([{**items[0], "correct_answer": answer}, *items[1:]], 5)
