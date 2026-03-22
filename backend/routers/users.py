import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.insforge_client import supabase

router = APIRouter()


class CreateUserRequest(BaseModel):
    email: str
    name: str


@router.post("/")
def create_user(req: CreateUserRequest):
    user_id = str(uuid.uuid4())
    result = supabase.table("users").insert({
        "id": user_id,
        "email": req.email,
        "name": req.name,
    }).execute()
    return {"user_id": user_id, "name": req.name, "email": req.email}


@router.get("/{email}")
def get_user_by_email(email: str):
    data = supabase.table("users").select("*").eq("email", email).execute().data
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return data[0]
