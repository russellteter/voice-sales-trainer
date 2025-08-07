"""
Learning API Endpoints
Provides REST API endpoints for learning intelligence functionality
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from services.claude_learning_service import LearningIntelligenceService
from services.knowledge_service import KnowledgeService
from integrations.claude import ClaudeAPIClient, MollickFrameworkStep, AssessmentDimension
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/learning", tags=["learning"])

# Initialize services
learning_service = LearningIntelligenceService()
knowledge_service = KnowledgeService()

# Request/Response Models

class SessionConfigRequest(BaseModel):
    """Request model for starting a learning session"""
    scenario_type: str = Field(default="cold_call", description="Type of sales scenario")
    prospect_persona: str = Field(default="enterprise_vp", description="Prospect persona to roleplay")
    difficulty_level: int = Field(default=2, ge=1, le=5, description="Difficulty level 1-5")
    learning_objectives: List[str] = Field(
        default=["Practice discovery questions", "Handle objections effectively"], 
        description="Learning objectives for the session"
    )
    company_context: Optional[Dict[str, Any]] = Field(default=None, description="Company-specific context")
    user_preferences: Optional[Dict[str, Any]] = Field(default=None, description="User preferences")

class ConversationTurnRequest(BaseModel):
    """Request model for processing conversation turns"""
    session_id: str = Field(description="Active session ID")
    user_input: str = Field(description="User's input/response")
    ai_response: str = Field(description="AI's response to analyze")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Turn timestamp")

class EnhancementRequest(BaseModel):
    """Request model for enhancing AI responses"""
    session_id: str = Field(description="Active session ID")
    user_input: str = Field(description="User's input to respond to")
    context_override: Optional[Dict[str, Any]] = Field(default=None, description="Context overrides")

class KnowledgeQueryRequest(BaseModel):
    """Request model for knowledge base queries"""
    query: str = Field(description="Knowledge query string")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Query context")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum results to return")

class SessionResponse(BaseModel):
    """Response model for session operations"""
    session_id: str
    status: str
    message: str
    session_data: Optional[Dict[str, Any]] = None

class AnalysisResponse(BaseModel):
    """Response model for conversation analysis"""
    analysis: Dict[str, Any]
    coaching_feedback: List[Dict[str, Any]]
    current_step: str
    skill_progression: Dict[str, Any]
    adaptive_adjustments: Dict[str, Any]
    session_metrics: Dict[str, Any]
    processing_time_ms: float

class FeedbackResponse(BaseModel):
    """Response model for structured feedback"""
    coaching_feedback: Dict[str, Any]
    session_insights: Dict[str, Any]
    performance_trends: Dict[str, Any]
    skill_development_recommendations: List[str]
    next_session_suggestions: Dict[str, Any]
    overall_progress: Dict[str, Any]

class PerformanceResponse(BaseModel):
    """Response model for performance analytics"""
    skill_progression: Dict[str, Any]
    performance_metrics: Dict[str, Any]
    learning_insights: Dict[str, Any]
    session_summary: Dict[str, Any]
    recommendations: List[str]

# Dependency functions

async def get_learning_service() -> LearningIntelligenceService:
    """Get learning intelligence service instance"""
    return learning_service

async def get_knowledge_service() -> KnowledgeService:
    """Get knowledge service instance"""
    return knowledge_service

async def validate_session_id(session_id: str, service: LearningIntelligenceService = Depends(get_learning_service)):
    """Validate that session ID exists"""
    if session_id not in service.active_sessions:
        raise HTTPException(status_code=404, detail=f"Session {session_id} not found")
    return session_id

# API Endpoints

@router.post("/sessions/start", response_model=SessionResponse)
async def start_learning_session(
    config: SessionConfigRequest,
    user_id: str,  # This would typically come from authentication
    service: LearningIntelligenceService = Depends(get_learning_service)
):
    """
    Start a new learning session with intelligent configuration
    """
    try:
        session_config = {
            "scenario_type": config.scenario_type,
            "prospect_persona": config.prospect_persona,
            "difficulty_level": config.difficulty_level,
            "learning_objectives": config.learning_objectives,
            "company_context": config.company_context or {},
            "user_preferences": config.user_preferences or {}
        }
        
        session_id = await service.start_learning_session(user_id, session_config)
        
        logger.info(f"Started learning session {session_id} for user {user_id}")
        
        return SessionResponse(
            session_id=session_id,
            status="started",
            message="Learning session started successfully",
            session_data={
                "scenario_type": config.scenario_type,
                "prospect_persona": config.prospect_persona,
                "difficulty_level": config.difficulty_level,
                "learning_objectives": config.learning_objectives,
                "current_step": MollickFrameworkStep.CONTEXT_GATHERING.name
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to start learning session: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_conversation(
    request: ConversationTurnRequest,
    service: LearningIntelligenceService = Depends(get_learning_service),
    session_id: str = Depends(validate_session_id)
):
    """
    Analyze a conversation turn for learning effectiveness
    Provides detailed assessment across multiple dimensions with real-time coaching
    """
    try:
        start_time = datetime.utcnow()
        
        # Process the conversation turn
        result = await service.process_conversation_turn(
            request.session_id,
            request.user_input,
            request.ai_response
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        logger.info(f"Analyzed conversation turn for session {request.session_id}")
        
        return AnalysisResponse(
            analysis=result["analysis"],
            coaching_feedback=result["coaching_feedback"],
            current_step=result["current_step"],
            skill_progression=result["skill_progression"],
            adaptive_adjustments=result["adaptive_adjustments"],
            session_metrics=result["session_metrics"],
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to analyze conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/enhance")
async def enhance_response(
    request: EnhancementRequest,
    service: LearningIntelligenceService = Depends(get_learning_service),
    session_id: str = Depends(validate_session_id)
):
    """
    Enhance AI responses with learning context
    Generates contextually appropriate responses based on learning framework
    """
    try:
        result = await service.generate_enhanced_response(
            request.session_id,
            request.user_input
        )
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info(f"Enhanced response generated for session {request.session_id}")
        
        return {
            "enhanced_response": result["enhanced_response"],
            "coaching_metadata": result["coaching_metadata"],
            "confidence": result["confidence"],
            "processing_time_ms": result["processing_time_ms"],
            "framework_step": result["coaching_metadata"].get("current_step"),
            "adaptive_parameters": result["coaching_metadata"].get("adaptive_adjustments", {})
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to enhance response: {e}")
        raise HTTPException(status_code=500, detail=f"Enhancement failed: {str(e)}")

@router.get("/feedback/{session_id}", response_model=FeedbackResponse)
async def get_structured_feedback(
    session_id: str = Depends(validate_session_id),
    service: LearningIntelligenceService = Depends(get_learning_service)
):
    """
    Get comprehensive structured feedback for a learning session
    Provides evidence-based coaching feedback and improvement suggestions
    """
    try:
        result = await service.get_structured_feedback(session_id)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info(f"Generated structured feedback for session {session_id}")
        
        return FeedbackResponse(
            coaching_feedback=result["coaching_feedback"],
            session_insights=result["session_insights"],
            performance_trends=result["performance_trends"],
            skill_development_recommendations=result["skill_development_recommendations"],
            next_session_suggestions=result["next_session_suggestions"],
            overall_progress=result["overall_progress"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get structured feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Feedback generation failed: {str(e)}")

@router.post("/knowledge/query")
async def query_knowledge_base(
    request: KnowledgeQueryRequest,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Query the knowledge base for relevant information
    Returns contextual knowledge based on query and context parameters
    """
    try:
        contextual_knowledge = await service.query_contextual_knowledge(
            request.query,
            request.context or {}
        )
        
        # Convert to serializable format
        result = {
            "relevant_entries": [asdict(entry) for entry in contextual_knowledge.relevant_entries],
            "methodology_guidance": contextual_knowledge.methodology_guidance,
            "industry_insights": contextual_knowledge.industry_insights,
            "objection_responses": contextual_knowledge.objection_responses,
            "value_propositions": contextual_knowledge.value_propositions,
            "conversation_starters": contextual_knowledge.conversation_starters,
            "closing_techniques": contextual_knowledge.closing_techniques,
            "query": request.query,
            "context_used": request.context or {},
            "total_entries_found": len(contextual_knowledge.relevant_entries)
        }
        
        logger.info(f"Knowledge base query completed: '{request.query}' - {len(contextual_knowledge.relevant_entries)} results")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to query knowledge base: {e}")
        raise HTTPException(status_code=500, detail=f"Knowledge query failed: {str(e)}")

@router.get("/performance/{user_id}", response_model=PerformanceResponse)
async def get_learning_performance(
    user_id: str,
    days_back: int = 30,
    service: LearningIntelligenceService = Depends(get_learning_service)
):
    """
    Get comprehensive learning performance metrics for a user
    Analyzes skill progression, trends, and provides personalized recommendations
    """
    try:
        result = await service.get_performance_analytics(user_id, days_back)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info(f"Generated performance analytics for user {user_id}")
        
        return PerformanceResponse(
            skill_progression=result["skill_progression"],
            performance_metrics=result["performance_metrics"],
            learning_insights=result["learning_insights"],
            session_summary=result["session_summary"],
            recommendations=result["recommendations"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get performance analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Performance analytics failed: {str(e)}")

@router.post("/sessions/{session_id}/end")
async def end_learning_session(
    session_id: str = Depends(validate_session_id),
    service: LearningIntelligenceService = Depends(get_learning_service)
):
    """
    End a learning session and generate final summary
    Provides comprehensive session report and recommendations for next steps
    """
    try:
        result = await service.end_learning_session(session_id)
        
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        
        logger.info(f"Ended learning session {session_id}")
        
        return {
            "session_id": session_id,
            "status": "completed",
            "message": "Learning session completed successfully",
            "final_report": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to end learning session: {e}")
        raise HTTPException(status_code=500, detail=f"Session ending failed: {str(e)}")

@router.get("/sessions/active")
async def get_active_sessions(
    user_id: Optional[str] = None,
    service: LearningIntelligenceService = Depends(get_learning_service)
):
    """
    Get active learning sessions, optionally filtered by user ID
    """
    try:
        active_sessions = {}
        
        for session_id, session in service.active_sessions.items():
            if user_id is None or session.user_id == user_id:
                active_sessions[session_id] = {
                    "session_id": session.session_id,
                    "user_id": session.user_id,
                    "scenario_type": session.scenario_type,
                    "prospect_persona": session.prospect_persona,
                    "difficulty_level": session.difficulty_level,
                    "current_step": session.current_step.name,
                    "start_time": session.start_time.isoformat(),
                    "turn_count": len(session.conversation_analyses),
                    "session_metrics": session.session_metrics
                }
        
        return {
            "active_sessions": active_sessions,
            "total_count": len(active_sessions)
        }
        
    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")

@router.get("/knowledge/objections/{objection_type}")
async def get_objection_handling_guide(
    objection_type: str,
    methodology: Optional[str] = None,
    industry: Optional[str] = None,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Get specific objection handling guidance
    Provides methodology-specific and industry-specific objection responses
    """
    try:
        # Convert string parameters to enums if provided
        methodology_enum = None
        if methodology:
            try:
                from services.knowledge_service import SalesMethodology
                methodology_enum = SalesMethodology(methodology)
            except ValueError:
                pass  # Invalid methodology, continue without it
        
        industry_enum = None
        if industry:
            try:
                from services.knowledge_service import IndustryType
                industry_enum = IndustryType(industry)
            except ValueError:
                pass  # Invalid industry, continue without it
        
        result = await service.get_objection_handling_guide(
            objection_type,
            methodology_enum,
            industry_enum
        )
        
        logger.info(f"Generated objection handling guide for '{objection_type}'")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to get objection handling guide: {e}")
        raise HTTPException(status_code=500, detail=f"Objection guide failed: {str(e)}")

@router.post("/knowledge/value-proposition")
async def build_value_proposition(
    prospect_context: Dict[str, Any],
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Build value propositions based on prospect context
    Generates contextual value propositions with supporting evidence
    """
    try:
        result = await service.get_value_proposition_builder(prospect_context)
        
        logger.info("Generated value proposition based on prospect context")
        
        return {
            "value_propositions": result,
            "prospect_context": prospect_context
        }
        
    except Exception as e:
        logger.error(f"Failed to build value proposition: {e}")
        raise HTTPException(status_code=500, detail=f"Value proposition building failed: {str(e)}")

@router.get("/frameworks/{scenario_type}/{methodology}")
async def get_conversation_framework(
    scenario_type: str,
    methodology: str,
    service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Get conversation framework for specific scenario and methodology
    Provides structured guidance for conversation flow
    """
    try:
        # Convert methodology string to enum
        try:
            from services.knowledge_service import SalesMethodology
            methodology_enum = SalesMethodology(methodology)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid methodology: {methodology}")
        
        result = await service.get_conversation_framework(scenario_type, methodology_enum)
        
        logger.info(f"Generated conversation framework for {scenario_type} using {methodology}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get conversation framework: {e}")
        raise HTTPException(status_code=500, detail=f"Framework retrieval failed: {str(e)}")

@router.get("/health")
async def health_check(
    learning_service: LearningIntelligenceService = Depends(get_learning_service),
    knowledge_service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Perform health check of learning API and services
    """
    try:
        # Check learning service health
        learning_health = await learning_service.health_check()
        
        # Check knowledge service health  
        knowledge_health = await knowledge_service.health_check()
        
        # Overall health status
        overall_status = "healthy" if (
            learning_health["status"] == "healthy" and 
            knowledge_health["status"] == "healthy"
        ) else "unhealthy"
        
        return {
            "status": overall_status,
            "service": "learning_api",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {
                "learning_intelligence": learning_health,
                "knowledge_management": knowledge_health
            },
            "api_info": {
                "version": "1.0.0",
                "endpoints_available": 12,
                "claude_integration": learning_health.get("claude_integration", {})
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "learning_api",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }

@router.get("/metrics")
async def get_api_metrics(
    learning_service: LearningIntelligenceService = Depends(get_learning_service),
    knowledge_service: KnowledgeService = Depends(get_knowledge_service)
):
    """
    Get API usage metrics and statistics
    """
    try:
        # Get Claude usage metrics
        claude_client = learning_service.claude_client
        claude_metrics = claude_client.get_usage_metrics()
        
        # Get knowledge service metrics
        knowledge_stats = knowledge_service.get_usage_statistics()
        
        # Get session metrics
        session_metrics = {
            "active_sessions": len(learning_service.active_sessions),
            "total_users": len(learning_service.user_performance),
            "session_history_size": sum(
                len(sessions) for sessions in learning_service.session_history.values()
            )
        }
        
        return {
            "claude_api_usage": claude_metrics,
            "knowledge_base_usage": knowledge_stats,
            "session_metrics": session_metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get API metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics retrieval failed: {str(e)}")

# Background task endpoints

@router.post("/sessions/{session_id}/background-analysis")
async def trigger_background_analysis(
    session_id: str,
    background_tasks: BackgroundTasks,
    service: LearningIntelligenceService = Depends(get_learning_service),
    validated_session_id: str = Depends(validate_session_id)
):
    """
    Trigger background analysis for comprehensive session insights
    Useful for detailed analysis that might take longer
    """
    try:
        # Add background task for comprehensive analysis
        background_tasks.add_task(
            _perform_background_analysis,
            service,
            session_id
        )
        
        return {
            "message": "Background analysis initiated",
            "session_id": session_id,
            "status": "processing"
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger background analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Background analysis failed: {str(e)}")

# Background task functions

async def _perform_background_analysis(service: LearningIntelligenceService, session_id: str):
    """
    Perform comprehensive background analysis of a learning session
    """
    try:
        logger.info(f"Starting background analysis for session {session_id}")
        
        # This could include more intensive analysis like:
        # - Detailed conversation pattern analysis
        # - Cross-session comparison
        # - Advanced skill progression modeling
        # - Personalized learning path optimization
        
        await asyncio.sleep(1)  # Simulate analysis time
        
        logger.info(f"Completed background analysis for session {session_id}")
        
    except Exception as e:
        logger.error(f"Background analysis failed for session {session_id}: {e}")