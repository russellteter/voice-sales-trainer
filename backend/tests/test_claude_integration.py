"""
Comprehensive Test Suite for Claude API Integration
Tests for Claude learning intelligence components, API endpoints, and integration reliability
"""

import pytest
import asyncio
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from httpx import AsyncClient
import pytest_asyncio

# Import the modules we're testing
from integrations.claude import (
    ClaudeAPIClient, 
    MollickFrameworkStep, 
    AssessmentDimension,
    ConversationAnalysis,
    CoachingFeedback
)
from services.claude_learning_service import LearningIntelligenceService, LearningSession
from services.knowledge_service import KnowledgeService, SalesMethodology, IndustryType
from api.learning import router as learning_router
from prompts.simulation_prompts import SimulationPromptTemplates, MollickStep, PromptContext
from prompts.assessment_prompts import AssessmentPromptTemplates, AssessmentType, AssessmentContext

# Test configuration
TEST_USER_ID = "test_user_123"
TEST_SESSION_ID = str(uuid.uuid4())
MOCK_CLAUDE_RESPONSE = {
    "content": [{"text": "This is a mock Claude API response for testing."}],
    "usage": {"input_tokens": 50, "output_tokens": 25},
    "model": "claude-3-sonnet-20240229"
}

class TestClaudeAPIClient:
    """Test suite for Claude API client functionality"""

    @pytest.fixture
    async def claude_client(self):
        """Create a Claude API client for testing"""
        return ClaudeAPIClient()

    @pytest.fixture
    def mock_claude_response(self):
        """Mock Claude API response"""
        return MOCK_CLAUDE_RESPONSE

    @pytest.mark.asyncio
    async def test_client_initialization(self, claude_client):
        """Test proper client initialization"""
        assert claude_client is not None
        assert claude_client.model == "claude-3-sonnet-20240229"
        assert claude_client.max_tokens == 1000
        assert claude_client.temperature == 0.7
        
    @pytest.mark.asyncio
    async def test_health_check(self, claude_client):
        """Test Claude API health check"""
        with patch.object(claude_client, '_make_api_call', return_value={"status": "healthy"}):
            health_status = await claude_client.health_check()
            assert health_status["status"] == "healthy"
            assert "claude_api_key_configured" in health_status
            assert "model_configured" in health_status

    @pytest.mark.asyncio
    async def test_conversation_analysis(self, claude_client, mock_claude_response):
        """Test conversation analysis functionality"""
        user_input = "I understand your concerns about the pricing. Let me show you the ROI calculations."
        ai_response = "That sounds interesting. Can you provide specific numbers for our industry?"
        context = {
            "scenario_type": "objection_handling",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 3,
            "conversation_history": []
        }

        with patch.object(claude_client, '_make_api_call', return_value=mock_claude_response):
            analysis = await claude_client.analyze_conversation(user_input, ai_response, context)
            
            assert isinstance(analysis, ConversationAnalysis)
            assert analysis.user_input == user_input
            assert analysis.ai_response == ai_response
            assert len(analysis.dimension_scores) > 0
            assert all(0 <= score <= 5 for score in analysis.dimension_scores.values())
            assert analysis.overall_score >= 0
            assert len(analysis.coaching_feedback) >= 0

    @pytest.mark.asyncio
    async def test_enhanced_response_generation(self, claude_client, mock_claude_response):
        """Test enhanced response generation"""
        user_input = "What's your biggest challenge in sales right now?"
        context = {
            "scenario_type": "cold_call",
            "prospect_persona": "smb_owner",
            "current_step": MollickFrameworkStep.INTERACTIVE_ROLEPLAY,
            "conversation_history": []
        }

        with patch.object(claude_client, '_make_api_call', return_value=mock_claude_response):
            result = await claude_client.generate_enhanced_response(user_input, context)
            
            assert "enhanced_response" in result
            assert "coaching_metadata" in result
            assert "confidence" in result
            assert 0 <= result["confidence"] <= 1
            assert len(result["enhanced_response"]) > 0

    @pytest.mark.asyncio
    async def test_coaching_feedback_generation(self, claude_client, mock_claude_response):
        """Test coaching feedback generation"""
        conversation_data = {
            "user_input": "Do you have budget for this solution?",
            "ai_response": "Budget is always a concern, but ROI is what matters most.",
            "context": {
                "scenario_type": "discovery",
                "skill_focus": ["discovery_questions", "objection_handling"]
            }
        }

        with patch.object(claude_client, '_make_api_call', return_value=mock_claude_response):
            feedback = await claude_client.generate_coaching_feedback(conversation_data)
            
            assert isinstance(feedback, list)
            for item in feedback:
                assert isinstance(item, CoachingFeedback)
                assert item.message is not None
                assert item.feedback_type in ["positive", "improvement", "technique", "strategy"]
                assert 1 <= item.priority <= 5

    @pytest.mark.asyncio
    async def test_error_handling(self, claude_client):
        """Test error handling in API calls"""
        with patch.object(claude_client, '_make_api_call', side_effect=Exception("API Error")):
            result = await claude_client.analyze_conversation("test", "test", {})
            assert result is None
            
            # Check that usage metrics capture errors
            metrics = claude_client.get_usage_metrics()
            assert metrics["error_count"] > 0

    @pytest.mark.asyncio
    async def test_usage_metrics_tracking(self, claude_client, mock_claude_response):
        """Test usage metrics tracking"""
        initial_metrics = claude_client.get_usage_metrics()
        initial_calls = initial_metrics["total_api_calls"]
        
        with patch.object(claude_client, '_make_api_call', return_value=mock_claude_response):
            await claude_client.analyze_conversation("test", "test", {})
        
        updated_metrics = claude_client.get_usage_metrics()
        assert updated_metrics["total_api_calls"] == initial_calls + 1
        assert updated_metrics["total_tokens_used"] > initial_metrics["total_tokens_used"]

    @pytest.mark.asyncio
    async def test_rate_limit_handling(self, claude_client):
        """Test rate limit handling"""
        # Simulate rate limit exceeded
        with patch.object(claude_client, '_make_api_call', side_effect=Exception("Rate limit exceeded")):
            result = await claude_client.analyze_conversation("test", "test", {})
            assert result is None
            
            # Verify rate limit metrics
            metrics = claude_client.get_usage_metrics()
            assert metrics["rate_limit_hits"] > 0

class TestLearningIntelligenceService:
    """Test suite for Learning Intelligence Service"""

    @pytest.fixture
    async def learning_service(self):
        """Create a learning service for testing"""
        return LearningIntelligenceService()

    @pytest.fixture
    def session_config(self):
        """Test session configuration"""
        return {
            "scenario_type": "cold_call",
            "prospect_persona": "enterprise_vp", 
            "difficulty_level": 2,
            "learning_objectives": ["Practice discovery questions", "Handle objections"],
            "company_context": {"industry": "technology"},
            "user_preferences": {"real_time_coaching": True}
        }

    @pytest.mark.asyncio
    async def test_start_learning_session(self, learning_service, session_config):
        """Test starting a learning session"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        
        assert session_id is not None
        assert session_id in learning_service.active_sessions
        
        session = learning_service.active_sessions[session_id]
        assert session.user_id == TEST_USER_ID
        assert session.scenario_type == "cold_call"
        assert session.prospect_persona == "enterprise_vp"
        assert session.difficulty_level == 2
        assert session.current_step == MollickFrameworkStep.CONTEXT_GATHERING

    @pytest.mark.asyncio
    async def test_process_conversation_turn(self, learning_service, session_config):
        """Test processing conversation turns"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        
        user_input = "Hi, I'm calling from XYZ Company. Do you have a few minutes to chat?"
        ai_response = "Actually, I'm quite busy right now. What's this about?"

        with patch.object(learning_service.claude_client, 'analyze_conversation') as mock_analyze:
            mock_analysis = Mock(spec=ConversationAnalysis)
            mock_analysis.dimension_scores = {
                "discovery_questions": 2.5,
                "objection_handling": 3.0,
                "value_articulation": 2.8
            }
            mock_analysis.overall_score = 2.8
            mock_analysis.coaching_feedback = []
            mock_analyze.return_value = mock_analysis

            result = await learning_service.process_conversation_turn(
                session_id, user_input, ai_response
            )
            
            assert "analysis" in result
            assert "coaching_feedback" in result
            assert "current_step" in result
            assert "skill_progression" in result
            
            # Verify session was updated
            session = learning_service.active_sessions[session_id]
            assert len(session.conversation_analyses) == 1

    @pytest.mark.asyncio
    async def test_generate_enhanced_response(self, learning_service, session_config):
        """Test enhanced response generation"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        
        user_input = "What are your main challenges with your current sales process?"

        with patch.object(learning_service.claude_client, 'generate_enhanced_response') as mock_generate:
            mock_generate.return_value = {
                "enhanced_response": "Our biggest challenge is qualifying prospects effectively...",
                "coaching_metadata": {"current_step": "discovery", "technique_used": "open_question"},
                "confidence": 0.92
            }

            result = await learning_service.generate_enhanced_response(session_id, user_input)
            
            assert "enhanced_response" in result
            assert "coaching_metadata" in result
            assert "confidence" in result
            assert result["confidence"] > 0.8

    @pytest.mark.asyncio
    async def test_get_structured_feedback(self, learning_service, session_config):
        """Test structured feedback generation"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        
        # Add some conversation history
        session = learning_service.active_sessions[session_id]
        mock_analysis = Mock(spec=ConversationAnalysis)
        mock_analysis.dimension_scores = {"discovery_questions": 3.5, "objection_handling": 2.8}
        mock_analysis.overall_score = 3.1
        session.conversation_analyses.append(mock_analysis)

        with patch.object(learning_service.claude_client, 'generate_coaching_feedback') as mock_feedback:
            mock_feedback.return_value = [
                CoachingFeedback(
                    message="Great use of open-ended questions!",
                    feedback_type="positive",
                    priority=3,
                    technique="discovery_questions"
                )
            ]

            result = await learning_service.get_structured_feedback(session_id)
            
            assert "coaching_feedback" in result
            assert "session_insights" in result
            assert "performance_trends" in result
            assert "skill_development_recommendations" in result

    @pytest.mark.asyncio
    async def test_performance_analytics(self, learning_service, session_config):
        """Test performance analytics generation"""
        # Create multiple sessions for analytics
        for i in range(3):
            session_id = await learning_service.start_learning_session(f"{TEST_USER_ID}_{i}", session_config)
            
            # Add mock session data
            if TEST_USER_ID not in learning_service.user_performance:
                learning_service.user_performance[TEST_USER_ID] = {
                    "overall_progression": {"current_level": 2.5, "starting_level": 2.0},
                    "skill_scores": {"discovery_questions": [2.0, 2.3, 2.7]},
                    "session_count": 3,
                    "total_practice_time": 1800
                }

        result = await learning_service.get_performance_analytics(TEST_USER_ID, days_back=30)
        
        assert "skill_progression" in result
        assert "performance_metrics" in result
        assert "learning_insights" in result
        assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_adaptive_difficulty_adjustment(self, learning_service, session_config):
        """Test adaptive difficulty adjustment"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        session = learning_service.active_sessions[session_id]
        
        # Simulate high performance
        for _ in range(3):
            mock_analysis = Mock(spec=ConversationAnalysis)
            mock_analysis.overall_score = 4.2
            session.conversation_analyses.append(mock_analysis)
        
        adjustments = learning_service._calculate_adaptive_adjustments(session)
        
        assert "difficulty_adjustment" in adjustments
        assert "coaching_intensity" in adjustments
        
        # High performance should suggest increased difficulty
        if adjustments["difficulty_adjustment"] != "maintain":
            assert adjustments["difficulty_adjustment"] == "increase"

    @pytest.mark.asyncio
    async def test_session_cleanup(self, learning_service, session_config):
        """Test session cleanup and resource management"""
        session_id = await learning_service.start_learning_session(TEST_USER_ID, session_config)
        
        # Verify session exists
        assert session_id in learning_service.active_sessions
        
        # End session
        result = await learning_service.end_learning_session(session_id)
        
        # Verify cleanup
        assert session_id not in learning_service.active_sessions
        assert "session_summary" in result
        assert "final_performance" in result

class TestKnowledgeService:
    """Test suite for Knowledge Service"""

    @pytest.fixture
    def knowledge_service(self):
        """Create a knowledge service for testing"""
        return KnowledgeService()

    @pytest.mark.asyncio
    async def test_contextual_knowledge_query(self, knowledge_service):
        """Test contextual knowledge querying"""
        query = "How to handle price objections"
        context = {
            "scenario_type": "objection_handling",
            "industry": "technology",
            "methodology": "spin"
        }
        
        result = await knowledge_service.query_contextual_knowledge(query, context)
        
        assert len(result.relevant_entries) > 0
        assert result.methodology_guidance is not None
        assert len(result.objection_responses) > 0

    @pytest.mark.asyncio
    async def test_objection_handling_guide(self, knowledge_service):
        """Test objection handling guide generation"""
        result = await knowledge_service.get_objection_handling_guide(
            "price_too_high",
            SalesMethodology.SPIN,
            IndustryType.TECHNOLOGY
        )
        
        assert "acknowledgment_phrases" in result
        assert "discovery_questions" in result
        assert "reframe_techniques" in result
        assert "value_reinforcement" in result

    @pytest.mark.asyncio
    async def test_value_proposition_builder(self, knowledge_service):
        """Test value proposition building"""
        prospect_context = {
            "industry": "healthcare",
            "company_size": "enterprise",
            "pain_points": ["inefficient processes", "high costs"],
            "decision_criteria": ["ROI", "compliance", "scalability"]
        }
        
        result = await knowledge_service.get_value_proposition_builder(prospect_context)
        
        assert len(result) > 0
        for vp in result:
            assert "value_statement" in vp
            assert "supporting_evidence" in vp
            assert "quantified_benefits" in vp

    @pytest.mark.asyncio
    async def test_conversation_framework(self, knowledge_service):
        """Test conversation framework retrieval"""
        result = await knowledge_service.get_conversation_framework(
            "discovery_call", 
            SalesMethodology.CHALLENGER
        )
        
        assert "conversation_structure" in result
        assert "key_questions" in result
        assert "transition_phrases" in result
        assert "success_criteria" in result

class TestPromptTemplates:
    """Test suite for prompt templates"""

    @pytest.fixture
    def simulation_templates(self):
        """Create simulation prompt templates"""
        return SimulationPromptTemplates()

    @pytest.fixture
    def assessment_templates(self):
        """Create assessment prompt templates"""
        return AssessmentPromptTemplates()

    @pytest.fixture
    def prompt_context(self):
        """Create prompt context for testing"""
        return PromptContext(
            user_name="test_user",
            scenario_type="cold_call",
            prospect_persona="enterprise_vp",
            difficulty_level=2,
            learning_objectives=["Practice discovery", "Handle objections"]
        )

    def test_simulation_prompt_generation(self, simulation_templates, prompt_context):
        """Test simulation prompt generation"""
        for step in MollickStep:
            prompt = simulation_templates.get_step_prompt(step, prompt_context)
            assert len(prompt) > 0
            assert prompt_context.user_name in prompt or "learner" in prompt
            
            system_prompt = simulation_templates.get_system_prompt(step, prompt_context)
            assert len(system_prompt) > 0

    def test_assessment_prompt_generation(self, assessment_templates):
        """Test assessment prompt generation"""
        context = AssessmentContext(
            user_input="What's your biggest challenge?",
            ai_response="Our main issue is lead qualification.",
            conversation_history=[],
            session_context={"scenario_type": "discovery"},
            learning_objectives=["Improve questioning"]
        )
        
        for assessment_type in AssessmentType:
            prompt = assessment_templates.get_assessment_prompt(assessment_type, context)
            assert len(prompt) > 0
            assert context.user_input in prompt
            
    def test_adaptive_prompt_variation(self, simulation_templates, prompt_context):
        """Test adaptive prompt variations"""
        performance_history = {
            "consistent_strengths": ["active_listening"],
            "development_focus": ["objection_handling"],
            "confidence_trend": "increasing"
        }
        
        base_prompt = simulation_templates.get_step_prompt(MollickStep.INTERACTIVE_ROLEPLAY, prompt_context)
        adaptive_prompt = simulation_templates.get_adaptive_prompt_variation(
            MollickStep.INTERACTIVE_ROLEPLAY, 
            prompt_context, 
            performance_history
        )
        
        assert len(adaptive_prompt) >= len(base_prompt)
        assert "active_listening" in adaptive_prompt.lower()

    def test_micro_coaching_prompts(self, simulation_templates, prompt_context):
        """Test micro-coaching prompt generation"""
        situations = ["awkward_silence", "strong_objection", "buying_signal"]
        
        for situation in situations:
            result = simulation_templates.get_micro_coaching_prompts(situation, prompt_context)
            assert "coaching_hint" in result
            assert "situation" in result
            assert len(result["coaching_hint"]) > 0

class TestLearningAPI:
    """Test suite for Learning API endpoints"""

    @pytest.fixture
    def client(self):
        """Create test client"""
        from main import app
        app.include_router(learning_router)
        return TestClient(app)

    @pytest.fixture
    def session_config(self):
        """Test session configuration"""
        return {
            "scenario_type": "cold_call",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 2,
            "learning_objectives": ["Practice discovery questions"],
            "company_context": {"industry": "technology"}
        }

    def test_health_check_endpoint(self, client):
        """Test health check endpoint"""
        response = client.get("/learning/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "service" in data
        assert data["service"] == "learning_api"

    def test_start_learning_session_endpoint(self, client, session_config):
        """Test start learning session endpoint"""
        response = client.post(
            "/learning/sessions/start",
            json=session_config,
            headers={"X-User-ID": TEST_USER_ID}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "started"
        
        return data["session_id"]

    def test_analyze_conversation_endpoint(self, client, session_config):
        """Test conversation analysis endpoint"""
        # First start a session
        session_id = self.test_start_learning_session_endpoint(client, session_config)
        
        # Then analyze a conversation
        analysis_data = {
            "session_id": session_id,
            "user_input": "Hi, I'm calling about your sales process challenges.",
            "ai_response": "Interesting. Tell me more about what you're offering."
        }
        
        response = client.post("/learning/analyze", json=analysis_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "analysis" in data
        assert "coaching_feedback" in data
        assert "processing_time_ms" in data

    def test_knowledge_query_endpoint(self, client):
        """Test knowledge query endpoint"""
        query_data = {
            "query": "best practices for cold calling",
            "context": {"industry": "technology"},
            "max_results": 5
        }
        
        response = client.post("/learning/knowledge/query", json=query_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "relevant_entries" in data
        assert "total_entries_found" in data

    def test_performance_analytics_endpoint(self, client):
        """Test performance analytics endpoint"""
        response = client.get(f"/learning/performance/{TEST_USER_ID}?days_back=30")
        assert response.status_code == 200
        
        data = response.json()
        assert "skill_progression" in data
        assert "performance_metrics" in data
        assert "recommendations" in data

    def test_error_handling(self, client):
        """Test API error handling"""
        # Test with invalid session ID
        response = client.post("/learning/analyze", json={
            "session_id": "invalid_session_id",
            "user_input": "test",
            "ai_response": "test"
        })
        assert response.status_code == 404

class TestIntegrationScenarios:
    """End-to-end integration tests"""

    @pytest.fixture
    def full_stack_setup(self):
        """Setup full integration testing environment"""
        learning_service = LearningIntelligenceService()
        knowledge_service = KnowledgeService()
        return {
            "learning_service": learning_service,
            "knowledge_service": knowledge_service
        }

    @pytest.mark.asyncio
    async def test_complete_learning_session_flow(self, full_stack_setup):
        """Test complete learning session from start to finish"""
        learning_service = full_stack_setup["learning_service"]
        
        # 1. Start session
        config = {
            "scenario_type": "objection_handling",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 2,
            "learning_objectives": ["Handle price objections", "Build value"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        assert session_id in learning_service.active_sessions
        
        # 2. Process several conversation turns
        conversations = [
            ("Your solution seems expensive compared to our current setup.", "I understand cost is a concern..."),
            ("What makes your pricing justified?", "Let me show you the ROI analysis..."),
            ("I need to think about it.", "Of course, what specific concerns can I address?")
        ]
        
        for user_input, ai_response in conversations:
            with patch.object(learning_service.claude_client, 'analyze_conversation') as mock_analyze:
                mock_analysis = Mock(spec=ConversationAnalysis)
                mock_analysis.dimension_scores = {
                    "objection_handling": 3.2 + (len(conversations) * 0.1),
                    "value_articulation": 2.8 + (len(conversations) * 0.1)
                }
                mock_analysis.overall_score = 3.0 + (len(conversations) * 0.1)
                mock_analysis.coaching_feedback = []
                mock_analyze.return_value = mock_analysis
                
                result = await learning_service.process_conversation_turn(
                    session_id, user_input, ai_response
                )
                assert "analysis" in result
        
        # 3. Get structured feedback
        feedback = await learning_service.get_structured_feedback(session_id)
        assert "coaching_feedback" in feedback
        assert "skill_development_recommendations" in feedback
        
        # 4. End session
        final_report = await learning_service.end_learning_session(session_id)
        assert "session_summary" in final_report
        assert session_id not in learning_service.active_sessions

    @pytest.mark.asyncio
    async def test_adaptive_learning_progression(self, full_stack_setup):
        """Test adaptive difficulty and learning progression"""
        learning_service = full_stack_setup["learning_service"]
        
        config = {
            "scenario_type": "cold_call",
            "prospect_persona": "smb_owner",
            "difficulty_level": 1,  # Start easy
            "learning_objectives": ["Practice opening", "Generate interest"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        session = learning_service.active_sessions[session_id]
        
        # Simulate consistently high performance
        with patch.object(learning_service.claude_client, 'analyze_conversation') as mock_analyze:
            mock_analysis = Mock(spec=ConversationAnalysis)
            mock_analysis.dimension_scores = {"discovery_questions": 4.5, "value_articulation": 4.2}
            mock_analysis.overall_score = 4.3
            mock_analysis.coaching_feedback = []
            mock_analyze.return_value = mock_analysis
            
            # Process multiple high-performance turns
            for i in range(5):
                await learning_service.process_conversation_turn(
                    session_id, 
                    f"Test input {i}",
                    f"Test response {i}"
                )
        
        # Check adaptive adjustments
        adjustments = learning_service._calculate_adaptive_adjustments(session)
        
        # Should suggest increasing difficulty due to high performance
        assert "difficulty_adjustment" in adjustments
        
        # Performance analytics should show improvement
        analytics = await learning_service.get_performance_analytics(TEST_USER_ID, 30)
        assert analytics["skill_progression"]["overall_progress_score"] > 3.0

    @pytest.mark.asyncio
    async def test_knowledge_integration_in_coaching(self, full_stack_setup):
        """Test knowledge service integration in coaching"""
        learning_service = full_stack_setup["learning_service"]
        knowledge_service = full_stack_setup["knowledge_service"]
        
        # Test that coaching incorporates relevant knowledge
        objection_guide = await knowledge_service.get_objection_handling_guide(
            "price_too_high",
            SalesMethodology.CHALLENGER,
            IndustryType.TECHNOLOGY
        )
        
        assert "acknowledgment_phrases" in objection_guide
        assert "discovery_questions" in objection_guide
        
        # Test value proposition building
        prospect_context = {
            "industry": "technology",
            "company_size": "enterprise",
            "pain_points": ["inefficient sales process"]
        }
        
        value_props = await knowledge_service.get_value_proposition_builder(prospect_context)
        assert len(value_props) > 0
        assert all("value_statement" in vp for vp in value_props)

# Performance and Load Testing

class TestPerformanceAndScalability:
    """Performance and scalability tests"""

    @pytest.mark.asyncio
    async def test_concurrent_sessions(self):
        """Test handling multiple concurrent learning sessions"""
        learning_service = LearningIntelligenceService()
        
        # Create multiple concurrent sessions
        session_tasks = []
        for i in range(10):
            config = {
                "scenario_type": "discovery",
                "prospect_persona": "enterprise_vp",
                "difficulty_level": 2,
                "learning_objectives": ["Practice discovery"]
            }
            task = learning_service.start_learning_session(f"user_{i}", config)
            session_tasks.append(task)
        
        # Wait for all sessions to start
        session_ids = await asyncio.gather(*session_tasks)
        
        # Verify all sessions were created
        assert len(session_ids) == 10
        assert len(learning_service.active_sessions) == 10
        
        # Clean up
        for session_id in session_ids:
            await learning_service.end_learning_session(session_id)

    @pytest.mark.asyncio
    async def test_conversation_processing_latency(self, full_stack_setup):
        """Test conversation processing latency"""
        learning_service = full_stack_setup["learning_service"]
        
        config = {
            "scenario_type": "objection_handling",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 2,
            "learning_objectives": ["Handle objections"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        
        # Measure processing time
        start_time = datetime.utcnow()
        
        with patch.object(learning_service.claude_client, 'analyze_conversation') as mock_analyze:
            mock_analysis = Mock(spec=ConversationAnalysis)
            mock_analysis.dimension_scores = {"objection_handling": 3.5}
            mock_analysis.overall_score = 3.5
            mock_analysis.coaching_feedback = []
            mock_analyze.return_value = mock_analysis
            
            result = await learning_service.process_conversation_turn(
                session_id,
                "Test input for latency measurement",
                "Test response for latency measurement"
            )
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds() * 1000
        
        # Processing should be under 5 seconds (5000ms)
        assert processing_time < 5000
        assert "analysis" in result

    @pytest.mark.asyncio
    async def test_memory_usage_with_long_sessions(self, full_stack_setup):
        """Test memory usage with long conversation sessions"""
        learning_service = full_stack_setup["learning_service"]
        
        config = {
            "scenario_type": "demo",
            "prospect_persona": "startup_founder",
            "difficulty_level": 2,
            "learning_objectives": ["Effective demos"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        session = learning_service.active_sessions[session_id]
        
        # Simulate a long conversation (50 turns)
        with patch.object(learning_service.claude_client, 'analyze_conversation') as mock_analyze:
            mock_analysis = Mock(spec=ConversationAnalysis)
            mock_analysis.dimension_scores = {"value_articulation": 3.0}
            mock_analysis.overall_score = 3.0
            mock_analysis.coaching_feedback = []
            mock_analyze.return_value = mock_analysis
            
            for i in range(50):
                await learning_service.process_conversation_turn(
                    session_id,
                    f"User input turn {i}",
                    f"AI response turn {i}"
                )
        
        # Check conversation history management
        assert len(session.conversation_analyses) <= 50
        
        # Memory should be managed (conversation history shouldn't grow indefinitely)
        # In production, there should be limits on stored conversation history

# Error Recovery and Resilience Testing

class TestErrorRecoveryAndResilience:
    """Error recovery and resilience tests"""

    @pytest.mark.asyncio
    async def test_claude_api_failure_recovery(self):
        """Test recovery from Claude API failures"""
        learning_service = LearningIntelligenceService()
        
        config = {
            "scenario_type": "closing",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 2,
            "learning_objectives": ["Effective closing"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        
        # Simulate API failure
        with patch.object(learning_service.claude_client, 'analyze_conversation', side_effect=Exception("API Failed")):
            result = await learning_service.process_conversation_turn(
                session_id,
                "Test input",
                "Test response"
            )
            
            # Should handle gracefully and return error indication
            assert "error" in result or result is None

    @pytest.mark.asyncio
    async def test_session_recovery_after_service_restart(self):
        """Test session recovery capabilities"""
        # This would test session persistence and recovery
        # In a real implementation, you'd test database persistence
        learning_service = LearningIntelligenceService()
        
        config = {
            "scenario_type": "negotiation",
            "prospect_persona": "smb_owner",
            "difficulty_level": 3,
            "learning_objectives": ["Negotiate effectively"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        
        # Simulate service restart by creating new service instance
        new_service = LearningIntelligenceService()
        
        # In real implementation, this would load from persistent storage
        # For now, just verify session doesn't exist in new service
        assert session_id not in new_service.active_sessions

    @pytest.mark.asyncio
    async def test_malformed_input_handling(self):
        """Test handling of malformed or malicious input"""
        learning_service = LearningIntelligenceService()
        
        config = {
            "scenario_type": "discovery",
            "prospect_persona": "enterprise_vp",
            "difficulty_level": 2,
            "learning_objectives": ["Discovery skills"]
        }
        
        session_id = await learning_service.start_learning_session(TEST_USER_ID, config)
        
        # Test various malformed inputs
        malformed_inputs = [
            "",  # Empty input
            "x" * 10000,  # Extremely long input
            "🚫💀🔥" * 100,  # Emoji spam
            "<script>alert('xss')</script>",  # XSS attempt
            None,  # None input
        ]
        
        for malformed_input in malformed_inputs:
            try:
                result = await learning_service.process_conversation_turn(
                    session_id,
                    str(malformed_input) if malformed_input else "",
                    "Normal AI response"
                )
                # Should either process gracefully or return error
                assert result is not None or "error" in (result or {})
            except Exception as e:
                # Should not crash the service
                assert isinstance(e, (ValueError, TypeError))

# Configuration and Setup Helpers

@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment before each test"""
    # Mock environment variables for testing
    import os
    os.environ["CLAUDE_API_KEY"] = "test_key_123"
    os.environ["CLAUDE_MODEL"] = "claude-3-sonnet-20240229"
    os.environ["CLAUDE_MAX_TOKENS"] = "1000"
    os.environ["CLAUDE_TEMPERATURE"] = "0.7"
    
    yield
    
    # Cleanup after test
    # Any cleanup logic would go here

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--asyncio-mode=auto"])