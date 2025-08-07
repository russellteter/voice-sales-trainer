"""
Initial database migration script
Creates all tables for the voice sales trainer application
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from config.database import engine, Base, SessionLocal
from models.user import User
from models.scenario import TrainingScenario
from models.session import TrainingSession
from config.settings import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_all_tables():
    """Create all database tables"""
    try:
        logger.info("Creating all database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully created all tables")
        return True
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        return False

def seed_default_scenarios():
    """Seed database with default training scenarios"""
    try:
        db = SessionLocal()
        
        # Check if scenarios already exist
        existing_count = db.query(TrainingScenario).count()
        if existing_count > 0:
            logger.info(f"Found {existing_count} existing scenarios, skipping seed")
            db.close()
            return
        
        logger.info("Seeding default training scenarios...")
        
        # Get default scenarios from model
        default_scenarios = TrainingScenario.get_default_scenarios()
        
        for scenario_data in default_scenarios:
            scenario = TrainingScenario(**scenario_data)
            db.add(scenario)
        
        db.commit()
        logger.info(f"Successfully seeded {len(default_scenarios)} scenarios")
        db.close()
        
    except Exception as e:
        logger.error(f"Error seeding scenarios: {e}")
        if 'db' in locals():
            db.rollback()
            db.close()

def verify_database_setup():
    """Verify database setup is working correctly"""
    try:
        db = SessionLocal()
        
        # Test basic queries
        user_count = db.query(User).count()
        scenario_count = db.query(TrainingScenario).count()
        session_count = db.query(TrainingSession).count()
        
        logger.info(f"Database verification:")
        logger.info(f"  Users: {user_count}")
        logger.info(f"  Scenarios: {scenario_count}")
        logger.info(f"  Sessions: {session_count}")
        
        db.close()
        return True
        
    except Exception as e:
        logger.error(f"Database verification failed: {e}")
        return False

def main():
    """Main migration function"""
    logger.info("Starting initial database migration...")
    logger.info(f"Database URL: {settings.DATABASE_URL}")
    
    # Step 1: Create tables
    if not create_all_tables():
        logger.error("Failed to create tables")
        return False
    
    # Step 2: Seed default data
    seed_default_scenarios()
    
    # Step 3: Verify setup
    if not verify_database_setup():
        logger.error("Database verification failed")
        return False
    
    logger.info("Database migration completed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)