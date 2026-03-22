import os
import json
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-sonnet-4-6"


def _ask(prompt: str) -> str:
    msg = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


# ── Flashcards ─────────────────────────────────────────────────────────────

def generate_flashcards(text: str, total_days: int = 7) -> list[dict]:
    """
    Returns a list of {front, back, day_number} dicts.
    Targets ~5 flashcards per day.
    """
    count = total_days * 5
    prompt = f"""You are a study assistant. Given the following study material, generate exactly {count} flashcards.

Distribute them evenly across {total_days} days (day_number 1 to {total_days}).
Each flashcard tests one key concept from the material.

Return ONLY a valid JSON array with this exact structure — no markdown, no explanation:
[
  {{"front": "Question or term", "back": "Answer or definition", "day_number": 1}},
  ...
]

STUDY MATERIAL:
{text}"""

    raw = _ask(prompt)
    # Strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── Quiz Questions ──────────────────────────────────────────────────────────

def generate_quiz_questions(text: str, total_days: int = 7) -> list[dict]:
    """
    Returns a list of {question, options, correct_index, explanation, day_number} dicts.
    Targets ~3 questions per day.
    """
    count = total_days * 3
    prompt = f"""You are a study assistant. Given the following study material, generate exactly {count} multiple-choice quiz questions.

Distribute them evenly across {total_days} days (day_number 1 to {total_days}).
Each question must have exactly 4 options and one correct answer.

Return ONLY a valid JSON array with this exact structure — no markdown, no explanation:
[
  {{
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Brief explanation of why this is correct.",
    "day_number": 1
  }},
  ...
]

STUDY MATERIAL:
{text}"""

    raw = _ask(prompt)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── Daily Study Plan ────────────────────────────────────────────────────────

def generate_study_plan(text: str, total_days: int = 7) -> list[dict]:
    """
    Returns a list of {day_number, topic, summary, key_concepts} dicts.
    """
    prompt = f"""You are a study assistant. Given the following study material, create a {total_days}-day study plan.

Break the material into logical topics, one per day.
Each day should be achievable in ~30-60 minutes of focused study.

Return ONLY a valid JSON array with this exact structure — no markdown, no explanation:
[
  {{
    "day_number": 1,
    "topic": "Topic title",
    "summary": "2-3 sentence description of what to study today.",
    "key_concepts": ["concept 1", "concept 2", "concept 3"]
  }},
  ...
]

STUDY MATERIAL:
{text}"""

    raw = _ask(prompt)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


# ── URL Content Fallback ─────────────────────────────────────────────────────

def generate_study_text_from_url(url: str) -> str:
    """
    Fallback when TinyFish cannot scrape a URL.
    Ask Claude to generate study-worthy content based on the URL alone.
    Returns plain text suitable for flashcard/quiz generation.
    """
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        context = "a YouTube video"
        instruction = "Summarize what this video is likely about based on its URL, and generate comprehensive educational content covering the topic."
    elif "reddit.com" in url_lower:
        context = "a Reddit post or discussion"
        instruction = "Based on the URL, generate educational content covering the topic being discussed."
    else:
        context = "a webpage or article"
        instruction = "Based on the URL, generate educational content covering the likely topic of this page."

    prompt = f"""A user wants to study from {context}: {url}

{instruction}

Generate at least 800 words of rich, educational study material on this topic.
Include: key concepts, definitions, important facts, and practical examples.
Write as if you are a knowledgeable tutor explaining this subject.
Return plain text only — no JSON, no markdown headers."""

    return _ask(prompt)


# ── GoalGuard AI Classification ─────────────────────────────────────────────

def classify_activity(domain: str, page_title: str, user_goals: list[str]) -> dict:
    """
    Returns {classification, nudge_message, redirect_suggestion}.
    classification: "productive" | "distraction" | "neutral"
    """
    goals_str = ", ".join(user_goals)
    prompt = f"""You are GoalGuard, a productivity assistant. A user with goals [{goals_str}] is visiting:

Domain: {domain}
Page title: {page_title or "unknown"}

Classify this activity as one of:
- "productive"  — directly supports their goals
- "distraction" — unrelated or counterproductive
- "neutral"     — ambiguous (e.g. checking email briefly)

If it's a distraction, write a short, friendly nudge message (1 sentence) and suggest a specific redirect resource.

Return ONLY valid JSON — no markdown, no explanation:
{{
  "classification": "productive|distraction|neutral",
  "nudge_message": "You planned to study — want to get back on track?",
  "redirect_suggestion": "https://leetcode.com"
}}"""

    raw = _ask(prompt)
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
