import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.utils.config import settings
from app.utils.logger import logger
from app.services.dataset_service import dataset_service
from app.services.sensevoice_service import sensevoice_service
from app.api.dataset_routes import router as dataset_router
from app.api.feature_routes import router as feature_router
from app.api.training_routes import router as training_router
from app.api.evaluation_routes import router as evaluation_router
from app.api.inference_routes import router as inference_router
from app.api.experiment_routes import router as experiment_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown events."""
    logger.info("=" * 60)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info(f"Dataset Target Directory: {settings.DATASET_DIR}")
    logger.info("=" * 60)
    
    # 1. Inspect dataset on startup in background or load existing metadata
    try:
        if dataset_service.metadata_path.exists():
            dataset_service.load_metadata_if_exists()
            logger.info("Dataset metadata loaded from existing cache.")
        elif settings.DATASET_DIR.exists():
            logger.info("No metadata cache found. Performing initial scan...")
            dataset_service.scan_and_generate_metadata()
    except Exception as e:
        logger.warning(f"Initial dataset scan deferred: {e}")

    # 2. Trigger asynchronous background initialization of SenseVoiceSmall
    sensevoice_service.start_background_loading()
    
    yield
    logger.info("Cognivision Voice Intelligence shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_SUBTITLE,
    version=settings.VERSION,
    lifespan=lifespan
)

# Enable CORS for frontend Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "path": str(request.url.path)}
    )

# Include API routers
app.include_router(dataset_router)
app.include_router(feature_router)
app.include_router(training_router)
app.include_router(evaluation_router)
app.include_router(inference_router)
app.include_router(experiment_router)

@app.get("/health")
def health_check():
    """Health check endpoint providing system status and hardware telemetry."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "device": "CPU (AMD Ryzen)",
        "dataset_ready": dataset_service._df is not None,
        "total_files": len(dataset_service._df) if dataset_service._df is not None else 0,
        "sensevoice_status": sensevoice_service.status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
