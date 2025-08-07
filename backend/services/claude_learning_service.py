"""
Claude Learning Intelligence Service
Orchestrates learning intelligence features using Claude API for advanced sales training
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import statistics

from integrations.claude import (
    ClaudeAPIClient,
    ConversationAnalysis,
    LearningContext,
    MollickFrameworkStep,
    AssessmentDimension
)
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

@dataclass
class LearningSession:
    """Complete learning session with performance tracking"""
    session_id: str
    user_id: str
    scenario_type: str
    prospect_persona: str
    difficulty_level: int
    learning_objectives: List[str]
    start_time: datetime
    end_time: Optional[datetime]
    current_step: MollickFrameworkStep
    conversation_analyses: List[ConversationAnalysis]
    skill_progression: Dict[AssessmentDimension, List[float]]
    coaching_interactions: List[Dict[str, Any]]
    adaptive_parameters: Dict[str, Any]
    session_metrics: Dict[str, float]

@dataclass
class RealTimeCoachingFeedback:
    """Real-time coaching feedback for voice interactions"""
    feedback_id: str
    session_id: str
    trigger_type: str  # "performance_threshold", "skill_gap", "opportunity"
    message: str
    priority: int  # 1-5, 5 being highest
    display_duration_ms: int
    coaching_hint: Optional[str]
    socratic_question: Optional[str]
    timestamp: datetime

class LearningIntelligenceService:
    """
    Advanced learning intelligence service that orchestrates:
    1. Real-time conversation analysis and coaching
    2. Adaptive difficulty and personalization
    3. Performance tracking and skill progression
    4. Evidence-based feedback generation
    """
    
    def __init__(self, claude_client: Optional[ClaudeAPIClient] = None):
        self.claude_client = claude_client or ClaudeAPIClient()
        
        # Session management
        self.active_sessions: Dict[str, LearningSession] = {}
        self.session_history: Dict[str, List[LearningSession]] = defaultdict(list)
        
        # Performance tracking
        self.user_performance: Dict[str, Dict[AssessmentDimension, deque]] = defaultdict(
            lambda: {dim: deque(maxlen=50) for dim in AssessmentDimension}
        )
        
        # Real-time coaching
        self.coaching_thresholds = self._initialize_coaching_thresholds()
        self.coaching_feedback_queue: Dict[str, List[RealTimeCoachingFeedback]] = defaultdict(list)
        
        # Adaptive learning parameters
        self.adaptive_algorithms = {
            "difficulty_adjustment": self._adaptive_difficulty_algorithm,
            "persona_selection": self._adaptive_persona_selection,
            "objective_prioritization": self._adaptive_objective_prioritization
        }
        
        logger.info("Learning Intelligence Service initialized")

    async def start_learning_session(self, user_id: str, session_config: Dict[str, Any]) -> str:
        """
        Start a new learning session with intelligent configuration
        """
        session_id = f"session_{user_id}_{int(datetime.utcnow().timestamp())}"
        
        # Build learning context
        learning_context = await self._build_learning_context(user_id, session_config)
        
        # Create session
        session = LearningSession(
            session_id=session_id,
            user_id=user_id,
            scenario_type=session_config.get("scenario_type", "cold_call"),
            prospect_persona=session_config.get("prospect_persona", "enterprise_vp"),
            difficulty_level=session_config.get("difficulty_level", 2),
            learning_objectives=session_config.get("learning_objectives", [
                "Practice discovery questions",
                "Handle objections effectively",
                "Build compelling value propositions"
            ]),
            start_time=datetime.utcnow(),
            end_time=None,
            current_step=MollickFrameworkStep.CONTEXT_GATHERING,
            conversation_analyses=[],
            skill_progression={dim: [] for dim in AssessmentDimension},
            coaching_interactions=[],
            adaptive_parameters=await self._calculate_adaptive_parameters(user_id, session_config),
            session_metrics={}
        )
        
        # Store session
        self.active_sessions[session_id] = session
        
        logger.info(f"Learning session started: {session_id} for user: {user_id}")
        return session_id

    async def process_conversation_turn(self, session_id: str, user_input: str, 
                                      ai_response: str) -> Dict[str, Any]:
        """
        Process a conversation turn with real-time learning intelligence
        """
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session = self.active_sessions[session_id]
        
        try:
            # Build learning context for this turn
            learning_context = await self._build_turn_learning_context(session)
            
            # Analyze conversation with Claude
            analysis = await self.claude_client.analyze_conversation_turn(
                learning_context, user_input, ai_response
            )
            
            # Add analysis to session
            session.conversation_analyses.append(analysis)
            
            # Update skill progression tracking
            await self._update_skill_progression(session, analysis)
            
            # Generate real-time coaching feedback
            coaching_feedback = await self._generate_real_time_coaching(session, analysis)
            
            # Update adaptive parameters
            await self._update_adaptive_parameters(session, analysis)
            
            # Check for step progression
            await self._check_framework_step_progression(session)
            
            # Update session metrics
            await self._update_session_metrics(session)
            
            return {
                "analysis": asdict(analysis),
                "coaching_feedback": [asdict(cf) for cf in coaching_feedback],
                "current_step": session.current_step.name,
                "skill_progression": self._get_skill_progression_summary(session),
                "adaptive_adjustments": session.adaptive_parameters,
                "session_metrics": session.session_metrics
            }
            
        except Exception as e:
            logger.error(f"Error processing conversation turn: {e}")
            return {"error": str(e)}

    async def generate_enhanced_response(self, session_id: str, user_input: str) -> Dict[str, Any]:
        """
        Generate enhanced AI response with learning context
        """
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session = self.active_sessions[session_id]
        
        try:
            # Build learning context
            learning_context = await self._build_turn_learning_context(session)
            
            # Generate enhanced response using Claude
            response = await self.claude_client.generate_enhanced_response(
                learning_context, user_input
            )
            
            return {
                "enhanced_response": response.content,
                "coaching_metadata": response.coaching_metadata,
                "confidence": response.confidence,
                "processing_time_ms": response.processing_time_ms
            }
            
        except Exception as e:
            logger.error(f"Error generating enhanced response: {e}")
            return {"error": str(e)}

    async def get_structured_feedback(self, session_id: str) -> Dict[str, Any]:
        """
        Generate comprehensive structured feedback for the session
        """
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session = self.active_sessions[session_id]
        
        if not session.conversation_analyses:
            return {"message": "No conversation data to analyze yet"}
        
        try:
            # Get latest analysis for detailed coaching
            latest_analysis = session.conversation_analyses[-1]
            learning_context = await self._build_turn_learning_context(session)
            
            # Generate coaching feedback using Claude
            coaching_feedback = await self.claude_client.generate_coaching_feedback(
                learning_context, latest_analysis
            )
            
            # Generate session-level insights
            session_insights = await self._generate_session_insights(session)
            
            # Calculate performance trends
            performance_trends = self._calculate_performance_trends(session)
            
            return {
                "coaching_feedback": coaching_feedback,
                "session_insights": session_insights,
                "performance_trends": performance_trends,
                "skill_development_recommendations": await self._generate_skill_recommendations(session),
                "next_session_suggestions": await self._generate_next_session_suggestions(session),
                "overall_progress": self._calculate_overall_progress(session)
            }
            
        except Exception as e:
            logger.error(f"Error generating structured feedback: {e}")
            return {"error": str(e)}

    async def get_performance_analytics(self, user_id: str, days_back: int = 30) -> Dict[str, Any]:
        """
        Get comprehensive performance analytics for a user
        """
        try:
            # Get recent session data
            user_sessions = self._get_user_sessions(user_id, days_back)
            
            if not user_sessions:
                return {"message": "No recent session data found"}
            
            # Aggregate all analyses
            all_analyses = []
            for session in user_sessions:
                all_analyses.extend(session.conversation_analyses)
            
            if not all_analyses:
                return {"message": "No conversation analyses found"}
            
            # Generate skill progression assessment
            progression_assessment = await self.claude_client.assess_skill_progression(
                user_id, all_analyses[-20:]  # Last 20 analyses
            )
            
            # Calculate performance metrics
            performance_metrics = self._calculate_user_performance_metrics(user_sessions)
            
            # Generate learning insights
            learning_insights = await self._generate_user_learning_insights(user_sessions)
            
            return {
                "skill_progression": progression_assessment,
                "performance_metrics": performance_metrics,
                "learning_insights": learning_insights,
                "session_summary": self._create_session_summary(user_sessions),
                "recommendations": await self._generate_personalized_recommendations(user_id, user_sessions)
            }
            
        except Exception as e:
            logger.error(f"Error getting performance analytics: {e}")
            return {"error": str(e)}

    async def end_learning_session(self, session_id: str) -> Dict[str, Any]:
        """
        End a learning session and generate final summary
        """
        if session_id not in self.active_sessions:
            return {"error": "Session not found"}
        
        session = self.active_sessions[session_id]
        session.end_time = datetime.utcnow()
        
        try:
            # Generate final session report
            final_report = await self.get_structured_feedback(session_id)
            
            # Store session in history
            self.session_history[session.user_id].append(session)
            
            # Update user performance tracking
            await self._update_user_performance_history(session)
            
            # Remove from active sessions
            del self.active_sessions[session_id]
            
            # Calculate session duration
            duration_minutes = (session.end_time - session.start_time).total_seconds() / 60
            
            logger.info(f"Learning session ended: {session_id}, Duration: {duration_minutes:.1f}min")
            
            return {
                **final_report,
                "session_duration_minutes": duration_minutes,
                "total_turns": len(session.conversation_analyses),
                "framework_steps_completed": session.current_step.value,
                "final_performance_score": session.session_metrics.get("average_performance", 0.0)
            }
            
        except Exception as e:
            logger.error(f"Error ending learning session: {e}")
            return {"error": str(e)}

    async def query_knowledge_base(self, query: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Query the knowledge base for relevant information
        This would integrate with the knowledge service
        """
        # Placeholder for knowledge base integration
        # In real implementation, this would query the knowledge service
        return {
            "query": query,
            "relevant_content": [
                "Sample knowledge base content relevant to the query"
            ],
            "confidence": 0.8,
            "sources": ["Knowledge Base"],
            "context_used": context or {}
        }

    # Private helper methods

    async def _build_learning_context(self, user_id: str, session_config: Dict[str, Any]) -> LearningContext:
        """Build comprehensive learning context for the session"""
        return LearningContext(
            user_id=user_id,
            session_id="temp",  # Will be updated
            scenario_type=session_config.get("scenario_type", "cold_call"),
            prospect_persona=session_config.get("prospect_persona", "enterprise_vp"),
            difficulty_level=session_config.get("difficulty_level", 2),
            learning_objectives=session_config.get("learning_objectives", []),
            current_step=MollickFrameworkStep.CONTEXT_GATHERING,
            conversation_history=[],
            performance_metrics=await self._get_user_performance_baseline(user_id),
            skill_gaps=await self._identify_user_skill_gaps(user_id),
            adaptive_parameters={}
        )

    async def _build_turn_learning_context(self, session: LearningSession) -> LearningContext:
        """Build learning context for a specific conversation turn"""
        conversation_history = []
        for analysis in session.conversation_analyses[-5:]:  # Last 5 turns
            conversation_history.extend([
                {"role": "user", "content": analysis.user_input, "timestamp": analysis.timestamp.timestamp()},
                {"role": "assistant", "content": analysis.ai_response, "timestamp": analysis.timestamp.timestamp()}
            ])
        
        return LearningContext(
            user_id=session.user_id,
            session_id=session.session_id,
            scenario_type=session.scenario_type,
            prospect_persona=session.prospect_persona,
            difficulty_level=session.difficulty_level,
            learning_objectives=session.learning_objectives,
            current_step=session.current_step,
            conversation_history=conversation_history,
            performance_metrics=session.session_metrics,
            skill_gaps=await self._identify_session_skill_gaps(session),
            adaptive_parameters=session.adaptive_parameters
        )

    async def _update_skill_progression(self, session: LearningSession, analysis: ConversationAnalysis):
        """Update skill progression tracking with new analysis"""
        for dimension, score in analysis.assessment_scores.items():
            session.skill_progression[dimension].append(score)
            # Also update global user performance
            self.user_performance[session.user_id][dimension].append(score)

    async def _generate_real_time_coaching(self, session: LearningSession, 
                                         analysis: ConversationAnalysis) -> List[RealTimeCoachingFeedback]:
        """Generate real-time coaching feedback based on conversation analysis"""
        feedback_list = []
        
        # Check performance thresholds
        for dimension, score in analysis.assessment_scores.items():
            threshold = self.coaching_thresholds.get(dimension, 2.5)
            
            if score < threshold:
                feedback = RealTimeCoachingFeedback(
                    feedback_id=f"rt_{session.session_id}_{len(session.conversation_analyses)}_{dimension.value}",
                    session_id=session.session_id,
                    trigger_type="performance_threshold",
                    message=self._get_coaching_message_for_dimension(dimension, score),
                    priority=5 - int(score),  # Lower scores get higher priority
                    display_duration_ms=8000,  # 8 seconds
                    coaching_hint=self._get_coaching_hint(dimension),
                    socratic_question=self._get_socratic_question(dimension),
                    timestamp=datetime.utcnow()
                )
                feedback_list.append(feedback)
        
        # Check for opportunities (high-performing areas to leverage)
        high_performing = [dim for dim, score in analysis.assessment_scores.items() if score >= 4.0]
        if high_performing and len(session.conversation_analyses) > 3:
            dimension = high_performing[0]  # Focus on first high-performing area
            feedback = RealTimeCoachingFeedback(
                feedback_id=f"opp_{session.session_id}_{len(session.conversation_analyses)}",
                session_id=session.session_id,
                trigger_type="opportunity",
                message=f"Great {dimension.value.replace('_', ' ')}! Can you leverage this strength to address other areas?",
                priority=2,
                display_duration_ms=5000,
                coaching_hint=f"Use your strong {dimension.value.replace('_', ' ')} to enhance the conversation flow",
                socratic_question="How might you use this strength to overcome the current challenge?",
                timestamp=datetime.utcnow()
            )
            feedback_list.append(feedback)
        
        return feedback_list

    async def _update_adaptive_parameters(self, session: LearningSession, analysis: ConversationAnalysis):
        """Update adaptive learning parameters based on performance"""
        # Calculate current average performance
        recent_scores = []
        for recent_analysis in session.conversation_analyses[-3:]:  # Last 3 turns
            scores = list(recent_analysis.assessment_scores.values())
            recent_scores.extend(scores)
        
        if recent_scores:
            avg_performance = statistics.mean(recent_scores)
            session.adaptive_parameters["current_avg_performance"] = avg_performance
            
            # Adjust difficulty if needed
            if avg_performance > 4.0 and session.difficulty_level < 5:
                session.adaptive_parameters["suggested_difficulty_increase"] = True
            elif avg_performance < 2.0 and session.difficulty_level > 1:
                session.adaptive_parameters["suggested_difficulty_decrease"] = True
            
            # Update coaching sensitivity
            if avg_performance < 2.5:
                session.adaptive_parameters["coaching_sensitivity"] = "high"
            elif avg_performance > 3.5:
                session.adaptive_parameters["coaching_sensitivity"] = "low"
            else:
                session.adaptive_parameters["coaching_sensitivity"] = "medium"

    async def _check_framework_step_progression(self, session: LearningSession):
        """Check if it's time to progress to the next framework step"""
        turn_count = len(session.conversation_analyses)
        
        # Simple progression logic based on turn count and performance
        if session.current_step == MollickFrameworkStep.CONTEXT_GATHERING and turn_count >= 2:
            session.current_step = MollickFrameworkStep.SCENE_SETTING
        elif session.current_step == MollickFrameworkStep.SCENE_SETTING and turn_count >= 4:
            session.current_step = MollickFrameworkStep.INTERACTIVE_ROLEPLAY
        elif session.current_step == MollickFrameworkStep.INTERACTIVE_ROLEPLAY and turn_count >= 10:
            # Check if performance is consistent before moving to feedback
            recent_performance = [
                statistics.mean(analysis.assessment_scores.values()) 
                for analysis in session.conversation_analyses[-5:]
            ]
            if len(recent_performance) >= 3:
                avg_recent = statistics.mean(recent_performance)
                if avg_recent >= 2.5:  # Minimum threshold for feedback step
                    session.current_step = MollickFrameworkStep.STRUCTURED_FEEDBACK

    async def _update_session_metrics(self, session: LearningSession):
        """Update comprehensive session metrics"""
        if not session.conversation_analyses:
            return
        
        # Calculate average scores across dimensions
        all_scores = {}
        for dim in AssessmentDimension:
            scores = [analysis.assessment_scores.get(dim, 0) for analysis in session.conversation_analyses]
            if scores:
                all_scores[dim.value] = statistics.mean(scores)
        
        # Overall metrics
        all_score_values = list(all_scores.values())
        session.session_metrics = {
            "average_performance": statistics.mean(all_score_values) if all_score_values else 0.0,
            "performance_std": statistics.stdev(all_score_values) if len(all_score_values) > 1 else 0.0,
            "turn_count": len(session.conversation_analyses),
            "coaching_interactions": len(session.coaching_interactions),
            "skill_dimension_scores": all_scores,
            "progress_trend": self._calculate_progress_trend(session),
            "engagement_score": self._calculate_engagement_score(session)
        }

    def _get_skill_progression_summary(self, session: LearningSession) -> Dict[str, Any]:
        """Get a summary of skill progression during the session"""
        summary = {}
        
        for dimension, scores in session.skill_progression.items():
            if scores:
                summary[dimension.value] = {
                    "current_score": scores[-1],
                    "starting_score": scores[0] if len(scores) > 1 else scores[-1],
                    "improvement": scores[-1] - scores[0] if len(scores) > 1 else 0,
                    "trend": "improving" if len(scores) > 1 and scores[-1] > scores[0] else "stable",
                    "consistency": statistics.stdev(scores) if len(scores) > 1 else 0
                }
        
        return summary

    def _initialize_coaching_thresholds(self) -> Dict[AssessmentDimension, float]:
        """Initialize coaching feedback thresholds for each dimension"""
        return {
            AssessmentDimension.DISCOVERY_QUESTIONS: 2.5,
            AssessmentDimension.OBJECTION_HANDLING: 2.0,
            AssessmentDimension.VALUE_ARTICULATION: 2.5,
            AssessmentDimension.ACTIVE_LISTENING: 2.0,
            AssessmentDimension.CONVERSATION_CONTROL: 3.0,
            AssessmentDimension.EMPATHY_BUILDING: 2.0,
            AssessmentDimension.BUSINESS_ACUMEN: 3.0,
            AssessmentDimension.CLOSING_SKILLS: 3.5
        }

    def _get_coaching_message_for_dimension(self, dimension: AssessmentDimension, score: float) -> str:
        """Get coaching message for low-performing dimension"""
        messages = {
            AssessmentDimension.DISCOVERY_QUESTIONS: f"Try asking more open-ended questions to uncover needs (Score: {score:.1f})",
            AssessmentDimension.OBJECTION_HANDLING: f"Remember: Acknowledge, understand, then respond to objections (Score: {score:.1f})",
            AssessmentDimension.VALUE_ARTICULATION: f"Focus on specific benefits that matter to this prospect (Score: {score:.1f})",
            AssessmentDimension.ACTIVE_LISTENING: f"Show you're listening by reflecting back what you heard (Score: {score:.1f})",
            AssessmentDimension.CONVERSATION_CONTROL: f"Guide the conversation toward your objectives (Score: {score:.1f})",
            AssessmentDimension.EMPATHY_BUILDING: f"Connect with the prospect's challenges and feelings (Score: {score:.1f})",
            AssessmentDimension.BUSINESS_ACUMEN: f"Demonstrate understanding of their business context (Score: {score:.1f})",
            AssessmentDimension.CLOSING_SKILLS: f"Look for opportunities to advance the conversation (Score: {score:.1f})"
        }
        return messages.get(dimension, f"Keep practicing this skill area (Score: {score:.1f})")

    def _get_coaching_hint(self, dimension: AssessmentDimension) -> str:
        """Get specific coaching hint for dimension"""
        hints = {
            AssessmentDimension.DISCOVERY_QUESTIONS: "Use 'What', 'How', 'Why' questions",
            AssessmentDimension.OBJECTION_HANDLING: "Feel, Felt, Found technique",
            AssessmentDimension.VALUE_ARTICULATION: "Quantify benefits where possible",
            AssessmentDimension.ACTIVE_LISTENING: "Paraphrase and confirm understanding",
            AssessmentDimension.CONVERSATION_CONTROL: "Use transition phrases to redirect",
            AssessmentDimension.EMPATHY_BUILDING: "Acknowledge their perspective",
            AssessmentDimension.BUSINESS_ACUMEN: "Reference industry trends or challenges",
            AssessmentDimension.CLOSING_SKILLS: "Suggest concrete next steps"
        }
        return hints.get(dimension, "Practice this skill in different contexts")

    def _get_socratic_question(self, dimension: AssessmentDimension) -> str:
        """Get Socratic question to promote self-reflection"""
        questions = {
            AssessmentDimension.DISCOVERY_QUESTIONS: "What information do you still need to understand their situation?",
            AssessmentDimension.OBJECTION_HANDLING: "What might be the real concern behind this objection?",
            AssessmentDimension.VALUE_ARTICULATION: "How does this benefit solve their specific problem?",
            AssessmentDimension.ACTIVE_LISTENING: "What emotions or concerns did you hear in their response?",
            AssessmentDimension.CONVERSATION_CONTROL: "Where do you want to guide this conversation next?",
            AssessmentDimension.EMPATHY_BUILDING: "How might they be feeling about their current situation?",
            AssessmentDimension.BUSINESS_ACUMEN: "What business pressures might be driving their decision?",
            AssessmentDimension.CLOSING_SKILLS: "What would be a logical next step to propose?"
        }
        return questions.get(dimension, "How can you improve in this area?")

    async def _calculate_adaptive_parameters(self, user_id: str, session_config: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate adaptive parameters based on user history and configuration"""
        # Get user's performance history
        user_performance = await self._get_user_performance_baseline(user_id)
        
        return {
            "personalization_level": "medium",
            "coaching_frequency": "moderate",
            "challenge_progression": "gradual",
            "feedback_style": "constructive",
            "performance_baseline": user_performance
        }

    async def _get_user_performance_baseline(self, user_id: str) -> Dict[str, float]:
        """Get user's performance baseline across dimensions"""
        performance = {}
        
        for dimension in AssessmentDimension:
            user_scores = self.user_performance[user_id][dimension]
            if user_scores:
                performance[dimension.value] = statistics.mean(user_scores)
            else:
                performance[dimension.value] = 3.0  # Default baseline
        
        return performance

    async def _identify_user_skill_gaps(self, user_id: str) -> List[str]:
        """Identify user's primary skill gaps based on historical performance"""
        performance_baseline = await self._get_user_performance_baseline(user_id)
        
        skill_gaps = []
        for dimension_name, score in performance_baseline.items():
            if score < 2.5:  # Below average threshold
                skill_gaps.append(dimension_name)
        
        return skill_gaps

    async def _identify_session_skill_gaps(self, session: LearningSession) -> List[str]:
        """Identify skill gaps within the current session"""
        if not session.conversation_analyses:
            return []
        
        # Calculate average scores for the session
        session_averages = {}
        for dimension in AssessmentDimension:
            scores = [
                analysis.assessment_scores.get(dimension, 3.0) 
                for analysis in session.conversation_analyses
            ]
            session_averages[dimension] = statistics.mean(scores) if scores else 3.0
        
        # Identify gaps
        skill_gaps = []
        for dimension, avg_score in session_averages.items():
            if avg_score < 2.5:
                skill_gaps.append(dimension.value)
        
        return skill_gaps

    def _get_user_sessions(self, user_id: str, days_back: int) -> List[LearningSession]:
        """Get user sessions from the specified time period"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        user_sessions = []
        # From active sessions
        for session in self.active_sessions.values():
            if session.user_id == user_id and session.start_time >= cutoff_date:
                user_sessions.append(session)
        
        # From session history
        for session in self.session_history.get(user_id, []):
            if session.start_time >= cutoff_date:
                user_sessions.append(session)
        
        return sorted(user_sessions, key=lambda s: s.start_time)

    def _calculate_progress_trend(self, session: LearningSession) -> str:
        """Calculate overall progress trend for the session"""
        if len(session.conversation_analyses) < 3:
            return "insufficient_data"
        
        # Compare first half vs second half performance
        mid_point = len(session.conversation_analyses) // 2
        first_half_scores = []
        second_half_scores = []
        
        for i, analysis in enumerate(session.conversation_analyses):
            scores = list(analysis.assessment_scores.values())
            if i < mid_point:
                first_half_scores.extend(scores)
            else:
                second_half_scores.extend(scores)
        
        if first_half_scores and second_half_scores:
            first_avg = statistics.mean(first_half_scores)
            second_avg = statistics.mean(second_half_scores)
            
            improvement = second_avg - first_avg
            if improvement > 0.3:
                return "improving"
            elif improvement < -0.3:
                return "declining"
            else:
                return "stable"
        
        return "unknown"

    def _calculate_engagement_score(self, session: LearningSession) -> float:
        """Calculate engagement score based on conversation patterns"""
        if not session.conversation_analyses:
            return 0.0
        
        # Factors: response length, question asking, variety in responses
        engagement_factors = []
        
        for analysis in session.conversation_analyses:
            # Response length factor
            word_count = len(analysis.user_input.split())
            length_score = min(1.0, word_count / 20.0)  # Normalize to 20 words = 1.0
            
            # Question asking factor
            question_score = 1.0 if "?" in analysis.user_input else 0.5
            
            # Confidence factor (from analysis)
            confidence_score = analysis.confidence_score
            
            turn_engagement = (length_score + question_score + confidence_score) / 3.0
            engagement_factors.append(turn_engagement)
        
        return statistics.mean(engagement_factors) if engagement_factors else 0.0

    async def _generate_session_insights(self, session: LearningSession) -> Dict[str, Any]:
        """Generate high-level insights about the session"""
        insights = {
            "session_quality": "good",
            "key_strengths": [],
            "improvement_areas": [],
            "learning_momentum": self._calculate_progress_trend(session),
            "engagement_level": "high" if self._calculate_engagement_score(session) > 0.7 else "moderate"
        }
        
        if session.conversation_analyses:
            # Find consistently strong areas
            dimension_averages = {}
            for dimension in AssessmentDimension:
                scores = [
                    analysis.assessment_scores.get(dimension, 3.0) 
                    for analysis in session.conversation_analyses
                ]
                dimension_averages[dimension] = statistics.mean(scores)
            
            # Identify strengths and weaknesses
            for dimension, avg_score in dimension_averages.items():
                if avg_score >= 3.5:
                    insights["key_strengths"].append(dimension.value.replace('_', ' ').title())
                elif avg_score < 2.5:
                    insights["improvement_areas"].append(dimension.value.replace('_', ' ').title())
        
        return insights

    async def _generate_skill_recommendations(self, session: LearningSession) -> List[str]:
        """Generate specific skill development recommendations"""
        recommendations = []
        
        if not session.conversation_analyses:
            return ["Complete more conversation practice to get personalized recommendations"]
        
        # Analyze performance patterns
        weak_areas = []
        strong_areas = []
        
        for dimension in AssessmentDimension:
            scores = [
                analysis.assessment_scores.get(dimension, 3.0)
                for analysis in session.conversation_analyses
            ]
            avg_score = statistics.mean(scores) if scores else 3.0
            
            if avg_score < 2.5:
                weak_areas.append(dimension)
            elif avg_score >= 4.0:
                strong_areas.append(dimension)
        
        # Generate recommendations for weak areas
        if weak_areas:
            for dimension in weak_areas[:2]:  # Top 2 areas needing work
                recommendations.append(
                    f"Focus on {dimension.value.replace('_', ' ')} through targeted practice exercises"
                )
        
        # Leverage strong areas
        if strong_areas:
            recommendations.append(
                f"Leverage your strength in {strong_areas[0].value.replace('_', ' ')} to improve other skills"
            )
        
        return recommendations or ["Continue regular practice across all skill areas"]

    async def _generate_next_session_suggestions(self, session: LearningSession) -> Dict[str, Any]:
        """Generate suggestions for the next learning session"""
        current_avg = session.session_metrics.get("average_performance", 3.0)
        
        suggestions = {
            "recommended_scenario": session.scenario_type,  # Start with same scenario
            "difficulty_adjustment": 0,  # No change
            "focus_areas": await self._identify_session_skill_gaps(session),
            "session_type": "continuation"
        }
        
        # Adjust difficulty based on performance
        if current_avg >= 4.0:
            suggestions["difficulty_adjustment"] = 1
            suggestions["session_type"] = "advancement"
        elif current_avg < 2.0:
            suggestions["difficulty_adjustment"] = -1
            suggestions["session_type"] = "reinforcement"
        
        return suggestions

    def _calculate_overall_progress(self, session: LearningSession) -> Dict[str, Any]:
        """Calculate overall progress metrics for the session"""
        if not session.conversation_analyses:
            return {"progress_score": 0.0, "status": "insufficient_data"}
        
        # Calculate various progress indicators
        performance_scores = [
            statistics.mean(analysis.assessment_scores.values())
            for analysis in session.conversation_analyses
        ]
        
        overall_performance = statistics.mean(performance_scores)
        performance_consistency = 1.0 - (statistics.stdev(performance_scores) / 5.0) if len(performance_scores) > 1 else 1.0
        engagement = self._calculate_engagement_score(session)
        
        # Weighted progress score
        progress_score = (
            overall_performance * 0.5 +
            performance_consistency * 0.3 +
            engagement * 0.2
        )
        
        # Determine status
        if progress_score >= 4.0:
            status = "excellent"
        elif progress_score >= 3.0:
            status = "good"
        elif progress_score >= 2.0:
            status = "developing"
        else:
            status = "needs_focus"
        
        return {
            "progress_score": progress_score,
            "status": status,
            "performance_average": overall_performance,
            "consistency_score": performance_consistency,
            "engagement_score": engagement
        }

    def _calculate_user_performance_metrics(self, user_sessions: List[LearningSession]) -> Dict[str, Any]:
        """Calculate comprehensive user performance metrics"""
        if not user_sessions:
            return {}
        
        all_analyses = []
        for session in user_sessions:
            all_analyses.extend(session.conversation_analyses)
        
        if not all_analyses:
            return {}
        
        # Calculate metrics across all dimensions
        dimension_metrics = {}
        for dimension in AssessmentDimension:
            scores = [
                analysis.assessment_scores.get(dimension, 3.0)
                for analysis in all_analyses
            ]
            
            if scores:
                dimension_metrics[dimension.value] = {
                    "average": statistics.mean(scores),
                    "trend": "improving" if len(scores) > 5 and scores[-3:] > scores[:3] else "stable",
                    "consistency": 1.0 - (statistics.stdev(scores) / 5.0) if len(scores) > 1 else 1.0,
                    "sample_size": len(scores)
                }
        
        return {
            "dimension_metrics": dimension_metrics,
            "overall_average": statistics.mean([m["average"] for m in dimension_metrics.values()]),
            "total_practice_sessions": len(user_sessions),
            "total_conversation_turns": len(all_analyses),
            "recent_performance_trend": self._get_recent_trend(all_analyses)
        }

    def _get_recent_trend(self, analyses: List[ConversationAnalysis]) -> str:
        """Get recent performance trend across all analyses"""
        if len(analyses) < 6:
            return "insufficient_data"
        
        # Compare recent vs earlier performance
        recent_scores = []
        earlier_scores = []
        
        for i, analysis in enumerate(analyses):
            avg_score = statistics.mean(analysis.assessment_scores.values())
            if i >= len(analyses) - 5:  # Last 5
                recent_scores.append(avg_score)
            elif i < 5:  # First 5
                earlier_scores.append(avg_score)
        
        if recent_scores and earlier_scores:
            recent_avg = statistics.mean(recent_scores)
            earlier_avg = statistics.mean(earlier_scores)
            
            improvement = recent_avg - earlier_avg
            if improvement > 0.2:
                return "improving"
            elif improvement < -0.2:
                return "declining"
            else:
                return "stable"
        
        return "unknown"

    async def _generate_user_learning_insights(self, user_sessions: List[LearningSession]) -> Dict[str, Any]:
        """Generate learning insights across all user sessions"""
        return {
            "learning_velocity": "moderate",
            "preferred_scenarios": self._get_preferred_scenarios(user_sessions),
            "optimal_session_length": self._calculate_optimal_session_length(user_sessions),
            "skill_development_pattern": "consistent",
            "engagement_patterns": "steady"
        }

    def _create_session_summary(self, user_sessions: List[LearningSession]) -> Dict[str, Any]:
        """Create a summary of user sessions"""
        if not user_sessions:
            return {}
        
        total_duration = sum(
            (session.end_time - session.start_time).total_seconds() / 60
            for session in user_sessions
            if session.end_time
        )
        
        return {
            "total_sessions": len(user_sessions),
            "total_practice_time_minutes": total_duration,
            "average_session_length_minutes": total_duration / len(user_sessions) if user_sessions else 0,
            "scenarios_practiced": list(set(session.scenario_type for session in user_sessions)),
            "date_range": {
                "start": min(session.start_time for session in user_sessions).isoformat(),
                "end": max(session.start_time for session in user_sessions).isoformat()
            }
        }

    def _get_preferred_scenarios(self, user_sessions: List[LearningSession]) -> List[str]:
        """Identify user's preferred practice scenarios"""
        scenario_counts = defaultdict(int)
        for session in user_sessions:
            scenario_counts[session.scenario_type] += 1
        
        return sorted(scenario_counts.keys(), key=scenario_counts.get, reverse=True)[:3]

    def _calculate_optimal_session_length(self, user_sessions: List[LearningSession]) -> float:
        """Calculate optimal session length based on performance patterns"""
        # Simplified calculation - in practice, would analyze performance vs duration
        if user_sessions:
            durations = [
                (session.end_time - session.start_time).total_seconds() / 60
                for session in user_sessions
                if session.end_time
            ]
            return statistics.mean(durations) if durations else 20.0
        return 20.0  # Default 20 minutes

    async def _generate_personalized_recommendations(self, user_id: str, user_sessions: List[LearningSession]) -> List[str]:
        """Generate personalized learning recommendations"""
        recommendations = []
        
        if not user_sessions:
            return ["Start with basic cold calling scenarios to build foundational skills"]
        
        # Analyze recent performance
        recent_session = user_sessions[-1] if user_sessions else None
        if recent_session:
            avg_performance = recent_session.session_metrics.get("average_performance", 3.0)
            
            if avg_performance < 2.5:
                recommendations.append("Focus on fundamental skills with easier scenarios")
                recommendations.append("Practice individual skill components before full conversations")
            elif avg_performance >= 4.0:
                recommendations.append("Ready for advanced scenarios and challenging prospects")
                recommendations.append("Consider mentoring newer learners to reinforce your skills")
            else:
                recommendations.append("Continue regular practice to build consistency")
                recommendations.append("Try varying scenario types to broaden your skills")
        
        return recommendations

    async def _update_user_performance_history(self, session: LearningSession):
        """Update long-term user performance history"""
        # This would typically write to a database
        # For now, we maintain in-memory tracking
        logger.info(f"Updated performance history for user: {session.user_id}")

    async def _adaptive_difficulty_algorithm(self, user_id: str, current_level: int) -> int:
        """Adaptive algorithm for difficulty adjustment"""
        # Simplified adaptive algorithm
        user_performance = self.user_performance[user_id]
        
        recent_scores = []
        for dimension in AssessmentDimension:
            scores = list(user_performance[dimension])
            if scores:
                recent_scores.extend(scores[-3:])  # Last 3 scores per dimension
        
        if recent_scores:
            avg_recent = statistics.mean(recent_scores)
            
            if avg_recent > 4.0 and current_level < 5:
                return current_level + 1
            elif avg_recent < 2.0 and current_level > 1:
                return current_level - 1
        
        return current_level

    async def _adaptive_persona_selection(self, user_id: str, current_persona: str) -> str:
        """Adaptive algorithm for persona selection"""
        # Simple rotation based on experience
        personas = ["enterprise_vp", "smb_owner", "startup_founder", "technical_buyer"]
        
        # Could implement more sophisticated logic based on performance patterns
        current_index = personas.index(current_persona) if current_persona in personas else 0
        next_index = (current_index + 1) % len(personas)
        
        return personas[next_index]

    async def _adaptive_objective_prioritization(self, user_id: str, 
                                               current_objectives: List[str]) -> List[str]:
        """Adaptive algorithm for learning objective prioritization"""
        # Prioritize based on skill gaps
        skill_gaps = await self._identify_user_skill_gaps(user_id)
        
        # Map skill gaps to learning objectives
        objective_mapping = {
            "discovery_questions": "Practice discovery questions",
            "objection_handling": "Handle objections effectively",
            "value_articulation": "Build compelling value propositions",
            "active_listening": "Develop active listening skills",
            "conversation_control": "Improve conversation control",
            "empathy_building": "Build stronger rapport",
            "business_acumen": "Enhance business understanding",
            "closing_skills": "Strengthen closing techniques"
        }
        
        prioritized_objectives = []
        for gap in skill_gaps:
            if gap in objective_mapping:
                prioritized_objectives.append(objective_mapping[gap])
        
        # Add remaining objectives
        for obj in current_objectives:
            if obj not in prioritized_objectives:
                prioritized_objectives.append(obj)
        
        return prioritized_objectives[:5]  # Top 5 objectives

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of the learning intelligence service"""
        try:
            claude_health = await self.claude_client.health_check()
            
            return {
                "status": "healthy",
                "service": "learning_intelligence",
                "active_sessions": len(self.active_sessions),
                "total_users": len(self.user_performance),
                "claude_integration": claude_health,
                "memory_usage": {
                    "session_history_size": sum(len(sessions) for sessions in self.session_history.values()),
                    "user_performance_size": sum(len(perf[dim]) for perf in self.user_performance.values() for dim in perf)
                }
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "service": "learning_intelligence",
                "error": str(e)
            }