from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/api/workspaces",
    tags=["Workspaces"]
)

# For simplicity use default test user
DEFAULT_USER_ID = "test-user-id"

@router.get("/", response_model=List[dict])
def list_workspaces(db: Session = Depends(get_db)):
    # ensure default user exists
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, name="Test User", email="test@example.com")
        db.add(user)
        db.commit()
    workspaces = db.query(models.Workspace).filter(models.Workspace.owner_id == DEFAULT_USER_ID).all()
    return [{"id": w.id, "name": w.name} for w in workspaces]

@router.post("/", response_model=dict)
def create_workspace(payload: dict, db: Session = Depends(get_db)):
    name = payload.get("name") or "New Workspace"
    # ensure default user exists
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, name="Test User", email="test@example.com")
        db.add(user)
        db.commit()
    ws = models.Workspace(name=name, owner_id=DEFAULT_USER_ID)
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return {"id": ws.id, "name": ws.name}

@router.put("/{workspace_id}", response_model=dict)
def rename_workspace(workspace_id: str, payload: dict, db: Session = Depends(get_db)):
    ws = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    name = payload.get("name")
    if name:
        ws.name = name
        db.commit()
        db.refresh(ws)
    return {"id": ws.id, "name": ws.name}

@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str, db: Session = Depends(get_db)):
    ws = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(ws)
    db.commit()
    return {"message": "Workspace deleted"}
