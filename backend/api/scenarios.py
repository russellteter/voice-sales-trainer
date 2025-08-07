"""
Scenario API endpoints for training scenario management
"""

from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from config.database import get_db
from schemas.scenario import (
    ScenarioResponse, 
    ScenarioCreate, 
    ScenarioUpdate, 
    ScenarioFilters,
    ScenarioSummary,
    ScenarioStats,
    ScenarioRecommendation
)
from services.scenario_service import ScenarioService
from api.auth import get_current_active_user
from models.user import User

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
async def list_scenarios(
    category: str = Query(None, description="Filter by category"),
    difficulty: str = Query(None, description="Filter by difficulty"),
    persona: str = Query(None, description="Filter by persona"),
    search: str = Query(None, description="Search in title, description, and tags"),
    sort_by: str = Query("popularity", regex="^(name|difficulty|popularity|score|created)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    skip: int = Query(0, ge=0, description="Number of scenarios to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of scenarios to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of training scenarios with filtering and pagination"""
    try:
        # Create filters object
        filters = ScenarioFilters(
            category=category,
            difficulty=difficulty,
            persona=persona,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            skip=skip,
            limit=limit
        )
        
        # Get scenarios
        scenarios, total_count = ScenarioService.get_all_scenarios(db, filters, current_user)
        
        # Convert to frontend format
        scenarios_data = []
        for scenario in scenarios:
            scenario_response = ScenarioResponse.model_validate(scenario)
            scenarios_data.append(scenario_response.to_frontend_format())
        
        return {
            "scenarios": scenarios_data,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "has_more": skip + len(scenarios_data) < total_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scenarios"
        )

@router.get("/featured", response_model=List[Dict[str, Any]])
async def get_featured_scenarios(
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get featured scenarios for dashboard"""
    try:
        scenarios = ScenarioService.get_featured_scenarios(db, limit)
        
        # Convert to frontend format
        return [
            ScenarioResponse.model_validate(scenario).to_frontend_format()
            for scenario in scenarios
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve featured scenarios"
        )

@router.get("/recommendations", response_model=List[Dict[str, Any]])
async def get_recommendations(
    limit: int = Query(5, ge=1, le=10),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get personalized scenario recommendations"""
    try:
        scenarios = ScenarioService.get_recommendations_for_user(db, current_user, limit)
        
        # Convert to frontend format with recommendation reasons
        recommendations = []
        for scenario in scenarios:
            scenario_data = ScenarioResponse.model_validate(scenario).to_frontend_format()
            
            # Add recommendation reason based on user profile
            reason = "Popular scenario"
            if current_user.sales_persona and scenario.persona == current_user.sales_persona:
                reason = f"Matches your {current_user.sales_persona.value} role"
            elif current_user.experience_level and scenario.difficulty.value == current_user.experience_level:
                reason = f"Perfect for your {current_user.experience_level.lower()} level"
            elif scenario.average_score > 80:
                reason = "Highly rated by other users"
            
            scenario_data["recommendation_reason"] = reason
            recommendations.append(scenario_data)
        
        return recommendations
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recommendations"
        )

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_scenarios(
    q: str = Query(..., min_length=1, description="Search query"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search scenarios by title, description, or tags"""
    try:
        scenarios = ScenarioService.search_scenarios(db, q, current_user)
        
        # Convert to frontend format
        return [
            ScenarioResponse.model_validate(scenario).to_frontend_format()
            for scenario in scenarios
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search scenarios"
        )

@router.get("/stats", response_model=ScenarioStats)
async def get_scenario_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get scenario statistics"""
    try:
        stats = ScenarioService.get_scenario_stats(db)
        return ScenarioStats(**stats)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get scenario statistics"
        )

@router.get("/{scenario_id}", response_model=Dict[str, Any])
async def get_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific scenario by ID"""
    try:
        scenario = ScenarioService.get_scenario_by_id(db, scenario_id)
        
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
            # Still return the scenario but add a warning
            scenario_data = ScenarioResponse.model_validate(scenario).to_frontend_format()
            scenario_data["access_warning"] = "This scenario may be challenging for your current experience level"
            return scenario_data
        
        return ScenarioResponse.model_validate(scenario).to_frontend_format()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve scenario"
        )

# Admin/Trainer endpoints
@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_create: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new training scenario (admin/trainer only)"""
    try:
        scenario = ScenarioService.create_scenario(db, scenario_create, current_user)
        return ScenarioResponse.model_validate(scenario)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create scenario"
        )

@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: int,
    scenario_update: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing scenario (admin/trainer only)"""
    try:
        scenario = ScenarioService.update_scenario(db, scenario_id, scenario_update, current_user)
        return ScenarioResponse.model_validate(scenario)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update scenario"
        )

@router.delete("/{scenario_id}", status_code=status.HTTP_200_OK)
async def delete_scenario(
    scenario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a scenario (admin/trainer only)"""
    try:
        ScenarioService.delete_scenario(db, scenario_id, current_user)
        return {"message": "Scenario deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete scenario"
        )

@router.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_default_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Seed database with default scenarios (admin only)"""
    try:
        # Check if user is admin
        if not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        scenarios = ScenarioService.seed_default_scenarios(db)
        
        return {
            "message": f"Successfully seeded {len(scenarios)} default scenarios",
            "scenarios": [scenario.title for scenario in scenarios]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed scenarios"
        )

@router.post("/{scenario_id}/complete", status_code=status.HTTP_200_OK)
async def record_scenario_completion(
    scenario_id: int,
    score: int = Query(..., ge=0, le=100, description="Session score (0-100)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record a scenario completion and update statistics"""
    try:
        scenario = ScenarioService.update_scenario_completion(db, scenario_id, score)
        
        if not scenario:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Scenario not found"
            )
        
        return {
            "message": "Scenario completion recorded",
            "scenario_id": scenario_id,
            "new_completion_count": scenario.completion_count,
            "new_average_score": scenario.average_score
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record completion"
        )