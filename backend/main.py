from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import study, progress, goalguard, users

app = FastAPI(title="GoalGuard + StudyApp API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(study.router, prefix="/study", tags=["Study"])
app.include_router(progress.router, prefix="/progress", tags=["Progress"])
app.include_router(goalguard.router, prefix="/goalguard", tags=["GoalGuard"])


@app.get("/health")
def health():
    return {"status": "ok"}
