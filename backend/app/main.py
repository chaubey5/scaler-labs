from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Typeform Clone API")

# Configure CORS so our Next.js frontend can communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routers import forms, public, results
from app.routers import imports, workspaces

app.include_router(forms.router)
app.include_router(public.router)
app.include_router(results.router)
app.include_router(imports.router)
app.include_router(workspaces.router)

@app.get("/")
def read_root():
    return {"status": "Backend is running"}
