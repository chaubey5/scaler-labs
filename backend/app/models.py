from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)

    forms = relationship("Form", back_populates="creator")


class Form(Base):
    __tablename__ = "forms"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    creator_id = Column(String, ForeignKey("users.id"))
    workspace_id = Column(String, ForeignKey("workspaces.id"), nullable=True)
    title = Column(String, default="Untitled Form")
    status = Column(String, default="draft")  # draft or published
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    creator = relationship("User", back_populates="forms")
    workspace = relationship("Workspace", back_populates="forms")
    questions = relationship("Question", back_populates="form", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="form", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    form_id = Column(String, ForeignKey("forms.id"))
    type = Column(String)  # short_text, multiple_choice, etc.
    title = Column(String)
    description = Column(String, nullable=True)
    is_required = Column(Boolean, default=False)
    order_index = Column(Integer)
    options = Column(JSON, nullable=True)  # Store list of options if applicable

    form = relationship("Form", back_populates="questions")
    answers = relationship("Answer", back_populates="question", cascade="all, delete-orphan")


class Response(Base):
    __tablename__ = "responses"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    form_id = Column(String, ForeignKey("forms.id"))
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    form = relationship("Form", back_populates="responses")
    answers = relationship("Answer", back_populates="response", cascade="all, delete-orphan")


class Answer(Base):
    __tablename__ = "answers"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    response_id = Column(String, ForeignKey("responses.id"))
    question_id = Column(String, ForeignKey("questions.id"))
    value = Column(Text)  # Stored as string, parsed based on question type

    response = relationship("Response", back_populates="answers")
    question = relationship("Question", back_populates="answers")


class Workspace(Base):
    __tablename__ = "workspaces"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String, default="Default Workspace")
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)

    owner = relationship("User")
    forms = relationship("Form", back_populates="workspace", cascade="all, delete-orphan")
