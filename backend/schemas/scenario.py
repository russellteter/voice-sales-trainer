"""
Scenario Pydantic schemas for API request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.scenario import ScenarioDifficulty, ScenarioCategory, SalesPersona

# Base schema for shared fields
class ScenarioBase(BaseModel):
    """Base scenario schema with common fields"""
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    difficulty: ScenarioDifficulty
    category: ScenarioCategory
    persona: SalesPersona
    duration: str = Field(..., description="Expected duration like '5-8 minutes'")
    objectives: List[str] = Field(..., description="Learning objectives for this scenario")
    tags: List[str] = Field(..., description="Tags for categorization and search")

# Schema for creating a new scenario
class ScenarioCreate(ScenarioBase):
    """Schema for creating a training scenario"""
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, le=120)
    initial_context: Optional[str] = None
    conversation_framework: Optional[Dict[str, Any]] = None
    evaluation_criteria: Optional[Dict[str, Any]] = None
    is_active: bool = True
    is_featured: bool = False
    sort_order: int = 0
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Cold Outreach Introduction",
                "description": "Practice introducing yourself and your product to a cold prospect with effective opening techniques",
                "difficulty": "Beginner",
                "category": "Cold Calling", 
                "persona": "SDR/BDR",
                "duration": "5-8 minutes",
                "objectives": [
                    "Deliver a compelling value proposition in 30 seconds",
                    "Handle initial skepticism and build rapport",
                    "Secure a discovery call or next meeting"
                ],
                "tags": ["value-prop", "rapport-building", "first-impression"],
                "estimated_duration_minutes": 7
            }
        }
    )

# Schema for updating scenario
class ScenarioUpdate(BaseModel):
    """Schema for updating a training scenario"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=1)
    difficulty: Optional[ScenarioDifficulty] = None
    category: Optional[ScenarioCategory] = None
    persona: Optional[SalesPersona] = None
    duration: Optional[str] = None
    objectives: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    estimated_duration_minutes: Optional[int] = Field(None, ge=1, le=120)
    initial_context: Optional[str] = None
    conversation_framework: Optional[Dict[str, Any]] = None
    evaluation_criteria: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None

# Schema for scenario response (matches frontend TrainingScenario interface)
class ScenarioResponse(ScenarioBase):
    """Schema for scenario data in API responses"""
    id: int
    completion_count: int = Field(description="Number of times this scenario has been completed")
    average_score: int = Field(description="Average score for this scenario (0-100)")
    is_active: bool
    is_featured: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
    
    def to_frontend_format(self) -> dict:
        """Convert to format expected by frontend TrainingScenario interface"""
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty.value,
            "category": self.category.value,
            "duration": self.duration,
            "objectives": self.objectives,
            "tags": self.tags,
            "completionCount": self.completion_count,
            "averageScore": self.average_score,
            "persona": self.persona.value
        }

# Schema for scenario summary (lighter version for lists)
class ScenarioSummary(BaseModel):
    """Lightweight scenario schema for lists"""
    id: int
    title: str
    difficulty: ScenarioDifficulty
    category: ScenarioCategory
    persona: SalesPersona
    duration: str
    completion_count: int
    average_score: int
    tags: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

# Schema for scenario filters
class ScenarioFilters(BaseModel):
    """Schema for filtering scenarios"""
    category: Optional[ScenarioCategory] = None
    difficulty: Optional[ScenarioDifficulty] = None
    persona: Optional[SalesPersona] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = True
    search: Optional[str] = Field(None, description="Search in title, description, and tags")
    
    # Sorting options
    sort_by: Optional[str] = Field("popularity", regex="^(name|difficulty|popularity|score|created)$")
    sort_order: Optional[str] = Field("desc", regex="^(asc|desc)$")
    
    # Pagination
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)

# Schema for scenario statistics
class ScenarioStats(BaseModel):
    """Schema for scenario usage statistics"""
    total_scenarios: int
    by_category: Dict[str, int] = {}
    by_difficulty: Dict[str, int] = {}
    by_persona: Dict[str, int] = {}
    most_popular: List[ScenarioSummary] = []
    highest_rated: List[ScenarioSummary] = []
    
    model_config = ConfigDict(from_attributes=True)

# Schema for scenario performance data
class ScenarioPerformance(BaseModel):
    """Schema for detailed scenario performance metrics"""
    scenario_id: int
    total_attempts: int
    completion_rate: float = Field(description="Percentage of sessions completed")
    average_score: float
    score_distribution: Dict[str, int] = {}  # Score ranges
    average_duration: float = Field(description="Average session duration in minutes")
    user_feedback: List[str] = []
    improvement_areas: List[str] = []
    
    model_config = ConfigDict(from_attributes=True)

# Schema for bulk scenario operations
class ScenarioBulkUpdate(BaseModel):
    """Schema for bulk updating scenarios"""
    scenario_ids: List[int] = Field(..., min_items=1)
    updates: ScenarioUpdate
    
# Schema for scenario recommendations
class ScenarioRecommendation(BaseModel):
    """Schema for personalized scenario recommendations"""
    scenario: ScenarioResponse
    reason: str = Field(description="Why this scenario is recommended")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score for recommendation")
    user_readiness: str = Field(description="User readiness level for this scenario")
    
    model_config = ConfigDict(from_attributes=True)