"""
User Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from models.user import UserRole, SalesPersona

# Base schema for shared fields
class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    sales_persona: Optional[SalesPersona] = None
    experience_level: Optional[str] = Field(None, description="Beginner, Intermediate, or Advanced")
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    bio: Optional[str] = None
    preferred_difficulty: Optional[str] = None
    preferred_categories: Optional[str] = None

# Schema for creating a new user
class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=8, max_length=100)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "username": "johndoe",
                "password": "SecurePass123!",
                "first_name": "John",
                "last_name": "Doe",
                "company": "TechCorp",
                "job_title": "Sales Development Representative",
                "sales_persona": "SDR/BDR",
                "experience_level": "Beginner",
                "years_experience": 2
            }
        }
    )

# Schema for user login
class UserLogin(BaseModel):
    """Schema for user authentication"""
    email: EmailStr
    password: str
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "password": "SecurePass123!"
            }
        }
    )

# Schema for updating user profile
class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    sales_persona: Optional[SalesPersona] = None
    experience_level: Optional[str] = None
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    bio: Optional[str] = None
    preferred_difficulty: Optional[str] = None
    preferred_categories: Optional[str] = None

# Schema for password change
class PasswordChange(BaseModel):
    """Schema for changing user password"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

# Schema for user response (excludes sensitive data)
class UserResponse(UserBase):
    """Schema for user data in API responses"""
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime] = None
    login_count: int
    total_sessions: int
    total_training_time: int  # in minutes
    average_score: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)
    
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

# Schema for user profile summary (lighter version)
class UserSummary(BaseModel):
    """Lightweight user schema for lists and references"""
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    company: Optional[str] = None
    sales_persona: Optional[SalesPersona] = None
    total_sessions: int
    average_score: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schema for JWT token response
class Token(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse

# Schema for token data (for JWT payload)
class TokenData(BaseModel):
    """Schema for JWT token payload data"""
    user_id: int
    email: str
    role: UserRole
    exp: Optional[datetime] = None

# Schema for user statistics
class UserStats(BaseModel):
    """Schema for user training statistics"""
    total_sessions: int
    total_training_time: int  # in minutes
    average_score: Optional[int] = None
    completed_scenarios: int
    favorite_category: Optional[str] = None
    improvement_trend: Optional[str] = None  # "improving", "stable", "declining"
    recent_sessions: List[dict] = []
    
    model_config = ConfigDict(from_attributes=True)