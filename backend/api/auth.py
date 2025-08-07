"""
Authentication API endpoints
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config.database import get_db
from config.settings import settings
from schemas.user import UserCreate, UserLogin, UserResponse, Token, PasswordChange, UserUpdate
from services.auth_service import AuthService
from models.user import User

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user from JWT token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = AuthService.verify_token(token)
    
    user = AuthService.get_user_by_id(db, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
        )
    
    return user

# Dependency to get current active user
async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account"""
    try:
        # Create user
        user = AuthService.create_user(db, user_create)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthService.create_access_token(
            data={
                "sub": user.id,
                "email": user.email,
                "role": user.role.value
            },
            expires_delta=access_token_expires
        )
        
        # Update login info
        AuthService.update_user_login(db, user)
        
        # Return token and user data
        user_response = UserResponse.model_validate(user)
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    # Authenticate user
    user = AuthService.authenticate_user(db, user_credentials.email, user_credentials.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated",
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={
            "sub": user.id,
            "email": user.email,
            "role": user.role.value
        },
        expires_delta=access_token_expires
    )
    
    # Update login info
    AuthService.update_user_login(db, user)
    
    # Return token and user data
    user_response = UserResponse.model_validate(user)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
        user=user_response
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return UserResponse.model_validate(current_user)

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update current user profile"""
    try:
        # Update user fields
        update_data = user_update.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(current_user, field, value)
        
        db.commit()
        db.refresh(current_user)
        
        return UserResponse.model_validate(current_user)
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Change user password"""
    try:
        AuthService.change_password(
            db, 
            current_user, 
            password_change.current_password, 
            password_change.new_password
        )
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.post("/verify-token", response_model=UserResponse)
async def verify_token(current_user: User = Depends(get_current_active_user)):
    """Verify JWT token and return user info"""
    return UserResponse.model_validate(current_user)

@router.post("/refresh", response_model=Token)
async def refresh_token(current_user: User = Depends(get_current_active_user)):
    """Refresh JWT token"""
    # Create new access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={
            "sub": current_user.id,
            "email": current_user.email,
            "role": current_user.role.value
        },
        expires_delta=access_token_expires
    )
    
    user_response = UserResponse.model_validate(current_user)
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # in seconds
        user=user_response
    )

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: User = Depends(get_current_active_user)):
    """Logout user (client should discard token)"""
    # In a more sophisticated setup, you might want to blacklist the token
    # For now, we just return a success message
    return {"message": "Logged out successfully"}

@router.delete("/deactivate", status_code=status.HTTP_200_OK)
async def deactivate_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deactivate user account"""
    try:
        AuthService.deactivate_user(db, current_user)
        return {"message": "Account deactivated successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate account"
        )

# Admin-only endpoints
@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all users (admin only)"""
    if not AuthService.is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    users = db.query(User).offset(skip).limit(limit).all()
    return [UserResponse.model_validate(user) for user in users]

@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Activate a user account (admin only)"""
    if not AuthService.is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = AuthService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    AuthService.activate_user(db, user)
    return {"message": f"User {user.email} activated successfully"}