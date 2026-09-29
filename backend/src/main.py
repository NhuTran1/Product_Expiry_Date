from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from backend.src.api.endpoints.scan import router as scan_router
from backend.src.database.db import Base, engine
from backend.src.database import models

UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
CROPPED_OUTPUT_DIR = Path("outputs/cropped")
PREDICTION_OUTPUT_DIR = Path("outputs/predictions")

for d in [UPLOAD_DIR, OUTPUT_DIR, CROPPED_OUTPUT_DIR, PREDICTION_OUTPUT_DIR]:
    d.mkdir(parents=True, exist_ok=True)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Expiration System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan_router, prefix="/api", tags=["scan"])


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")