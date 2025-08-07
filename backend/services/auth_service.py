"""
Authentication service for user management and JWT tokens
"""

from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from models.user import User, UserRole
from schemas.user import UserCreate, TokenData
from config.settings import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """Service class for authentication operations"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Generate password hash"""
        return pwd_context.hash(password, rounds=settings.BCRYPT_ROUNDS)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> TokenData:
        """Verify and decode JWT token"""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id: int = payload.get("sub")
            email: str = payload.get("email")
            role: str = payload.get("role")
            
            if user_id is None or email is None:
                raise credentials_exception
                
            token_data = TokenData(
                user_id=user_id,
                email=email,
                role=UserRole(role) if role else UserRole.TRAINEE
            )
            return token_data
        except JWTError:
            raise credentials_exception
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email address"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = AuthService.get_user_by_email(db, email)
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def create_user(db: Session, user_create: UserCreate) -> User:
        """Create a new user account"""
        # Check if user already exists
        existing_user = AuthService.get_user_by_email(db, user_create.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        existing_username = AuthService.get_user_by_username(db, user_create.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Validate password
        if len(user_create.password) < settings.PASSWORD_MIN_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
            )
        
        # Create new user
        hashed_password = AuthService.get_password_hash(user_create.password)
        
        db_user = User(
            email=user_create.email,
            username=user_create.username,
            hashed_password=hashed_password,
            first_name=user_create.first_name,
            last_name=user_create.last_name,
            company=user_create.company,
            job_title=user_create.job_title,
            sales_persona=user_create.sales_persona,
            experience_level=user_create.experience_level,
            years_experience=user_create.years_experience,
            bio=user_create.bio,
            preferred_difficulty=user_create.preferred_difficulty,
            preferred_categories=user_create.preferred_categories,
            role=UserRole.TRAINEE  # Default role
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    def update_user_login(db: Session, user: User) -> User:
        """Update user login timestamp and count"""
        user.last_login = datetime.utcnow()
        user.login_count += 1
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def change_password(db: Session, user: User, current_password: str, new_password: str) -> bool:
        """Change user password"""
        # Verify current password
        if not AuthService.verify_password(current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Validate new password
        if len(new_password) < settings.PASSWORD_MIN_LENGTH:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long"
            )
        
        # Update password
        user.hashed_password = AuthService.get_password_hash(new_password)
        db.commit()
        return True
    
    @staticmethod
    def deactivate_user(db: Session, user: User) -> User:
        """Deactivate user account"""
        user.is_active = False
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def activate_user(db: Session, user: User) -> User:
        """Activate user account"""
        user.is_active = True
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def verify_user_email(db: Session, user: User) -> User:
        """Mark user email as verified"""
        user.is_verified = True
        db.commit()
        db.refresh(user)
        return user
    
    @staticmethod
    def is_admin(user: User) -> bool:
        """Check if user has admin role"""
        return user.role == UserRole.ADMIN
    
    @staticmethod
    def is_trainer(user: User) -> bool:
        """Check if user has trainer role"""
        return user.role == UserRole.TRAINER
    
    @staticmethod
    def can_manage_scenarios(user: User) -> bool:
        """Check if user can manage scenarios"""
        return user.role in [UserRole.ADMIN, UserRole.TRAINER]
    
    @staticmethod
    def can_view_all_sessions(user: User) -> bool:
        """Check if user can view all sessions"""
        return user.role in [UserRole.ADMIN, UserRole.TRAINER, UserRole.MANAGER]