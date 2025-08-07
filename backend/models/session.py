"""
Training session model for tracking conversation sessions
"""

from sqlalchemy import Column, String, Text, Integer, ForeignKey, Enum as SQLEnum, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from config.database import BaseModel
import enum
from typing import List, Dict, Optional

class SessionStatus(str, enum.Enum):
    """Training session status"""
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class MessageType(str, enum.Enum):
    """Conversation message types matching frontend"""
    USER = "user"
    AI = "ai"
    SYSTEM = "system"

class TrainingSession(BaseModel):
    """Training session model for tracking voice conversations"""
    __tablename__ = "training_sessions"
    
    # Foreign key relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    scenario_id = Column(Integer, ForeignKey("training_scenarios.id"), nullable=False, index=True)
    
    # Session metadata
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.CREATED, nullable=False)
    session_token = Column(String(255), unique=True, index=True, nullable=True)  # For real-time tracking
    
    # Timing information
    started_at = Column(Integer, nullable=True)  # Unix timestamp
    completed_at = Column(Integer, nullable=True)  # Unix timestamp
    duration_seconds = Column(Integer, default=0, nullable=False)
    total_session_time = Column(Integer, default=0, nullable=False)  # Including pauses
    
    # Performance metrics
    final_score = Column(Integer, nullable=True)  # 0-100 scale
    score_breakdown = Column(JSON, nullable=True)  # Detailed scoring by criteria
    
    # Conversation data
    messages = Column(JSON, nullable=True)  # Array of conversation messages
    conversation_summary = Column(Text, nullable=True)
    total_messages = Column(Integer, default=0, nullable=False)
    user_message_count = Column(Integer, default=0, nullable=False)
    ai_message_count = Column(Integer, default=0, nullable=False)
    
    # Progress tracking
    current_step = Column(Integer, default=0, nullable=False)
    completed_steps = Column(JSON, nullable=True)  # Array of completed step info
    real_time_feedback = Column(JSON, nullable=True)  # Array of feedback during session
    
    # Audio and technical data
    audio_quality_score = Column(Float, nullable=True)  # 0.0-1.0 scale
    voice_activity_data = Column(JSON, nullable=True)  # Voice level tracking data
    technical_issues = Column(JSON, nullable=True)  # Array of technical problems encountered
    
    # Feedback and coaching
    ai_feedback = Column(JSON, nullable=True)  # Structured feedback from AI
    human_feedback = Column(Text, nullable=True)  # Optional trainer feedback
    improvement_areas = Column(JSON, nullable=True)  # Areas for improvement
    strengths = Column(JSON, nullable=True)  # Identified strengths
    
    # Session configuration
    is_practice_mode = Column(Boolean, default=False, nullable=False)
    difficulty_adjustments = Column(JSON, nullable=True)  # Runtime difficulty changes
    
    # Relationships will be defined after all models are loaded
    # user = relationship("User", back_populates="training_sessions")
    # scenario = relationship("TrainingScenario", back_populates="training_sessions")
    
    def __repr__(self):
        return f"<TrainingSession(id={self.id}, user_id={self.user_id}, scenario_id={self.scenario_id}, status='{self.status.value}')>"
    
    @property
    def duration_minutes(self) -> float:
        """Get session duration in minutes"""
        return round(self.duration_seconds / 60.0, 1)
    
    @property
    def is_completed(self) -> bool:
        """Check if session is completed"""
        return self.status == SessionStatus.COMPLETED
    
    @property
    def is_active(self) -> bool:
        """Check if session is currently active"""
        return self.status in [SessionStatus.IN_PROGRESS, SessionStatus.PAUSED]
    
    def add_message(self, message_type: MessageType, content: str, metadata: dict = None):
        """Add a message to the conversation"""
        if not self.messages:
            self.messages = []
        
        message = {
            "id": len(self.messages) + 1,
            "type": message_type.value,
            "content": content,
            "timestamp": self.updated_at.isoformat() if self.updated_at else None,
            **(metadata or {})
        }
        
        self.messages.append(message)
        self.total_messages = len(self.messages)
        
        # Update message counts
        if message_type == MessageType.USER:
            self.user_message_count += 1
        elif message_type == MessageType.AI:
            self.ai_message_count += 1
    
    def add_feedback(self, feedback: str, feedback_type: str = "coaching"):
        """Add real-time feedback during session"""
        if not self.real_time_feedback:
            self.real_time_feedback = []
        
        feedback_item = {
            "feedback": feedback,
            "type": feedback_type,
            "timestamp": self.updated_at.isoformat() if self.updated_at else None,
            "step": self.current_step
        }
        
        self.real_time_feedback.append(feedback_item)
    
    def complete_step(self, step_number: int, step_title: str, feedback: str = None):
        """Mark a conversation step as completed"""
        if not self.completed_steps:
            self.completed_steps = []
        
        step_data = {
            "step": step_number,
            "title": step_title,
            "completed": True,
            "feedback": feedback,
            "completed_at": self.updated_at.isoformat() if self.updated_at else None
        }
        
        self.completed_steps.append(step_data)
        self.current_step = step_number
    
    def calculate_final_score(self) -> int:
        """Calculate final session score based on various metrics"""
        if self.score_breakdown:
            # Use detailed breakdown if available
            scores = list(self.score_breakdown.values())
            return int(sum(scores) / len(scores)) if scores else 0
        
        # Simple scoring based on completion and message quality
        base_score = 60  # Base score for completing session
        
        # Bonus for message count (engagement)
        if self.user_message_count >= 5:
            base_score += 20
        elif self.user_message_count >= 3:
            base_score += 10
        
        # Bonus for completing all steps
        if self.completed_steps and len(self.completed_steps) >= 4:
            base_score += 15
        
        # Audio quality bonus
        if self.audio_quality_score and self.audio_quality_score > 0.8:
            base_score += 5
        
        return min(base_score, 100)  # Cap at 100
    
    def get_session_summary(self) -> dict:
        """Get session summary for frontend"""
        return {
            "id": self.id,
            "scenario_id": self.scenario_id,
            "status": self.status.value,
            "duration": self.duration_minutes,
            "score": self.final_score,
            "feedback": self.ai_feedback or [],
            "messages_count": self.total_messages,
            "completed_steps": len(self.completed_steps or []),
            "started_at": self.started_at,
            "completed_at": self.completed_at
        }