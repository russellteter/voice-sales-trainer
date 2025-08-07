"""
Session API endpoints for training session management
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from config.database import get_db
from schemas.session import (
    SessionCreate,
    SessionResponse,
    SessionDetailResponse,
    SessionUpdate,
    SessionComplete,
    SessionSummary,
    SessionFilters,
    SessionStats,
    MessageCreate
)
from models.session import TrainingSession, SessionStatus, MessageType
from models.user import User
from services.scenario_service import ScenarioService
from api.auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_create: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new training session"""
    try:
        # Verify scenario exists
        scenario = ScenarioService.get_scenario_by_id(db, session_create.scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scenario not found"
            )
        
        # Check if user can access this scenario
        if not scenario.is_suitable_for_user(
            current_user.experience_level,
            current_user.sales_persona.value if current_user.sales_persona else None
        ):
            # Allow but warn
            pass
        
        # Create session
        session = TrainingSession(
            user_id=current_user.id,
            scenario_id=session_create.scenario_id,
            is_practice_mode=session_create.is_practice_mode,
            session_token=str(uuid.uuid4()) if session_create.session_token is None else session_create.session_token,
            status=SessionStatus.CREATED
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create training session"
        )

@router.get("", response_model=Dict[str, Any])
async def list_sessions(
    scenario_id: Optional[int] = Query(None, description="Filter by scenario ID"),
    status: Optional[str] = Query(None, description="Filter by session status"),
    is_practice_mode: Optional[bool] = Query(None, description="Filter by practice mode"),
    skip: int = Query(0, ge=0, description="Number of sessions to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of sessions to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of user's training sessions"""
    try:
        query = db.query(TrainingSession).filter(
            TrainingSession.user_id == current_user.id
        )
        
        # Apply filters
        if scenario_id:
            query = query.filter(TrainingSession.scenario_id == scenario_id)
        
        if status:
            try:
                session_status = SessionStatus(status)
                query = query.filter(TrainingSession.status == session_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid session status"
                )
        
        if is_practice_mode is not None:
            query = query.filter(TrainingSession.is_practice_mode == is_practice_mode)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        sessions = query.order_by(
            TrainingSession.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        # Convert to response format
        sessions_data = [SessionResponse.model_validate(session) for session in sessions]
        
        return {
            "sessions": sessions_data,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(sessions_data) < total_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )

@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed session information"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return SessionDetailResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve session"
        )

@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    session_update: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update session data during conversation"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Update fields
        update_data = session_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(session, field, value)
        
        # Update timestamps based on status
        if session_update.status == SessionStatus.IN_PROGRESS and session.started_at is None:
            session.started_at = int(datetime.utcnow().timestamp())
        elif session_update.status == SessionStatus.COMPLETED and session.completed_at is None:
            session.completed_at = int(datetime.utcnow().timestamp())
            
            # Calculate final score if not provided
            if session.final_score is None:
                session.final_score = session.calculate_final_score()
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update session"
        )

@router.post("/{session_id}/messages", status_code=status.HTTP_201_CREATED)
async def add_message(
    session_id: int,
    message_create: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add a message to the conversation"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Add message to session
        session.add_message(
            message_create.type,
            message_create.content,
            message_create.metadata
        )
        
        db.commit()
        
        return {"message": "Message added successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add message"
        )

@router.post("/{session_id}/feedback", status_code=status.HTTP_201_CREATED)
async def add_feedback(
    session_id: int,
    feedback: str = Query(..., min_length=1, description="Feedback content"),
    feedback_type: str = Query("coaching", description="Type of feedback"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add real-time feedback to session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Add feedback
        session.add_feedback(feedback, feedback_type)
        db.commit()
        
        return {"message": "Feedback added successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add feedback"
        )

@router.post("/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: int,
    session_complete: SessionComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Complete a training session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Update session with completion data
        session.status = SessionStatus.COMPLETED
        session.completed_at = int(datetime.utcnow().timestamp())
        
        if session_complete.final_score is not None:
            session.final_score = session_complete.final_score
        else:
            session.final_score = session.calculate_final_score()
        
        if session_complete.score_breakdown:
            session.score_breakdown = session_complete.score_breakdown
        
        if session_complete.ai_feedback:
            session.ai_feedback = session_complete.ai_feedback
        
        if session_complete.improvement_areas:
            session.improvement_areas = session_complete.improvement_areas
        
        if session_complete.strengths:
            session.strengths = session_complete.strengths
        
        if session_complete.conversation_summary:
            session.conversation_summary = session_complete.conversation_summary
        
        # Calculate total session time
        if session.started_at and session.completed_at:
            session.total_session_time = session.completed_at - session.started_at
        
        db.commit()
        
        # Update scenario completion stats (if not practice mode)
        if not session.is_practice_mode and session.final_score:
            ScenarioService.update_scenario_completion(
                db, 
                session.scenario_id, 
                session.final_score
            )
        
        # Update user statistics
        current_user.total_sessions += 1
        if session.duration_seconds > 0:
            current_user.total_training_time += session.duration_minutes
        
        # Update user average score
        if session.final_score:
            if current_user.average_score is None:
                current_user.average_score = session.final_score
            else:
                # Simple running average (could be improved with weighted average)
                total_score = (current_user.average_score * (current_user.total_sessions - 1)) + session.final_score
                current_user.average_score = int(total_score / current_user.total_sessions)
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete session"
        )

@router.get("/stats/overview", response_model=SessionStats)
async def get_session_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get user's session statistics"""
    try:
        # Get user's sessions
        sessions = db.query(TrainingSession).filter(
            TrainingSession.user_id == current_user.id
        ).all()
        
        # Calculate statistics
        total_sessions = len(sessions)
        completed_sessions = len([s for s in sessions if s.status == SessionStatus.COMPLETED])
        total_training_time = sum(s.duration_minutes for s in sessions if s.duration_seconds > 0)
        
        # Calculate average score
        completed_with_scores = [s for s in sessions if s.final_score is not None]
        average_score = None
        if completed_with_scores:
            average_score = sum(s.final_score for s in completed_with_scores) / len(completed_with_scores)
        
        # Sessions by scenario
        sessions_by_scenario = {}
        for session in sessions:
            scenario_id = session.scenario_id
            sessions_by_scenario[scenario_id] = sessions_by_scenario.get(scenario_id, 0) + 1
        
        # Recent sessions (last 10)
        recent_sessions = sorted(sessions, key=lambda x: x.created_at, reverse=True)[:10]
        recent_sessions_data = [session.get_session_summary() for session in recent_sessions]
        
        return SessionStats(
            total_sessions=total_sessions,
            completed_sessions=completed_sessions,
            total_training_time=int(total_training_time),
            average_score=average_score,
            sessions_by_scenario=sessions_by_scenario,
            recent_sessions=recent_sessions_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get session statistics"
        )

@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a training session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Only allow deletion of non-completed sessions or practice sessions
        if session.status == SessionStatus.COMPLETED and not session.is_practice_mode:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete completed non-practice sessions"
            )
        
        db.delete(session)
        db.commit()
        
        return {"message": "Session deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session"
        )

# Session management endpoints
@router.post("/{session_id}/start", response_model=SessionResponse)
async def start_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Start a training session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if session.status != SessionStatus.CREATED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session cannot be started in current state"
            )
        
        session.status = SessionStatus.IN_PROGRESS
        session.started_at = int(datetime.utcnow().timestamp())
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start session"
        )

@router.post("/{session_id}/pause", response_model=SessionResponse)
async def pause_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Pause a training session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if session.status != SessionStatus.IN_PROGRESS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is not in progress"
            )
        
        session.status = SessionStatus.PAUSED
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to pause session"
        )

@router.post("/{session_id}/resume", response_model=SessionResponse)
async def resume_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Resume a paused training session"""
    try:
        session = db.query(TrainingSession).filter(
            TrainingSession.id == session_id,
            TrainingSession.user_id == current_user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        if session.status != SessionStatus.PAUSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Session is not paused"
            )
        
        session.status = SessionStatus.IN_PROGRESS
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.model_validate(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resume session"
        )