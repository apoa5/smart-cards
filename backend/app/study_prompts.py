def flashcard_prompts(text, count):
    prompt = f"""
    You are a helpful study assistant. Based on the following text, generate {count} flashcards.
    Each flashcard must be in this JSON format:
    {{ "question": "...", "answer": "..." }}

    Return only a JSON array, and nothing else.

    Text:
    {text}
    """
    return "You generate flashcards from study notes.", prompt


def quiz_prompts(text, count):
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
    return "You generate multiple choice quiz questions.", prompt
