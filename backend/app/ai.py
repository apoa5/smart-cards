import os
import re
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_flashcards(text, count=5):
    prompt = f"""
    You are a helpful study assistant. Based on the following text, generate {count} flashcards. 
    Each flashcard must be in this JSON format:
    {{ "question": "...", "answer": "..." }}

    Return only a JSON array, and nothing else.

    Text:
    {text}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate flashcards from study notes."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        content = response.choices[0].message.content.strip()
        print("Raw OpenAI response (flashcards):", content)

        # Clean up markdown formatting if present
        if content.startswith("```"):
            content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()

        flashcards = json.loads(content)
        return flashcards

    except Exception as e:
        print("OpenAI error (flashcards):", e)
        return []


def generate_quiz_questions(text, count=5):
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

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You generate multiple choice quiz questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )

        content = response.choices[0].message.content.strip()
        print("Raw OpenAI response (quiz):", content)

        if content.startswith("```"):
            content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()

        quiz = json.loads(content)
        return quiz

    except Exception as e:
        print("OpenAI error (quiz):", e)
        return []
