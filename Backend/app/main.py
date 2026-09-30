import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.db.database import engine, Base
from app.db.migrations import run_migrations
import app.models  # Ensures all models (Invoice, OCRDocument) are registered with Base.metadata
from app.routes.invoices import router as invoice_router
from app.routes.ocr import router as ocr_router

load_dotenv()

# Auto-create database tables & run migrations
try:
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
    print("Database tables & schema migrations verified successfully.")
except Exception as e:
    print(f"Database table creation notice: {e}")

app = FastAPI(
    title="CA Project API",
    description="Backend API for Invoices, Azure Blob Storage (castorage), and OCR + Layout Extraction",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(invoice_router)
app.include_router(ocr_router)


@app.get("/", tags=["Health Check"])
def root():
    return {
        "status": "online",
        "message": "CA Project Backend API is running on port 6440",
        "features": [
            "Invoices Management",
            "Azure Blob Storage (castorage/<client_name>/finance/<doctype>)",
            "PDF & Image OCR",
            "Layout & Table Extraction",
        ],
        "docs_url": "/docs",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "6440"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)