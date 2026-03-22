import os
import json
import httpx
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

TINYFISH_API_KEY = os.getenv("TINYFISH_API_KEY")
TINYFISH_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"


def _parse_sse_stream(response_text: str) -> dict:
    """
    Parse SSE stream and return the last 'data' payload that contains a result.
    TinyFish streams events; we want the final completion event.
    """
    result = {}
    for line in response_text.splitlines():
        if line.startswith("data:"):
            raw = line[5:].strip()
            if raw and raw != "[DONE]":
                try:
                    payload = json.loads(raw)
                    # Keep updating — last meaningful payload wins
                    if payload:
                        result = payload
                except json.JSONDecodeError:
                    pass
    return result


def scrape_page_context(url: str, goal: str, timeout: int = 30) -> dict:
    """
    Ask TinyFish to visit a URL and extract context relevant to `goal`.
    Returns a dict with whatever TinyFish extracted.
    Falls back to empty dict on failure (we degrade gracefully to domain-based check).
    """
    if not TINYFISH_API_KEY or TINYFISH_API_KEY == "your-tinyfish-api-key-here":
        return {}

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(
                TINYFISH_URL,
                headers={
                    "X-API-Key": TINYFISH_API_KEY,
                    "Content-Type": "application/json",
                },
                json={"url": url, "goal": goal},
            )
            if response.status_code != 200:
                return {}
            return _parse_sse_stream(response.text)
    except Exception:
        return {}


def classify_url_content(url: str, user_goals: list[str]) -> Optional[Dict[str, Any]]:
    """
    Use TinyFish to visit a URL and determine if it is productive or a distraction
    relative to user_goals.

    Returns:
        {
          "is_productive": bool,
          "content_type": str,   e.g. "coding tutorial", "entertainment", ...
          "reason": str
        }
    or None if TinyFish is unavailable.
    """
    goals_str = ", ".join(user_goals)
    goal_prompt = (
        f"Visit this page and determine: is the content productive for someone whose goals are [{goals_str}]? "
        "Extract: (1) what type of content this is, (2) whether it supports these goals, (3) a one-sentence reason. "
        "Return JSON: {\"is_productive\": true/false, \"content_type\": \"...\", \"reason\": \"...\"}"
    )

    result = scrape_page_context(url, goal_prompt)
    if not result:
        return None

    # TinyFish may return result in different shapes — try to find our JSON
    # Check common response keys
    for key in ("result", "output", "data", "content", "text"):
        val = result.get(key)
        if isinstance(val, dict) and "is_productive" in val:
            return val
        if isinstance(val, str):
            try:
                parsed = json.loads(val)
                if "is_productive" in parsed:
                    return parsed
            except json.JSONDecodeError:
                pass

    # If result itself has the fields
    if "is_productive" in result:
        return result

    return None


def scrape_study_content(url: str) -> Optional[str]:
    """
    Use TinyFish to visit any URL (YouTube, Reddit, article, docs)
    and extract the full study-worthy text content.
    Returns plain text string or None on failure.
    """
    if not TINYFISH_API_KEY or TINYFISH_API_KEY == "your-tinyfish-api-key-here":
        return None

    # Detect URL type and craft appropriate extraction prompt
    url_lower = url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        goal_prompt = (
            "Visit this YouTube video page. Extract: "
            "1) The full video title, "
            "2) The complete video description, "
            "3) Any transcript or auto-generated captions if visible, "
            "4) Key topics and concepts mentioned. "
            "Return all extracted text as plain text, as detailed as possible."
        )
        timeout = 45
    elif "reddit.com" in url_lower:
        goal_prompt = (
            "Visit this Reddit post. Extract: "
            "1) The post title, "
            "2) The full post body text, "
            "3) The top 10 most upvoted comments with their full text. "
            "Return all extracted text as plain text."
        )
        timeout = 30
    else:
        goal_prompt = (
            "Visit this webpage and extract all the main educational content. "
            "Include: headings, paragraphs, lists, code snippets, and key concepts. "
            "Ignore navigation menus, ads, and footers. "
            "Return the full educational text content as plain text."
        )
        timeout = 30

    result = scrape_page_context(url, goal_prompt, timeout=timeout)
    if not result:
        return None

    # Extract text from various possible response shapes
    for key in ("result", "output", "content", "text", "data", "extracted_text"):
        val = result.get(key)
        if isinstance(val, str) and len(val) > 100:
            return val

    # If result is a flat string-like structure
    if isinstance(result, str) and len(result) > 100:
        return result

    # Last resort — join all string values
    all_text = " ".join(str(v) for v in result.values() if isinstance(v, str))
    return all_text if len(all_text) > 100 else None


def find_study_resource(topic: str, goal: str) -> Optional[str]:
    """
    Use TinyFish to find the best current resource for a study topic.
    e.g. find a LeetCode problem for 'binary search', or a Coursera course for 'AWS Lambda'.
    Returns a URL string or None.
    """
    if not TINYFISH_API_KEY or TINYFISH_API_KEY == "your-tinyfish-api-key-here":
        return None

    site_map = {
        "coding": "leetcode.com",
        "dsa": "leetcode.com",
        "system design": "github.com/donnemartin/system-design-primer",
        "aws": "aws.amazon.com/training",
        "job applications": "linkedin.com/jobs",
        "networking": "linkedin.com",
    }
    target_site = site_map.get(goal.lower(), "coursera.org")
    url = f"https://{target_site}"
    scrape_goal = f"Find the best resource or problem for the topic: '{topic}'. Return just the direct URL."

    result = scrape_page_context(url, scrape_goal, timeout=20)
    for key in ("result", "output", "url", "link"):
        val = result.get(key)
        if isinstance(val, str) and val.startswith("http"):
            return val

    return url  # fall back to site homepage
