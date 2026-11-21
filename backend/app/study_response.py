import json
import re


def decode_study_response(content):
    if not isinstance(content, str):
        raise ValueError("Expected AI response text")
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```json\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()
    try:
        return json.loads(content)
    except RecursionError:
        raise ValueError("AI response JSON is nested too deeply") from None
