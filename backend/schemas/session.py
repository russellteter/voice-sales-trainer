"""
Session Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.session import SessionStatus, MessageType

# Schema for conversation messages
class ConversationMessage(BaseModel):
    """Schema for conversation messages matching frontend interface"""
    id: str
    type: MessageType
    content: str
    timestamp: datetime
    audio_url: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    
    model_config = ConfigDict(from_attributes=True)

# Schema for conversation steps
class ConversationStep(BaseModel):
    """Schema for conversation steps matching frontend interface"""
    step: int
    title: str
    description: str
    completed: bool
    feedback: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

# Base schema for session
class SessionBase(BaseModel):
    """Base session schema with common fields"""
    scenario_id: int = Field(..., description="ID of the training scenario")
    is_practice_mode: bool = Field(False, description="Whether this is a practice session")

# Schema for creating a new session
class SessionCreate(SessionBase):
    """Schema for creating a training session"""
    session_token: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scenario_id": 1,
                "is_practice_mode": False
            }
        }
    )

# Schema for updating session during conversation
class SessionUpdate(BaseModel):
    """Schema for updating session data during conversation"""
    status: Optional[SessionStatus] = None
    current_step: Optional[int] = None
    duration_seconds: Optional[int] = None
    messages: Optional[List[Dict[str, Any]]] = None
    real_time_feedback: Optional[List[str]] = None
    audio_quality_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    technical_issues: Optional[List[str]] = None

# Schema for adding a message to session
class MessageCreate(BaseModel):
    """Schema for adding a message to the conversation"""
    type: MessageType
    content: str
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    metadata: Optional[Dict[str, Any]] = None

# Schema for completing a session
class SessionComplete(BaseModel):
    """Schema for completing a training session"""
    final_score: Optional[int] = Field(None, ge=0, le=100)
    score_breakdown: Optional[Dict[str, int]] = None
    ai_feedback: Optional[List[str]] = None
    improvement_areas: Optional[List[str]] = None
    strengths: Optional[List[str]] = None
    conversation_summary: Optional[str] = None

# Schema for session response
class SessionResponse(BaseModel):
    """Schema for session data in API responses"""
    id: int
    user_id: int
    scenario_id: int
    status: SessionStatus
    session_token: Optional[str] = None
    started_at: Optional[int] = None
    completed_at: Optional[int] = None
    duration_seconds: int
    total_session_time: int
    final_score: Optional[int] = None
    current_step: int
    total_messages: int
    user_message_count: int
    ai_message_count: int
    is_practice_mode: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    @property
    def duration_minutes(self) -> float:
        """Get session duration in minutes"""
        return round(self.duration_seconds / 60.0, 1)

# Schema for detailed session response with conversation data
class SessionDetailResponse(SessionResponse):
    """Schema for detailed session data including conversation"""
    messages: Optional[List[ConversationMessage]] = []
    completed_steps: Optional[List[ConversationStep]] = []
    real_time_feedback: Optional[List[str]] = []
    score_breakdown: Optional[Dict[str, int]] = None
    ai_feedback: Optional[List[str]] = []
    improvement_areas: Optional[List[str]] = []
    strengths: Optional[List[str]] = []
    conversation_summary: Optional[str] = None
    audio_quality_score: Optional[float] = None
    technical_issues: Optional[List[str]] = []

# Schema for session summary (matching frontend expectation)
class SessionSummary(BaseModel):
    """Schema for session summary matching frontend interface"""
    id: int
    scenario_id: int
    status: str  # SessionStatus value
    duration: float  # in minutes
    score: Optional[int] = None
    feedback: List[str] = []
    messages_count: int
    completed_steps: int
    started_at: Optional[int] = None
    completed_at: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schema for session filters and queries
class SessionFilters(BaseModel):
    """Schema for filtering sessions"""
    scenario_id: Optional[int] = None
    status: Optional[SessionStatus] = None
    is_practice_mode: Optional[bool] = None
    min_score: Optional[int] = Field(None, ge=0, le=100)
    max_score: Optional[int] = Field(None, ge=0, le=100)
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    
    # Sorting options
    sort_by: Optional[str] = Field("created_at", regex="^(created_at|updated_at|duration|score)$")
    sort_order: Optional[str] = Field("desc", regex="^(asc|desc)$")
    
    # Pagination
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)

# Schema for session statistics
class SessionStats(BaseModel):
    """Schema for user session statistics"""
    total_sessions: int
    completed_sessions: int
    total_training_time: int  # in minutes
    average_score: Optional[float] = None
    sessions_by_scenario: Dict[int, int] = {}
    sessions_by_month: Dict[str, int] = {}
    improvement_trend: Optional[str] = None  # "improving", "stable", "declining"
    recent_sessions: List[SessionSummary] = []
    
    model_config = ConfigDict(from_attributes=True)

# Schema for real-time session updates (WebSocket)
class SessionRealTimeUpdate(BaseModel):
    """Schema for real-time session updates via WebSocket"""
    session_id: int
    event_type: str = Field(..., regex="^(message|feedback|step_complete|status_change)$")
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Schema for session feedback
class SessionFeedbackCreate(BaseModel):
    """Schema for adding feedback to a session"""
    feedback_type: str = Field(..., regex="^(coaching|technical|general)$")
    content: str = Field(..., min_length=1)
    score_impact: Optional[int] = Field(None, ge=-10, le=10)

# Schema for bulk session operations
class SessionBulkUpdate(BaseModel):
    """Schema for bulk updating sessions"""
    session_ids: List[int] = Field(..., min_items=1)
    updates: SessionUpdate

# Schema for session analytics
class SessionAnalytics(BaseModel):
    """Schema for session performance analytics"""
    session_id: int
    engagement_score: float = Field(ge=0.0, le=1.0)
    conversation_quality: float = Field(ge=0.0, le=1.0)
    objective_completion: Dict[str, bool] = {}
    speaking_time_ratio: float = Field(description="User speaking time vs total time")
    response_times: List[float] = []  # Response times in seconds
    vocabulary_diversity: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)