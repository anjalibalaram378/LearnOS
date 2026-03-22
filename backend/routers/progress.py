from datetime import date, timedelta
from fastapi import APIRouter, HTTPException
from db.insforge_client import supabase
from models.schemas import LogProgressRequest, StreakResponse

router = APIRouter()


@router.post("/log")
def log_progress(req: LogProgressRequest):
    """
    Log a user's daily goal completion.
    Updates streak automatically.
    """
    today = date.today().isoformat()

    # Upsert goal completion
    supabase.table("goal_completions").upsert({
        "user_id": req.user_id,
        "session_id": req.session_id,
        "day_number": req.day_number,
        "review_done": req.review_done,
        "quiz_done": req.quiz_done,
        "accuracy": req.accuracy,
        "completed_at": today,
    }, on_conflict="user_id,session_id,day_number").execute()

    # Update streak
    _update_streak(req.user_id, req.session_id, req.accuracy or 0.0)

    return {"status": "logged", "day": req.day_number}


def _update_streak(user_id: str, session_id: str, accuracy: float):
    today = date.today()
    yesterday = (today - timedelta(days=1)).isoformat()
    today_str = today.isoformat()

    existing = supabase.table("streaks").select("*")\
        .eq("user_id", user_id).eq("session_id", session_id).execute().data

    if not existing:
        supabase.table("streaks").insert({
            "user_id": user_id,
            "session_id": session_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_activity_date": today_str,
            "total_days_completed": 1,
            "average_accuracy": accuracy,
        }).execute()
        return

    row = existing[0]
    last = row.get("last_activity_date", "")

    # Already logged today — no change
    if last == today_str:
        return

    # Continuing streak
    if last == yesterday:
        new_streak = row["current_streak"] + 1
    else:
        new_streak = 1

    total = row["total_days_completed"] + 1
    new_avg = ((row["average_accuracy"] * row["total_days_completed"]) + accuracy) / total

    supabase.table("streaks").update({
        "current_streak": new_streak,
        "longest_streak": max(new_streak, row["longest_streak"]),
        "last_activity_date": today_str,
        "total_days_completed": total,
        "average_accuracy": round(new_avg, 2),
    }).eq("user_id", user_id).eq("session_id", session_id).execute()


@router.get("/streak/{user_id}/{session_id}", response_model=StreakResponse)
def get_streak(user_id: str, session_id: str):
    data = supabase.table("streaks").select("*")\
        .eq("user_id", user_id).eq("session_id", session_id).execute().data

    if not data:
        return StreakResponse(
            user_id=user_id,
            session_id=session_id,
            current_streak=0,
            longest_streak=0,
            total_days_completed=0,
            average_accuracy=0.0,
        )

    row = data[0]
    return StreakResponse(
        user_id=user_id,
        session_id=session_id,
        current_streak=row["current_streak"],
        longest_streak=row["longest_streak"],
        total_days_completed=row["total_days_completed"],
        average_accuracy=row["average_accuracy"],
        last_activity_date=row.get("last_activity_date"),
    )


@router.get("/history/{user_id}/{session_id}")
def get_history(user_id: str, session_id: str):
    """Return all daily completions for a user+session (for calendar/heatmap)."""
    data = supabase.table("goal_completions").select("*")\
        .eq("user_id", user_id).eq("session_id", session_id)\
        .order("day_number").execute().data
    return {"completions": data}


def _build_player_stats(user_id: str, session_id: str) -> dict:
    """Build the per-player stats object Person 3's leaderboard UI expects."""
    # User name
    user_data = supabase.table("users").select("name").eq("id", user_id).execute().data
    name = user_data[0]["name"] if user_data else "Unknown"

    # Session total_days
    session_data = supabase.table("study_sessions").select("total_days")\
        .eq("id", session_id).execute().data
    total_days = session_data[0]["total_days"] if session_data else 7

    # Streak + accuracy
    streak_data = supabase.table("streaks").select("*")\
        .eq("user_id", user_id).eq("session_id", session_id).execute().data
    streak_row = streak_data[0] if streak_data else {}

    current_streak = streak_row.get("current_streak", 0)
    average_accuracy = streak_row.get("average_accuracy", 0)
    total_days_completed = streak_row.get("total_days_completed", 0)

    # Daily completions
    completions = supabase.table("goal_completions").select("*")\
        .eq("user_id", user_id).eq("session_id", session_id)\
        .order("day_number").execute().data

    # dailyLog: true if review_done AND quiz_done for that day
    completion_map = {row["day_number"]: row for row in completions}
    daily_log = []
    for day in range(1, total_days + 1):
        row = completion_map.get(day)
        daily_log.append(bool(row and row.get("review_done") and row.get("quiz_done")))

    # goalsHit = days where both goals done; totalGoals = total_days
    goals_hit = sum(1 for v in daily_log if v)
    total_goals = total_days

    # progress = % of days completed out of total_days
    progress = round((total_days_completed / total_days) * 100) if total_days else 0

    return {
        "name": name,
        "accuracy": round(average_accuracy),
        "streak": current_streak,
        "progress": progress,
        "goalsHit": goals_hit,
        "totalGoals": total_goals,
        "dailyLog": daily_log,
    }


@router.get("/player/{user_id}/{session_id}")
def get_player_stats(user_id: str, session_id: str):
    """Single player stats — exact shape Person 3's UI needs."""
    return _build_player_stats(user_id, session_id)


@router.get("/leaderboard/{session_id}")
def get_leaderboard(session_id: str):
    """
    All players in a session ranked by accuracy.
    Returns list of player stat objects — ready for Person 3's leaderboard UI.
    """
    # Get all unique participants via streaks table
    streak_rows = supabase.table("streaks").select("user_id")\
        .eq("session_id", session_id).execute().data

    players = [_build_player_stats(row["user_id"], session_id) for row in streak_rows]

    # Sort: accuracy desc, then streak desc
    players.sort(key=lambda p: (p["accuracy"], p["streak"]), reverse=True)
    return {"leaderboard": players}
