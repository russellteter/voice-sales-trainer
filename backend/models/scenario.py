"""
Training scenario model matching frontend TrainingScenario interface
"""

from sqlalchemy import Column, String, Text, Integer, Enum as SQLEnum, Boolean, JSON
from sqlalchemy.orm import relationship
from config.database import BaseModel
import enum
from typing import List, Optional

class ScenarioDifficulty(str, enum.Enum):
    """Scenario difficulty levels matching frontend"""
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ADVANCED = "Advanced"

class ScenarioCategory(str, enum.Enum):
    """Scenario categories matching frontend"""
    COLD_CALLING = "Cold Calling"
    OBJECTION_HANDLING = "Objection Handling"
    CLOSING = "Closing"
    DISCOVERY = "Discovery"
    PRODUCT_DEMO = "Product Demo"
    NEGOTIATION = "Negotiation"

class SalesPersona(str, enum.Enum):
    """Sales persona types matching frontend and user model"""
    SDR_BDR = "SDR/BDR"
    ACCOUNT_EXECUTIVE = "Account Executive"
    SALES_MANAGER = "Sales Manager"
    CUSTOMER_SUCCESS = "Customer Success"

class TrainingScenario(BaseModel):
    """Training scenario model matching frontend TrainingScenario interface"""
    __tablename__ = "training_scenarios"
    
    # Basic scenario information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(ScenarioDifficulty), nullable=False, index=True)
    category = Column(SQLEnum(ScenarioCategory), nullable=False, index=True)
    persona = Column(SQLEnum(SalesPersona), nullable=False, index=True)
    
    # Duration and timing
    duration = Column(String(50), nullable=False)  # e.g., "5-8 minutes"
    estimated_duration_minutes = Column(Integer, nullable=True)  # For filtering/sorting
    
    # Learning objectives and tags
    objectives = Column(JSON, nullable=False)  # List of strings
    tags = Column(JSON, nullable=False)  # List of strings
    
    # Performance tracking
    completion_count = Column(Integer, default=0, nullable=False)
    average_score = Column(Integer, default=0, nullable=False)  # 0-100 scale
    total_score_sum = Column(Integer, default=0, nullable=False)  # For calculating average
    
    # Scenario configuration
    is_active = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    
    # AI conversation setup
    initial_context = Column(Text, nullable=True)  # Context for AI to start conversation
    conversation_framework = Column(JSON, nullable=True)  # Steps and prompts
    evaluation_criteria = Column(JSON, nullable=True)  # Criteria for scoring
    
    # Relationships will be defined after all models are loaded  
    # training_sessions = relationship("TrainingSession", back_populates="scenario")
    
    def __repr__(self):
        return f"<TrainingScenario(id={self.id}, title='{self.title}', category='{self.category.value}')>"
    
    @property
    def difficulty_level(self) -> int:
        """Get numeric difficulty level for sorting"""
        difficulty_map = {
            ScenarioDifficulty.BEGINNER: 1,
            ScenarioDifficulty.INTERMEDIATE: 2,
            ScenarioDifficulty.ADVANCED: 3
        }
        return difficulty_map.get(self.difficulty, 1)
    
    def update_completion_stats(self, new_score: int):
        """Update completion count and average score"""
        self.completion_count += 1
        self.total_score_sum += new_score
        self.average_score = self.total_score_sum // self.completion_count
    
    def to_dict(self) -> dict:
        """Convert to dictionary matching frontend interface"""
        return {
            "id": str(self.id),
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty.value,
            "category": self.category.value,
            "duration": self.duration,
            "objectives": self.objectives or [],
            "tags": self.tags or [],
            "completionCount": self.completion_count,
            "averageScore": self.average_score,
            "persona": self.persona.value
        }
    
    def is_suitable_for_user(self, user_experience: str, user_persona: str = None) -> bool:
        """Check if scenario is suitable for user's experience level"""
        # Experience level matching
        if user_experience == "Beginner" and self.difficulty == ScenarioDifficulty.ADVANCED:
            return False
        
        # Optional persona matching
        if user_persona and user_persona != self.persona.value:
            # Allow cross-persona training but deprioritize
            return True
        
        return True
    
    @classmethod
    def get_default_scenarios(cls) -> List[dict]:
        """Get default training scenarios to seed the database"""
        return [
            {
                "title": "Cold Outreach Introduction",
                "description": "Practice introducing yourself and your product to a cold prospect with effective opening techniques",
                "difficulty": ScenarioDifficulty.BEGINNER,
                "category": ScenarioCategory.COLD_CALLING,
                "duration": "5-8 minutes",
                "objectives": [
                    "Deliver a compelling value proposition in 30 seconds",
                    "Handle initial skepticism and build rapport",
                    "Secure a discovery call or next meeting"
                ],
                "tags": ["value-prop", "rapport-building", "first-impression"],
                "completion_count": 24,
                "average_score": 78,
                "persona": SalesPersona.SDR_BDR
            },
            {
                "title": "Price Objection Handling",
                "description": "Handle common price objections with confidence and value positioning",
                "difficulty": ScenarioDifficulty.INTERMEDIATE,
                "category": ScenarioCategory.OBJECTION_HANDLING,
                "duration": "10-12 minutes",
                "objectives": [
                    "Acknowledge and empathize with price concerns",
                    "Reframe conversation from cost to value",
                    "Present ROI and business case effectively"
                ],
                "tags": ["price-objections", "value-selling", "roi"],
                "completion_count": 18,
                "average_score": 72,
                "persona": SalesPersona.ACCOUNT_EXECUTIVE
            },
            {
                "title": "Discovery Questions Mastery",
                "description": "Ask the right questions to uncover customer needs and pain points using SPIN methodology",
                "difficulty": ScenarioDifficulty.BEGINNER,
                "category": ScenarioCategory.DISCOVERY,
                "duration": "12-15 minutes",
                "objectives": [
                    "Execute SPIN questioning framework",
                    "Uncover business pain points and implications",
                    "Build compelling need-payoff scenarios"
                ],
                "tags": ["spin-selling", "needs-analysis", "pain-points"],
                "completion_count": 31,
                "average_score": 81,
                "persona": SalesPersona.ACCOUNT_EXECUTIVE
            }
        ]