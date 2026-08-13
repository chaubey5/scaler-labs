from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/api/public/forms",
    tags=["Public Forms"]
)

@router.get("/{form_id}", response_model=schemas.Form)
def get_public_form(form_id: str, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    if form.status != "published":
        raise HTTPException(status_code=403, detail="Form is not published")
    return form

@router.post("/{form_id}/responses")
def submit_response(form_id: str, response_data: schemas.ResponseCreate, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form or form.status != "published":
        raise HTTPException(status_code=404, detail="Form not found or not published")
        
    db_response = models.Response(form_id=form_id)
    db.add(db_response)
    db.flush() # flush to get the generated response id

    for answer in response_data.answers:
        db_answer = models.Answer(
            response_id=db_response.id,
            question_id=answer.question_id,
            value=answer.value
        )
        db.add(db_answer)
        
    db.commit()
    return {"message": "Response submitted successfully", "response_id": db_response.id}
