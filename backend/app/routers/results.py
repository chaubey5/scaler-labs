from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/api/forms",
    tags=["Results"]
)

# For testing, we assume a default user
DEFAULT_USER_ID = "test-user-id"

@router.get("/{form_id}/responses", response_model=List[schemas.ResponseOutput])
def get_responses(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    # In a real app we'd verify the user is the creator here
    if form.creator_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=403, detail="Not authorized to view these responses")
        
    responses = db.query(models.Response).filter(models.Response.form_id == form_id).order_by(models.Response.submitted_at.desc()).all()
    return responses


@router.get("/{form_id}/export")
def export_responses_csv(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.creator_id != DEFAULT_USER_ID:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Collect questions in order
    questions = db.query(models.Question).filter(models.Question.form_id == form_id).order_by(models.Question.order_index).all()
    q_map = {q.id: q for q in questions}

    # CSV header: response_id, submitted_at, then question titles
    import csv
    from io import StringIO

    output = StringIO()
    writer = csv.writer(output)

    header = ["response_id", "submitted_at"] + [q.title for q in questions]
    writer.writerow(header)

    responses = db.query(models.Response).filter(models.Response.form_id == form_id).order_by(models.Response.submitted_at.desc()).all()
    for r in responses:
        # map question id to answer
        ans_map = {a.question_id: a.value for a in r.answers}
        row = [r.id, r.submitted_at.isoformat()]
        for q in questions:
            row.append(ans_map.get(q.id, ""))
        writer.writerow(row)

    csv_data = output.getvalue()
    return Response(content=csv_data, media_type="text/csv")
