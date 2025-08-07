"""
Application settings and configuration
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database configuration
    DATABASE_URL: str = "postgresql://localhost:5432/voice_sales_trainer"
    DATABASE_ECHO: bool = False  # Set to True for SQL query logging
    
    # JWT Authentication settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Voice Sales Trainer API"
    
    # CORS settings
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    
    # Security settings
    PASSWORD_MIN_LENGTH: int = 8
    BCRYPT_ROUNDS: int = 12
    
    # Application settings
    DEBUG: bool = True
    ENVIRONMENT: str = "development"
    
    # ElevenLabs Voice API Configuration
    ELEVENLABS_API_KEY: Optional[str] = None
    ELEVENLABS_VOICE_ID: str = "default"
    ELEVENLABS_MODEL_ID: str = "eleven_turbo_v2_5"
    
    # Voice Processing Settings
    VOICE_LATENCY_TARGET: int = 2000  # milliseconds
    ENABLE_VOICE_ANALYTICS: bool = True
    VOICE_SAMPLE_RATE: int = 16000  # Hz
    VOICE_CHUNK_SIZE: int = 1024  # bytes
    
    # Claude AI Integration (for sales coaching intelligence)
    CLAUDE_API_KEY: Optional[str] = None
    CLAUDE_MODEL: str = "claude-3-sonnet-20240229"
    CLAUDE_MAX_TOKENS: int = 150
    
    # Audio Processing Configuration
    AUDIO_FORMAT: str = "PCM"
    AUDIO_CHANNELS: int = 1
    AUDIO_SAMPLE_WIDTH: int = 2  # bytes (16-bit)
    
    # Performance and Monitoring
    MAX_CONCURRENT_SESSIONS: int = 50
    SESSION_TIMEOUT_MINUTES: int = 30
    VOICE_PROCESSING_TIMEOUT: int = 10  # seconds
    
    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL: int = 30  # seconds
    WS_MAX_MESSAGE_SIZE: int = 1048576  # 1MB
    
    # Sales Training Configuration
    DEFAULT_TRAINING_DURATION: int = 1800  # 30 minutes in seconds
    MOLLICK_FRAMEWORK_STEPS: int = 6
    ENABLE_REAL_TIME_COACHING: bool = True
    
    # Voice Activity Detection (VAD) Settings
    VAD_THRESHOLD: float = 0.5
    VAD_SILENCE_DURATION_MS: int = 500
    VAD_PREFIX_PADDING_MS: int = 300
    
    # TTS/STT Configuration
    TTS_SPEED: float = 1.0
    TTS_STABILITY: float = 0.5
    TTS_CLARITY: float = 0.75
    STT_LANGUAGE: str = "en-US"
    
    # Session Storage Configuration
    SESSION_STORAGE: str = "memory"  # options: memory, redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Metrics and Analytics
    ENABLE_METRICS_COLLECTION: bool = True
    METRICS_RETENTION_DAYS: int = 30
    
    # Development and Testing
    MOCK_ELEVENLABS_RESPONSES: bool = False
    ENABLE_DEBUG_AUDIO_LOGGING: bool = False
    TEST_MODE: bool = False
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    VOICE_REQUESTS_PER_MINUTE: int = 20
    
    # File upload settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Logging configuration
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Database URL validation and fallback
if not settings.DATABASE_URL:
    # Fallback to SQLite for development
    settings.DATABASE_URL = "sqlite:///./voice_sales_trainer.db"