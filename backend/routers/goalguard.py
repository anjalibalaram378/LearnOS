from typing import Optional
from fastapi import APIRouter
from db.insforge_client import supabase
from services.claude_service import classify_activity
from services.tinyfish_service import classify_url_content
from models.schemas import GoalGuardCheckRequest, GoalGuardResponse

router = APIRouter()

# ── Domain lists ────────────────────────────────────────────────────────────

PRODUCTIVE_DOMAINS = {
    "leetcode.com", "hackerrank.com", "codeforces.com", "geeksforgeeks.org",
    "github.com", "stackoverflow.com", "docs.python.org", "developer.mozilla.org",
    "linkedin.com", "coursera.org", "udemy.com", "khanacademy.org",
    "mit.edu", "arxiv.org", "medium.com", "dev.to",
    "aws.amazon.com/training", "learn.microsoft.com", "cloud.google.com/learn",
}

# Domains where the content matters more than the domain itself.
# e.g. a coding tutorial on YouTube is productive; a gaming stream is not.
DEEP_CHECK_DOMAINS = {
    "youtube.com", "reddit.com", "medium.com", "twitter.com", "x.com",
}

DISTRACTION_DOMAINS = {
    "twitter.com", "x.com", "instagram.com", "tiktok.com", "facebook.com",
    "reddit.com", "youtube.com", "netflix.com", "twitch.tv", "discord.com",
    "snapchat.com", "pinterest.com", "buzzfeed.com", "9gag.com",
}

# Goal → suggested redirect
GOAL_REDIRECTS = {
    "coding": "https://leetcode.com",
    "coding practice": "https://leetcode.com",
    "dsa": "https://leetcode.com",
    "job applications": "https://linkedin.com/jobs",
    "networking": "https://linkedin.com",
    "studying": "https://coursera.org",
    "system design": "https://github.com/donnemartin/system-design-primer",
    "aws": "https://aws.amazon.com/training",
    "certification": "https://coursera.org",
}

NUDGE_TEMPLATES = {
    "twitter.com": "Heads up — you're on Twitter. Back to your goals?",
    "instagram.com": "Instagram can wait. You've got goals to crush today.",
    "tiktok.com": "TikTok time adds up fast. Want to refocus?",
    "youtube.com": "Is this YouTube session tied to your goals?",
    "netflix.com": "Netflix mode: off. Goal mode: on?",
    "reddit.com": "Reddit rabbit hole detected. Want to get back on track?",
}


def _get_redirect(user_goals: list[str]) -> str:
    for goal in user_goals:
        key = goal.lower().strip()
        if key in GOAL_REDIRECTS:
            return GOAL_REDIRECTS[key]
    return "https://leetcode.com"


@router.post("/check", response_model=GoalGuardResponse)
def check_activity(req: GoalGuardCheckRequest):
    """
    Fast rule-based check first, Claude fallback for ambiguous domains.
    Logs every event to DB.
    """
    domain = req.domain.lower().replace("www.", "")

    # Rule-based: productive
    if domain in PRODUCTIVE_DOMAINS:
        _log_event(req, "productive", None)
        return GoalGuardResponse(classification="productive", should_nudge=False)

    # Deep-check domains: use TinyFish to read the actual page content
    # (e.g. YouTube coding tutorial = productive; gaming stream = distraction)
    if domain in DEEP_CHECK_DOMAINS and req.url:
        tf_result = classify_url_content(req.url, req.user_goals)
        if tf_result is not None:
            is_productive = tf_result.get("is_productive", False)
            content_type = tf_result.get("content_type", domain)
            reason = tf_result.get("reason", "")
            if is_productive:
                _log_event(req, "productive", None)
                return GoalGuardResponse(classification="productive", should_nudge=False)
            else:
                nudge = f"This looks like {content_type}. {reason} Want to refocus?"
                redirect = _get_redirect(req.user_goals)
                _log_event(req, "distraction", nudge)
                return GoalGuardResponse(
                    classification="distraction",
                    should_nudge=True,
                    nudge_message=nudge,
                    redirect_suggestion=redirect,
                )
        # TinyFish unavailable — fall through to rule-based

    # Rule-based: distraction
    if domain in DISTRACTION_DOMAINS:
        nudge = NUDGE_TEMPLATES.get(domain, f"You're on {domain}. Want to refocus on your goals?")
        redirect = _get_redirect(req.user_goals)
        _log_event(req, "distraction", nudge)
        return GoalGuardResponse(
            classification="distraction",
            should_nudge=True,
            nudge_message=nudge,
            redirect_suggestion=redirect,
        )

    # Fully ambiguous — ask Claude with page title context
    result = classify_activity(domain, req.page_title or "", req.user_goals)
    classification = result.get("classification", "neutral")
    nudge = result.get("nudge_message") if classification == "distraction" else None
    redirect = result.get("redirect_suggestion") if classification == "distraction" else None

    _log_event(req, classification, nudge)
    return GoalGuardResponse(
        classification=classification,
        should_nudge=(classification == "distraction"),
        nudge_message=nudge,
        redirect_suggestion=redirect,
    )


def _log_event(req: GoalGuardCheckRequest, classification: str, nudge: Optional[str]):
    supabase.table("goalguard_events").insert({
        "user_id": req.user_id,
        "domain": req.domain,
        "url": req.url,
        "classification": classification,
        "user_goals": req.user_goals,
        "nudge_message": nudge,
    }).execute()


@router.get("/events/{user_id}")
def get_events(user_id: str, limit: int = 50):
    """Return recent GoalGuard events for a user (for dashboard stats)."""
    data = supabase.table("goalguard_events").select("*")\
        .eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute().data
    return {"events": data}


@router.get("/stats/{user_id}")
def get_stats(user_id: str):
    """Distraction vs productive breakdown for dashboard."""
    data = supabase.table("goalguard_events").select("classification")\
        .eq("user_id", user_id).execute().data

    counts = {"productive": 0, "distraction": 0, "neutral": 0}
    for row in data:
        c = row.get("classification", "neutral")
        counts[c] = counts.get(c, 0) + 1

    total = sum(counts.values()) or 1
    return {
        "total": total,
        "productive": counts["productive"],
        "distraction": counts["distraction"],
        "neutral": counts["neutral"],
        "focus_score": round((counts["productive"] / total) * 100, 1),
    }
