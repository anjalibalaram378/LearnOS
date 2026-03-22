import re
import pdfplumber
import io
from typing import Optional


def extract_youtube_transcript(url: str) -> Optional[str]:
    """Extract transcript from a YouTube video URL. Returns plain text or None."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled

        # Extract video ID from URL
        match = re.search(r'(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})', url)
        if not match:
            return None
        video_id = match.group(1)

        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join(entry["text"] for entry in transcript_list)
        return full_text if len(full_text) > 100 else None
    except Exception:
        return None


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF given its raw bytes."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts)


def truncate_for_claude(text: str, max_chars: int = 40000) -> str:
    """Truncate text to stay within Claude's practical input limit."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n\n[Content truncated for processing...]"
