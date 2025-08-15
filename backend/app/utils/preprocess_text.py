import re

def clean_text(text):
    """
    Removes excessive whitespace, line breaks, and non-informative characters.
    """
    text = re.sub(r'\s+', ' ', text)  # collapse all whitespace
    return text.strip()

def remove_repeated_lines(text):
    """
    Removes repeated lines like headers/footers.
    """
    lines = text.split('\n')
    seen = set()
    result = []

    for line in lines:
        line = line.strip()
        if line and line not in seen:
            seen.add(line)
            result.append(line)

    return ' '.join(result)

def trim_text_by_words(text, max_words=2000):
    """
    Trims the text to a max number of words.
    """
    words = text.split()
    if len(words) > max_words:
        words = words[:max_words]
    return ' '.join(words)

def split_by_sections(text):
    """
    Optionally splits and prioritizes sections like Introduction, Chapter, Summary, etc.
    """
    sections = re.split(r'(Chapter\s+\d+|Section\s+\d+|Introduction|Summary)', text, flags=re.IGNORECASE)
    prioritized = []

    for i in range(0, len(sections), 2):
        heading = sections[i].strip()
        body = sections[i+1].strip() if i+1 < len(sections) else ''
        if heading.lower() in ["introduction", "summary"] or "chapter" in heading.lower():
            prioritized.append(f"{heading} {body}")

    return ' '.join(prioritized) if prioritized else text

def preprocess_text(raw_text, max_words=2000):
    """
    Full preprocessing pipeline.
    """
    cleaned = clean_text(raw_text)
    deduped = remove_repeated_lines(cleaned)
    important_sections = split_by_sections(deduped)
    trimmed = trim_text_by_words(important_sections, max_words=max_words)
    return trimmed
