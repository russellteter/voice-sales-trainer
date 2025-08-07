"""
Database configuration and session management
"""

from sqlalchemy import create_engine, Column, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from typing import Generator
import logging

from .settings import settings

# Configure logging
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO if settings.DATABASE_ECHO else logging.WARNING)

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections every hour
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

class BaseModel(Base):
    """Base model class with common fields"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

# Dependency to get database session
def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Yields a database session and ensures proper cleanup.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

# Database utilities
def create_tables():
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

def drop_tables():
    """Drop all database tables (use with caution!)"""
    Base.metadata.drop_all(bind=engine)

def get_db_session() -> Session:
    """Get a database session for direct use (not as dependency)"""
    return SessionLocal()

def initialize_database():
    """Initialize database with tables and default data"""
    try:
        logging.info("Initializing database...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Import models to ensure they're registered
        from models.user import User
        from models.scenario import TrainingScenario
        from models.session import TrainingSession
        
        logging.info("Database tables created successfully")
        return True
    except Exception as e:
        logging.error(f"Database initialization failed: {e}")
        return False

def seed_default_data():
    """Seed database with default scenarios if empty"""
    try:
        db = SessionLocal()
        
        # Check if scenarios already exist
        from models.scenario import TrainingScenario
        existing_count = db.query(TrainingScenario).count()
        if existing_count > 0:
            logging.info(f"Found {existing_count} existing scenarios, skipping seed")
            db.close()
            return True
        
        logging.info("Seeding default training scenarios...")
        
        # Get default scenarios from model
        default_scenarios = TrainingScenario.get_default_scenarios()
        
        for scenario_data in default_scenarios:
            scenario = TrainingScenario(**scenario_data)
            db.add(scenario)
        
        db.commit()
        logging.info(f"Successfully seeded {len(default_scenarios)} scenarios")
        db.close()
        return True
        
    except Exception as e:
        logging.error(f"Error seeding scenarios: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()
        return False

# Health check function
def check_database_connection() -> bool:
    """
    Check if database connection is working
    Returns True if connection is successful, False otherwise
    """
    try:
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return True
    except Exception as e:
        logging.error(f"Database connection failed: {e}")
        return False