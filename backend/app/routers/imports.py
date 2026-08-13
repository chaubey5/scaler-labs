from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
from tempfile import NamedTemporaryFile

from app.schemas import QuestionCreate

router = APIRouter(
    prefix="/api/import",
    tags=["Import"]
)


def extract_text_from_txt(path: str) -> str:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        return f.read()


def extract_text_from_docx(path: str) -> str:
    try:
        from docx import Document
    except Exception:
        return ""
    doc = Document(path)
    texts = [p.text for p in doc.paragraphs]
    return '\n'.join(texts)


def extract_text_from_pdf(path: str) -> str:
    try:
        from PyPDF2 import PdfReader
    except Exception:
        return ""
    reader = PdfReader(path)
    texts = []
    for page in reader.pages:
        try:
            texts.append(page.extract_text() or "")
        except Exception:
            continue
    return '\n'.join(texts)


def detect_questions_from_text(text: str) -> List[QuestionCreate]:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    questions: List[QuestionCreate] = []

    for line in lines:
        # Heuristic: lines that end with ? or start with common question words
        if line.endswith('?') or line.lower().startswith(('what', 'how', 'why', 'where', 'when')):
            qtype = 'short_text'
            low = line.lower()
            if 'email' in low or 'e-mail' in low:
                qtype = 'email'
            elif any(k in low for k in ['rate', 'rating', 'score']):
                qtype = 'rating'
            elif any(k in low for k in ['yes', 'no', 'agree', 'disagree']) or low.startswith(('do you', 'have you', 'are you', 'did you', 'would you')):
                qtype = 'yes_no'
            elif any(k in low for k in ['select', 'choose', 'option']):
                qtype = 'multiple_choice'

            questions.append(QuestionCreate(type=qtype, title=line, description=None, is_required=False, order_index=len(questions), options=[]))

    # Fallback: if nothing detected, split by sentence endings
    if not questions and text:
        import re
        sents = re.split(r'[\n\.\r]+', text)
        for s in sents:
            s = s.strip()
            if s and len(s) > 10:
                questions.append(QuestionCreate(type='short_text', title=s[:200], description=None, is_required=False, order_index=len(questions), options=[]))

    return questions


@router.post("/file", response_model=List[QuestionCreate])
async def import_file(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename)[1].lower()
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        if suffix in ['.txt', '.csv']:
            text = extract_text_from_txt(tmp_path)
        elif suffix in ['.docx']:
            text = extract_text_from_docx(tmp_path)
        elif suffix in ['.pdf']:
            text = extract_text_from_pdf(tmp_path)
        else:
            raise HTTPException(status_code=400, detail='Unsupported file type')

        detected = detect_questions_from_text(text)
        return detected
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
