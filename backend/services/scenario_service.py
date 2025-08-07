"""
Scenario service for training scenario management
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from fastapi import HTTPException, status

from models.scenario import TrainingScenario, ScenarioDifficulty, ScenarioCategory, SalesPersona
from models.user import User
from schemas.scenario import ScenarioCreate, ScenarioUpdate, ScenarioFilters

class ScenarioService:
    """Service class for training scenario operations"""
    
    @staticmethod
    def get_scenario_by_id(db: Session, scenario_id: int) -> Optional[TrainingScenario]:
        """Get scenario by ID"""
        return db.query(TrainingScenario).filter(
            TrainingScenario.id == scenario_id,
            TrainingScenario.is_active == True
        ).first()
    
    @staticmethod
    def get_all_scenarios(
        db: Session,
        filters: ScenarioFilters,
        user: Optional[User] = None
    ) -> tuple[List[TrainingScenario], int]:
        """Get all scenarios with filtering, sorting, and pagination"""
        query = db.query(TrainingScenario)
        
        # Apply filters
        if filters.category:
            query = query.filter(TrainingScenario.category == filters.category)
        
        if filters.difficulty:
            query = query.filter(TrainingScenario.difficulty == filters.difficulty)
        
        if filters.persona:
            query = query.filter(TrainingScenario.persona == filters.persona)
        
        if filters.is_active is not None:
            query = query.filter(TrainingScenario.is_active == filters.is_active)
        else:
            # Default to active scenarios only
            query = query.filter(TrainingScenario.is_active == True)
        
        # Search functionality
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                (TrainingScenario.title.ilike(search_term)) |
                (TrainingScenario.description.ilike(search_term)) |
                (TrainingScenario.tags.contains([filters.search.lower()]))
            )
        
        # Tag filtering
        if filters.tags:
            for tag in filters.tags:
                query = query.filter(TrainingScenario.tags.contains([tag]))
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        if filters.sort_by == "name":
            order_col = TrainingScenario.title
        elif filters.sort_by == "difficulty":
            # Use difficulty level for proper ordering
            order_col = func.case(
                (TrainingScenario.difficulty == ScenarioDifficulty.BEGINNER, 1),
                (TrainingScenario.difficulty == ScenarioDifficulty.INTERMEDIATE, 2),
                (TrainingScenario.difficulty == ScenarioDifficulty.ADVANCED, 3),
                else_=1
            )
        elif filters.sort_by == "score":
            order_col = TrainingScenario.average_score
        elif filters.sort_by == "created":
            order_col = TrainingScenario.created_at
        else:  # popularity (default)
            order_col = TrainingScenario.completion_count
        
        if filters.sort_order == "asc":
            query = query.order_by(asc(order_col))
        else:
            query = query.order_by(desc(order_col))
        
        # Add secondary sorting for consistent results
        query = query.order_by(desc(TrainingScenario.sort_order), desc(TrainingScenario.id))
        
        # Apply pagination
        scenarios = query.offset(filters.skip).limit(filters.limit).all()
        
        return scenarios, total_count
    
    @staticmethod
    def create_scenario(db: Session, scenario_create: ScenarioCreate, user: User) -> TrainingScenario:
        """Create a new training scenario"""
        # Check permissions
        if not ScenarioService.can_manage_scenarios(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to create scenarios"
            )
        
        # Create scenario
        scenario_data = scenario_create.model_dump()
        db_scenario = TrainingScenario(**scenario_data)
        
        db.add(db_scenario)
        db.commit()
        db.refresh(db_scenario)
        
        return db_scenario
    
    @staticmethod
    def update_scenario(
        db: Session, 
        scenario_id: int, 
        scenario_update: ScenarioUpdate, 
        user: User
    ) -> Optional[TrainingScenario]:
        """Update an existing scenario"""
        # Check permissions
        if not ScenarioService.can_manage_scenarios(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to update scenarios"
            )
        
        # Get scenario
        scenario = ScenarioService.get_scenario_by_id(db, scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scenario not found"
            )
        
        # Update fields
        update_data = scenario_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(scenario, field, value)
        
        db.commit()
        db.refresh(scenario)
        
        return scenario
    
    @staticmethod
    def delete_scenario(db: Session, scenario_id: int, user: User) -> bool:
        """Delete (soft delete) a scenario"""
        # Check permissions
        if not ScenarioService.can_manage_scenarios(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions to delete scenarios"
            )
        
        # Get scenario
        scenario = ScenarioService.get_scenario_by_id(db, scenario_id)
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scenario not found"
            )
        
        # Soft delete by setting is_active to False
        scenario.is_active = False
        db.commit()
        
        return True
    
    @staticmethod
    def get_scenario_stats(db: Session) -> Dict[str, Any]:
        """Get scenario statistics"""
        total_scenarios = db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True
        ).count()
        
        # Count by category
        category_stats = db.query(
            TrainingScenario.category,
            func.count(TrainingScenario.id).label('count')
        ).filter(
            TrainingScenario.is_active == True
        ).group_by(TrainingScenario.category).all()
        
        # Count by difficulty
        difficulty_stats = db.query(
            TrainingScenario.difficulty,
            func.count(TrainingScenario.id).label('count')
        ).filter(
            TrainingScenario.is_active == True
        ).group_by(TrainingScenario.difficulty).all()
        
        # Count by persona
        persona_stats = db.query(
            TrainingScenario.persona,
            func.count(TrainingScenario.id).label('count')
        ).filter(
            TrainingScenario.is_active == True
        ).group_by(TrainingScenario.persona).all()
        
        # Most popular scenarios
        most_popular = db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True
        ).order_by(desc(TrainingScenario.completion_count)).limit(5).all()
        
        # Highest rated scenarios
        highest_rated = db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True,
            TrainingScenario.average_score > 0
        ).order_by(desc(TrainingScenario.average_score)).limit(5).all()
        
        return {
            "total_scenarios": total_scenarios,
            "by_category": {item.category.value: item.count for item in category_stats},
            "by_difficulty": {item.difficulty.value: item.count for item in difficulty_stats},
            "by_persona": {item.persona.value: item.count for item in persona_stats},
            "most_popular": [scenario.to_dict() for scenario in most_popular],
            "highest_rated": [scenario.to_dict() for scenario in highest_rated]
        }
    
    @staticmethod
    def get_recommendations_for_user(
        db: Session, 
        user: User, 
        limit: int = 5
    ) -> List[TrainingScenario]:
        """Get personalized scenario recommendations for user"""
        query = db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True
        )
        
        # Filter by user's experience level
        if user.experience_level:
            if user.experience_level == "Beginner":
                query = query.filter(
                    TrainingScenario.difficulty.in_([
                        ScenarioDifficulty.BEGINNER,
                        ScenarioDifficulty.INTERMEDIATE
                    ])
                )
            elif user.experience_level == "Intermediate":
                query = query.filter(
                    TrainingScenario.difficulty.in_([
                        ScenarioDifficulty.INTERMEDIATE,
                        ScenarioDifficulty.ADVANCED
                    ])
                )
        
        # Prioritize user's persona
        if user.sales_persona:
            persona_scenarios = query.filter(
                TrainingScenario.persona == user.sales_persona
            ).order_by(desc(TrainingScenario.average_score)).limit(3).all()
            
            # Fill remaining slots with other scenarios
            other_scenarios = query.filter(
                TrainingScenario.persona != user.sales_persona
            ).order_by(desc(TrainingScenario.completion_count)).limit(limit - len(persona_scenarios)).all()
            
            return persona_scenarios + other_scenarios
        
        # Default recommendation based on popularity and score
        return query.order_by(
            desc(TrainingScenario.average_score),
            desc(TrainingScenario.completion_count)
        ).limit(limit).all()
    
    @staticmethod
    def update_scenario_completion(
        db: Session, 
        scenario_id: int, 
        score: int
    ) -> Optional[TrainingScenario]:
        """Update scenario completion statistics"""
        scenario = ScenarioService.get_scenario_by_id(db, scenario_id)
        if not scenario:
            return None
        
        scenario.update_completion_stats(score)
        db.commit()
        db.refresh(scenario)
        
        return scenario
    
    @staticmethod
    def can_manage_scenarios(user: User) -> bool:
        """Check if user can manage scenarios"""
        from services.auth_service import AuthService
        return AuthService.can_manage_scenarios(user)
    
    @staticmethod
    def seed_default_scenarios(db: Session) -> List[TrainingScenario]:
        """Seed database with default scenarios"""
        existing_count = db.query(TrainingScenario).count()
        if existing_count > 0:
            return []  # Don't seed if scenarios already exist
        
        default_scenarios_data = TrainingScenario.get_default_scenarios()
        scenarios = []
        
        for scenario_data in default_scenarios_data:
            scenario = TrainingScenario(**scenario_data)
            db.add(scenario)
            scenarios.append(scenario)
        
        db.commit()
        
        for scenario in scenarios:
            db.refresh(scenario)
        
        return scenarios
    
    @staticmethod
    def search_scenarios(
        db: Session, 
        search_term: str, 
        user: Optional[User] = None
    ) -> List[TrainingScenario]:
        """Search scenarios by title, description, or tags"""
        query = db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True
        )
        
        if search_term:
            search_pattern = f"%{search_term}%"
            query = query.filter(
                (TrainingScenario.title.ilike(search_pattern)) |
                (TrainingScenario.description.ilike(search_pattern)) |
                (TrainingScenario.tags.contains([search_term.lower()]))
            )
        
        return query.order_by(
            desc(TrainingScenario.completion_count)
        ).all()
    
    @staticmethod
    def get_featured_scenarios(db: Session, limit: int = 6) -> List[TrainingScenario]:
        """Get featured scenarios for homepage/dashboard"""
        return db.query(TrainingScenario).filter(
            TrainingScenario.is_active == True,
            TrainingScenario.is_featured == True
        ).order_by(
            desc(TrainingScenario.sort_order),
            desc(TrainingScenario.average_score)
        ).limit(limit).all()