from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID


# ── Study ──────────────────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    session_id: str
    title: str
    total_days: int
    flashcard_count: int
    quiz_count: int
    pdf_url: Optional[str] = None


class Flashcard(BaseModel):
    id: Optional[str] = None
    session_id: Optional[str] = None
    front: str
    back: str
    day_number: int = 1


class QuizQuestion(BaseModel):
    id: Optional[str] = None
    session_id: Optional[str] = None
    question: str
    options: List[str]        # exactly 4 options
    correct_index: int        # 0-3
    explanation: Optional[str] = None
    day_number: int = 1


class DailyPlan(BaseModel):
    day_number: int
    topic: str
    summary: str
    key_concepts: List[str]


class StudyPlanResponse(BaseModel):
    session_id: str
    daily_plans: List[DailyPlan]
    flashcards: List[Flashcard]
    quiz_questions: List[QuizQuestion]


# ── Progress ───────────────────────────────────────────────────────────────

class LogProgressRequest(BaseModel):
    user_id: str
    session_id: str
    day_number: int
    review_done: bool = False
    quiz_done: bool = False
    accuracy: Optional[float] = None   # 0.0 – 100.0


class StreakResponse(BaseModel):
    user_id: str
    session_id: str
    current_streak: int
    longest_streak: int
    total_days_completed: int
    average_accuracy: float
    last_activity_date: Optional[str] = None


# ── GoalGuard ──────────────────────────────────────────────────────────────

class GoalGuardCheckRequest(BaseModel):
    user_id: str
    url: str
    domain: str
    page_title: Optional[str] = None
    user_goals: List[str]              # e.g. ["coding", "job applications"]


class GoalGuardResponse(BaseModel):
    classification: str                # "productive" | "distraction" | "neutral"
    should_nudge: bool
    nudge_message: Optional[str] = None
    redirect_suggestion: Optional[str] = None
