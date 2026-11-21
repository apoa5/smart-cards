"""Validate decoded study items independently of the model provider."""


def _nonblank_string(value):
    return isinstance(value, str) and bool(value.strip())


def _validate_items(items, count, fields):
    if type(count) is not int or count not in (5, 10, 15):
        raise ValueError("Unsupported study item count")
    if not isinstance(items, list) or len(items) != count:
        raise ValueError("Expected an array with the requested number of study items")

    questions = set()
    for item in items:
        if not isinstance(item, dict) or item.keys() != fields:
            raise ValueError("Invalid study item fields")
        question = item["question"]
        if not _nonblank_string(question):
            raise ValueError("Invalid study question")
        question_key = question.strip()
        if question_key in questions:
            raise ValueError("Duplicate study question")
        questions.add(question_key)


def validate_flashcards(items, count):
    _validate_items(items, count, {"question", "answer"})
    if any(not _nonblank_string(item["answer"]) for item in items):
        raise ValueError("Invalid flashcard answer")
    return items


def validate_quiz(items, count):
    _validate_items(items, count, {"question", "options", "correct_answer"})
    for item in items:
        options = item["options"]
        if not isinstance(options, list) or len(options) != 4:
            raise ValueError("Expected four quiz options")
        if any(not _nonblank_string(option) for option in options):
            raise ValueError("Invalid quiz option")
        if len({option.strip() for option in options}) != 4:
            raise ValueError("Duplicate quiz option")
        answer = item["correct_answer"]
        if not _nonblank_string(answer) or options.count(answer) != 1:
            raise ValueError("Invalid quiz answer")
    return items
