"""
Voice Sales Trainer - FastAPI Backend
Main application entry point
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime

# Import routers
from api.auth import router as auth_router
from api.scenarios import router as scenarios_router
from api.sessions import router as sessions_router
from api.voice import router as voice_router

# Import database
from config.database import engine, Base, get_db
from config.settings import settings

# Create FastAPI app
app = FastAPI(
    title="Voice Sales Trainer API",
    description="AI-powered voice sales training platform backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development server
        "https://localhost:3000", 
        "http://127.0.0.1:3000",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database with tables and default data on startup"""
    from config.database import initialize_database, seed_default_data
    
    # Initialize database tables
    if not initialize_database():
        raise RuntimeError("Failed to initialize database")
    
    # Seed default data
    seed_default_data()

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint to verify API is running"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "Voice Sales Trainer API"
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Voice Sales Trainer API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(scenarios_router, prefix="/scenarios", tags=["Scenarios"]) 
app.include_router(sessions_router, prefix="/sessions", tags=["Sessions"])
app.include_router(voice_router, prefix="/voice", tags=["Voice Processing"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload in development
        access_log=True
    )