from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas
from typing import Optional

router = APIRouter(
    prefix="/api/forms",
    tags=["Forms"]
)

# For testing, we assume a default user
DEFAULT_USER_ID = "test-user-id"

@router.get("/", response_model=List[schemas.Form])
def get_forms(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    # Make sure default user exists
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, name="Test User", email="test@example.com")
        db.add(user)
        db.commit()
        
    query = db.query(models.Form).filter(models.Form.creator_id == DEFAULT_USER_ID)
    if workspace_id:
        query = query.filter(models.Form.workspace_id == workspace_id)
    forms = query.all()
    return forms

@router.post("/", response_model=schemas.Form)
def create_form(form: schemas.FormCreate, db: Session = Depends(get_db)):
    db_form = models.Form(title=form.title, status=form.status, creator_id=DEFAULT_USER_ID, workspace_id=form.workspace_id)
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

@router.get("/{form_id}", response_model=schemas.Form)
def get_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form

@router.put("/{form_id}", response_model=schemas.Form)
def update_form(form_id: str, form_update: schemas.FormUpdate, db: Session = Depends(get_db)):
    db_form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")

    if form_update.title is not None:
        db_form.title = form_update.title
    if form_update.status is not None:
        db_form.status = form_update.status
    if getattr(form_update, 'workspace_id', None) is not None:
        db_form.workspace_id = form_update.workspace_id

    if form_update.questions is not None:
        # Delete existing questions and replace (simple approach for MVP)
        db.query(models.Question).filter(models.Question.form_id == form_id).delete()
        
        for q in form_update.questions:
            db_question = models.Question(
                form_id=form_id,
                type=q.type,
                title=q.title,
                description=q.description,
                is_required=q.is_required,
                order_index=q.order_index,
                options=q.options
            )
            db.add(db_question)

    db.commit()
    db.refresh(db_form)
    return db_form

@router.delete("/{form_id}")
def delete_form(form_id: str, db: Session = Depends(get_db)):
    db_form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not db_form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    db.delete(db_form)
    db.commit()
    return {"message": "Form deleted successfully"}


@router.post("/{form_id}/duplicate", response_model=schemas.Form)
def duplicate_form(form_id: str, db: Session = Depends(get_db)):
    orig = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Form not found")
    # create copy
    copied = models.Form(title=(orig.title + " (copy)"), status="draft", creator_id=orig.creator_id, workspace_id=orig.workspace_id)
    db.add(copied)
    db.flush()
    # copy questions
    for q in orig.questions:
        new_q = models.Question(
            form_id=copied.id,
            type=q.type,
            title=q.title,
            description=q.description,
            is_required=q.is_required,
            order_index=q.order_index,
            options=q.options
        )
        db.add(new_q)
    db.commit()
    db.refresh(copied)
    return copied
