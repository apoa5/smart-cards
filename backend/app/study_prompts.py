PROMPT_VERSIONS = ("original", "revised")

_SOURCE_GUIDANCE = (
    "Use only the supplied study text. The passage must support every question's "
    "premise and correct answer. Preserve its conditions and qualifiers, and "
    "avoid outside facts or unstated assumptions. Cover distinct important concepts "
    "before revisiting any topic. Avoid duplicate or near-duplicate questions. "
    "For short passages, use different supported relationships, comparisons, or "
    "applications to reach the requested count without inventing facts."
)

_QUIZ_GUIDANCE = (
    "Write clear questions with exactly one defensibly correct option under the "
    "stated conditions. Use plausible distractors from the same category as the "
    "answer that are distinct in meaning and clearly incorrect given the passage. "
    "Avoid obvious filler and equivalent options. Copy the correct option "
    "verbatim into correct_answer."
)


def _system_prompt(original, version, guidance):
    if version == "original":
        return original
    if version == "revised":
        return f"{original} {_SOURCE_GUIDANCE} {guidance}"
    raise ValueError("Unknown study prompt version")


def flashcard_prompts(text, count, *, version="original"):
    prompt = f"""
    You are a helpful study assistant. Based on the following text, generate {count} flashcards.
    Each flashcard must be in this JSON format:
    {{ "question": "...", "answer": "..." }}

    Return only a JSON array, and nothing else.

    Text:
    {text}
    """
    system = _system_prompt(
        "You generate flashcards from study notes.", version,
        "Write one clear question per card with a concise, self-contained answer.",
    )
    return system, prompt


def quiz_prompts(text, count, *, version="original"):
    prompt = f"""
    You are a helpful quiz generator. Based on the following text, generate {count} multiple choice questions.
    Each question must include:
    - a "question" field
    - four "options" (as a list)
    - a "correct_answer" field

    Return only a JSON array.

    Text:
    {text}
    """
    system = _system_prompt(
        "You generate multiple choice quiz questions.", version, _QUIZ_GUIDANCE,
    )
    return system, prompt
