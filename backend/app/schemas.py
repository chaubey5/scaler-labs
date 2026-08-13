from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

# --- Questions ---
class QuestionBase(BaseModel):
    type: str
    title: str
    description: Optional[str] = None
    is_required: bool = False
    order_index: int
    options: Optional[List[Any]] = None

class QuestionCreate(QuestionBase):
    pass

class Question(QuestionBase):
    id: str
    form_id: str

    class Config:
        from_attributes = True

# --- Forms ---
class FormBase(BaseModel):
    title: str
    status: str = "draft"

class FormCreate(FormBase):
    workspace_id: Optional[str] = None

class Form(FormBase):
    id: str
    creator_id: str
    workspace_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    questions: List[Question] = []

    class Config:
        from_attributes = True

class FormUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    questions: Optional[List[QuestionCreate]] = None
    workspace_id: Optional[str] = None

# --- Responses ---
class AnswerCreate(BaseModel):
    question_id: str
    value: str

class ResponseCreate(BaseModel):
    answers: List[AnswerCreate]

class AnswerOutput(BaseModel):
    id: str
    question_id: str
    value: str

    class Config:
        from_attributes = True

class ResponseOutput(BaseModel):
    id: str
    form_id: str
    submitted_at: datetime
    answers: List[AnswerOutput]

    class Config:
        from_attributes = True

