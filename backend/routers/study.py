import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from db.insforge_client import supabase, upload_pdf_to_storage
from services.pdf_service import extract_text_from_pdf, truncate_for_claude, extract_youtube_transcript
from services.claude_service import generate_flashcards, generate_quiz_questions, generate_study_plan, generate_study_text_from_url
from services.tinyfish_service import scrape_study_content
from models.schemas import UploadResponse, StudyPlanResponse

router = APIRouter()


class URLUploadRequest(BaseModel):
    url: str
    user_id: str
    title: str
    total_days: int = 7


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    user_id: str = Form(...),
    title: str = Form(...),
    total_days: int = Form(7),
):
    """
    Upload a PDF → parse → generate flashcards, quiz, study plan → store in DB.
    Returns session_id and counts for the frontend.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    file_bytes = await file.read()

    # 1. Upload PDF to InsForge Storage
    pdf_url = upload_pdf_to_storage(file_bytes, file.filename)

    # 2. Extract text
    raw_text = extract_text_from_pdf(file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")
    text_for_claude = truncate_for_claude(raw_text)

    # 3. Create study session record
    session_id = str(uuid.uuid4())
    supabase.table("study_sessions").insert({
        "id": session_id,
        "user_id": user_id,
        "title": title,
        "pdf_url": pdf_url,
        "raw_text": raw_text[:5000],
        "total_days": total_days,
    })

    # 4. Generate content via Claude
    flashcards = generate_flashcards(text_for_claude, total_days)
    quiz_questions = generate_quiz_questions(text_for_claude, total_days)
    study_plan = generate_study_plan(text_for_claude, total_days)

    # 5. Store flashcards
    for fc in flashcards:
        supabase.table("flashcards").insert({"session_id": session_id, **fc})

    # 6. Store quiz questions
    for q in quiz_questions:
        supabase.table("quiz_questions").insert({"session_id": session_id, **q})

    # 7. Store daily plans
    for day in study_plan:
        supabase.table("daily_plans").insert({"session_id": session_id, **day})

    return UploadResponse(
        session_id=session_id,
        title=title,
        total_days=total_days,
        flashcard_count=len(flashcards),
        quiz_count=len(quiz_questions),
        pdf_url=pdf_url,
    )


@router.get("/session/{session_id}", response_model=StudyPlanResponse)
def get_session(session_id: str):
    """Fetch all generated content for a session."""
    plans = supabase.table("daily_plans").select("*").eq("session_id", session_id)\
        .order("day_number").execute().data

    flashcards = supabase.table("flashcards").select("*").eq("session_id", session_id)\
        .order("day_number").execute().data

    quizzes = supabase.table("quiz_questions").select("*").eq("session_id", session_id)\
        .order("day_number").execute().data

    if not plans:
        raise HTTPException(status_code=404, detail="Session not found.")

    return StudyPlanResponse(
        session_id=session_id,
        daily_plans=plans,
        flashcards=flashcards,
        quiz_questions=quizzes,
    )


@router.get("/session/{session_id}/day/{day_number}")
def get_day_content(session_id: str, day_number: int):
    """Fetch flashcards + quiz questions for a specific day."""
    plan = supabase.table("daily_plans").select("*")\
        .eq("session_id", session_id).eq("day_number", day_number).execute().data

    flashcards = supabase.table("flashcards").select("*")\
        .eq("session_id", session_id).eq("day_number", day_number).execute().data

    quizzes = supabase.table("quiz_questions").select("*")\
        .eq("session_id", session_id).eq("day_number", day_number).execute().data

    return {
        "day_number": day_number,
        "plan": plan[0] if plan else None,
        "flashcards": flashcards,
        "quiz_questions": quizzes,
    }


@router.post("/upload-url", response_model=UploadResponse)
def upload_from_url(req: URLUploadRequest):
    """
    Scrape a URL (YouTube, Reddit, article, docs) using TinyFish,
    then run the same Claude pipeline as PDF upload.
    """
    # Detect source type for better UX messaging
    url_lower = req.url.lower()
    if "youtube.com" in url_lower or "youtu.be" in url_lower:
        source = "YouTube"
    elif "reddit.com" in url_lower:
        source = "Reddit"
    else:
        source = "webpage"

    # For YouTube: try real transcript first, then TinyFish, then Claude fallback
    if source == "YouTube":
        raw_text = extract_youtube_transcript(req.url)
        if not raw_text:
            raw_text = scrape_study_content(req.url)
    else:
        raw_text = scrape_study_content(req.url)

    # Final fallback: Claude generates content from URL alone
    if not raw_text:
        raw_text = generate_study_text_from_url(req.url)

    text_for_claude = truncate_for_claude(raw_text)

    # Create session
    session_id = str(uuid.uuid4())
    supabase.table("study_sessions").insert({
        "id": session_id,
        "user_id": req.user_id,
        "title": req.title,
        "pdf_url": req.url,
        "raw_text": raw_text[:5000],
        "total_days": req.total_days,
    })

    # Generate via Claude
    flashcards = generate_flashcards(text_for_claude, req.total_days)
    quiz_questions = generate_quiz_questions(text_for_claude, req.total_days)
    study_plan = generate_study_plan(text_for_claude, req.total_days)

    # Store
    for fc in flashcards:
        supabase.table("flashcards").insert({"session_id": session_id, **fc})
    for q in quiz_questions:
        supabase.table("quiz_questions").insert({"session_id": session_id, **q})
    for day in study_plan:
        supabase.table("daily_plans").insert({"session_id": session_id, **day})

    return UploadResponse(
        session_id=session_id,
        title=req.title,
        total_days=req.total_days,
        flashcard_count=len(flashcards),
        quiz_count=len(quiz_questions),
        pdf_url=req.url,
    )
