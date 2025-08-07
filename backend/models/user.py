"""
User model for authentication and profile management
"""

from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, Text, Integer, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from config.database import BaseModel
import enum
from typing import Optional

class UserRole(str, enum.Enum):
    """User role enumeration"""
    ADMIN = "admin"
    TRAINER = "trainer"
    TRAINEE = "trainee"
    MANAGER = "manager"

class SalesPersona(str, enum.Enum):
    """Sales persona enumeration matching frontend"""
    SDR_BDR = "SDR/BDR"
    ACCOUNT_EXECUTIVE = "Account Executive"
    SALES_MANAGER = "Sales Manager"
    CUSTOMER_SUCCESS = "Customer Success"

class User(BaseModel):
    """User model for authentication and profile data"""
    __tablename__ = "users"
    
    # Authentication fields
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Role and permissions
    role = Column(SQLEnum(UserRole), default=UserRole.TRAINEE, nullable=False)
    
    # Profile information
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    company = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    sales_persona = Column(SQLEnum(SalesPersona), nullable=True)
    
    # Experience and skills
    experience_level = Column(String(50), nullable=True)  # Beginner, Intermediate, Advanced
    years_experience = Column(Integer, nullable=True)
    bio = Column(Text, nullable=True)
    
    # Preferences
    preferred_difficulty = Column(String(50), nullable=True)
    preferred_categories = Column(Text, nullable=True)  # JSON string of categories
    
    # Activity tracking
    last_login = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0, nullable=False)
    
    # Training statistics
    total_sessions = Column(Integer, default=0, nullable=False)
    total_training_time = Column(Integer, default=0, nullable=False)  # in minutes
    average_score = Column(Integer, default=0, nullable=True)  # 0-100 scale
    
    # Relationships will be defined after all models are loaded
    # training_sessions = relationship("TrainingSession", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', username='{self.username}')>"
    
    @property
    def full_name(self) -> Optional[str]:
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return None
    
    @property
    def display_name(self) -> str:
        """Get display name (full name or username)"""
        return self.full_name or self.username
    
    def is_admin(self) -> bool:
        """Check if user is an administrator"""
        return self.role == UserRole.ADMIN
    
    def is_trainer(self) -> bool:
        """Check if user is a trainer"""
        return self.role == UserRole.TRAINER
    
    def can_access_scenario(self, scenario_difficulty: str) -> bool:
        """Check if user can access scenario based on experience level"""
        if self.role in [UserRole.ADMIN, UserRole.TRAINER]:
            return True
        
        # Experience level restrictions
        if self.experience_level == "Beginner" and scenario_difficulty == "Advanced":
            return False
        
        return True