# Typeform Clone - SDE Fullstack Assignment

This is a functional clone of the Typeform application, replicating its core form-building and form-filling workflows.

## Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion (for animations), Zustand (state management), dnd-kit (drag and drop).
- **Backend**: Python, FastAPI, SQLAlchemy (ORM).
- **Database**: SQLite.

## Architecture Overview
The application is separated into a Next.js frontend and a FastAPI backend.
1. **Creator Flow**: Creators start at the Dashboard (`/`), where they can view and create forms. The Form Builder (`/form/[id]`) uses `Zustand` to manage local state for lightning-fast edits, and `@dnd-kit` for drag-and-drop question reordering. Hitting "Publish" synchronizes the local state with the SQLite database via `PUT /api/forms/{id}`.
2. **Respondent Flow**: The public UI (`/to/[id]`) fetches the published form data and uses `framer-motion` to smoothly transition between questions one at a time. It captures keyboard inputs (Enter) and submits the final payload to `POST /api/public/forms/{id}/responses`.
3. **Results**: Creators can view tabular response data at the Results Dashboard (`/results/[id]`), which aggregates the submitted answers.

## Database Schema (SQLite)
The database uses 4 core tables:
- **users**: Mocked creator accounts (`id`, `name`, `email`).
- **forms**: Form metadata (`id`, `creator_id`, `title`, `status`, `created_at`).
- **questions**: The form fields (`id`, `form_id`, `type`, `title`, `description`, `is_required`, `order_index`, `options`).
- **responses**: Represents a single submission session (`id`, `form_id`, `submitted_at`).
- **answers**: The individual answers tied to a response (`id`, `response_id`, `question_id`, `value`).

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python init_db.py
python seed.py
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Usage
Navigate to `http://localhost:3000` to access the creator dashboard. 
The backend API docs are available at `http://localhost:8000/docs`.

## Assumptions Made
1. **Authentication**: As per the instructions, real creator authentication is simplified. A default `test-user-id` is automatically injected into the database and used for all creator actions.
2. **Form Syncing**: To keep the drag-and-drop UI fast, the form builder relies entirely on local state (Zustand) until the user explicitly clicks the "Publish" button, which performs a bulk replacement of the questions in the database.
3. **Public Forms**: Draft forms cannot be accessed by respondents. The API strictly blocks fetching forms unless `status == 'published'`.
