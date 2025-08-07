"""
Voice Processing Pipeline Service
Orchestrates the complete voice processing pipeline with ElevenLabs and Claude integration
"""

import asyncio
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import base64
from datetime import datetime, timedelta

from integrations.elevenlabs import (
    ElevenLabsConversationalClient,
    ElevenLabsConfig,
    ConversationMessage,
    ConversationState,
    AudioChunk
)
from services.claude_learning_service import LearningIntelligenceService, LearningSession
from services.knowledge_service import KnowledgeService
from integrations.claude import MollickFrameworkStep, ConversationAnalysis
from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

class ProcessingStage(Enum):
    """Voice processing pipeline stages"""
    AUDIO_INPUT = "audio_input"
    SPEECH_TO_TEXT = "speech_to_text"
    TEXT_PROCESSING = "text_processing"
    CLAUDE_ENHANCEMENT = "claude_enhancement"
    TEXT_TO_SPEECH = "text_to_speech"
    AUDIO_OUTPUT = "audio_output"
    COMPLETE = "complete"
    ERROR = "error"

@dataclass
class VoiceProcessingMetrics:
    """Metrics for voice processing performance"""
    session_id: str
    total_latency_ms: float
    stt_latency_ms: float
    claude_latency_ms: float
    tts_latency_ms: float
    audio_quality_score: float
    confidence_score: float
    turn_count: int
    error_count: int
    started_at: datetime
    last_activity: datetime

@dataclass
class SalesCoachingContext:
    """Context for sales coaching intelligence"""
    scenario_type: str  # "cold_call", "demo", "objection_handling", etc.
    prospect_persona: str  # "enterprise_vp", "smb_owner", "startup_founder"
    difficulty_level: int  # 1-5
    training_objectives: List[str]
    conversation_history: List[ConversationMessage]
    current_step: int  # Mollick framework step (1-6)
    performance_score: float
    coaching_feedback: List[str]

class VoiceProcessingPipeline:
    """
    Complete voice processing pipeline that orchestrates:
    1. Audio input from user
    2. Speech-to-text via ElevenLabs
    3. Text processing and Claude enhancement
    4. Text-to-speech response
    5. Audio output to user
    """
    
    def __init__(self, elevenlabs_client: ElevenLabsConversationalClient, 
                 learning_service: Optional[LearningIntelligenceService] = None,
                 knowledge_service: Optional[KnowledgeService] = None):
        self.client = elevenlabs_client
        self.learning_service = learning_service or LearningIntelligenceService()
        self.knowledge_service = knowledge_service or KnowledgeService()
        self.session_id = str(uuid.uuid4())
        self.learning_session_id = None  # Will be set when learning session starts
        self.metrics = VoiceProcessingMetrics(
            session_id=self.session_id,
            total_latency_ms=0.0,
            stt_latency_ms=0.0,
            claude_latency_ms=0.0,
            tts_latency_ms=0.0,
            audio_quality_score=0.0,
            confidence_score=0.0,
            turn_count=0,
            error_count=0,
            started_at=datetime.utcnow(),
            last_activity=datetime.utcnow()
        )
        self.coaching_context = None
        self.processing_callbacks = []
        self.stage_callbacks = []
        self._current_stage = ProcessingStage.AUDIO_INPUT
    
    async def set_coaching_context(self, context: SalesCoachingContext, user_id: str):
        """Set the sales coaching context for intelligent processing"""
        self.coaching_context = context
        
        # Start a learning session with the Claude learning service
        session_config = {
            "scenario_type": context.scenario_type,
            "prospect_persona": context.prospect_persona,
            "difficulty_level": context.difficulty_level,
            "learning_objectives": context.training_objectives
        }
        
        self.learning_session_id = await self.learning_service.start_learning_session(
            user_id, session_config
        )
    
    def add_processing_callback(self, callback: Callable):
        """Add callback for processing events"""
        self.processing_callbacks.append(callback)
    
    def add_stage_callback(self, callback: Callable):
        """Add callback for stage changes"""
        self.stage_callbacks.append(callback)
    
    async def process_user_audio(self, audio_data: bytes) -> Dict[str, Any]:
        """
        Process user audio through the complete pipeline
        
        Args:
            audio_data: Raw audio bytes from user
            
        Returns:
            Processing result with metrics and response data
        """
        start_time = time.time()
        processing_id = str(uuid.uuid4())
        
        try:
            logger.info(f"Starting voice processing pipeline: {processing_id}")
            
            # Stage 1: Audio Input
            await self._update_stage(ProcessingStage.AUDIO_INPUT)
            
            # Stage 2: Speech-to-Text
            await self._update_stage(ProcessingStage.SPEECH_TO_TEXT)
            stt_start = time.time()
            
            # Send audio to ElevenLabs for STT
            success = await self.client.send_audio(audio_data)
            if not success:
                raise Exception("Failed to process audio with ElevenLabs")
            
            # Wait for transcription (this would be handled via callbacks in real implementation)
            transcript = await self._wait_for_transcription(processing_id)
            stt_latency = (time.time() - stt_start) * 1000
            
            # Stage 3: Text Processing
            await self._update_stage(ProcessingStage.TEXT_PROCESSING)
            
            # Stage 4: Claude Enhancement
            await self._update_stage(ProcessingStage.CLAUDE_ENHANCEMENT)
            claude_start = time.time()
            
            enhanced_response = await self._process_with_claude(transcript)
            claude_latency = (time.time() - claude_start) * 1000
            
            # Stage 5: Text-to-Speech
            await self._update_stage(ProcessingStage.TEXT_TO_SPEECH)
            tts_start = time.time()
            
            # Send enhanced response for synthesis
            await self.client.send_text_interrupt(enhanced_response["response"])
            tts_latency = (time.time() - tts_start) * 1000
            
            # Stage 6: Audio Output
            await self._update_stage(ProcessingStage.AUDIO_OUTPUT)
            
            # Wait for audio synthesis completion
            await self._wait_for_synthesis_completion(processing_id)
            
            # Stage 7: Complete
            await self._update_stage(ProcessingStage.COMPLETE)
            
            # Update metrics
            total_latency = (time.time() - start_time) * 1000
            await self._update_metrics(
                total_latency, stt_latency, claude_latency, tts_latency,
                enhanced_response.get("confidence", 0.9)
            )
            
            # Notify callbacks
            await self._notify_processing_complete(processing_id, {
                "transcript": transcript,
                "enhanced_response": enhanced_response,
                "metrics": asdict(self.metrics)
            })
            
            return {
                "processing_id": processing_id,
                "status": "success",
                "transcript": transcript,
                "response": enhanced_response["response"],
                "coaching_feedback": enhanced_response.get("coaching_feedback", []),
                "metrics": asdict(self.metrics)
            }
            
        except Exception as e:
            logger.error(f"Voice processing pipeline failed: {e}")
            await self._update_stage(ProcessingStage.ERROR)
            self.metrics.error_count += 1
            
            return {
                "processing_id": processing_id,
                "status": "error",
                "error": str(e),
                "metrics": asdict(self.metrics)
            }
    
    async def _wait_for_transcription(self, processing_id: str, timeout: float = 5.0) -> str:
        """Wait for speech-to-text transcription to complete"""
        # In real implementation, this would listen for transcription callbacks
        # For now, return a mock transcript
        await asyncio.sleep(0.5)  # Simulate processing time
        return "This is a mock transcription for testing purposes."
    
    async def _wait_for_synthesis_completion(self, processing_id: str, timeout: float = 3.0):
        """Wait for text-to-speech synthesis to complete"""
        # In real implementation, this would listen for synthesis completion callbacks
        await asyncio.sleep(0.8)  # Simulate synthesis time
    
    async def _process_with_claude(self, user_input: str) -> Dict[str, Any]:
        """
        Process user input through Claude for sales coaching intelligence
        
        This is where the core sales training intelligence happens:
        - Analyze user's sales approach
        - Generate contextual responses as different personas
        - Provide coaching feedback and suggestions
        - Adapt difficulty based on performance
        """
        claude_start = time.time()
        
        try:
            # Generate enhanced response using learning service if available
            if self.learning_session_id and self.learning_service:
                # Generate enhanced AI response
                enhancement_result = await self.learning_service.generate_enhanced_response(
                    self.learning_session_id, user_input
                )
                
                if "error" not in enhancement_result:
                    enhanced_response = enhancement_result["enhanced_response"]
                    coaching_metadata = enhancement_result["coaching_metadata"]
                    confidence = enhancement_result["confidence"]
                    
                    # Process conversation turn for analysis and coaching
                    analysis_result = await self.learning_service.process_conversation_turn(
                        self.learning_session_id, user_input, enhanced_response
                    )
                    
                    coaching_feedback = []
                    if "error" not in analysis_result:
                        coaching_feedback = [
                            feedback.get("message", "") 
                            for feedback in analysis_result.get("coaching_feedback", [])
                        ]
                    
                    processing_time = (time.time() - claude_start) * 1000
                    
                    return {
                        "response": enhanced_response,
                        "coaching_feedback": coaching_feedback,
                        "confidence": confidence,
                        "processing_time_ms": processing_time,
                        "coaching_metadata": coaching_metadata,
                        "analysis_result": analysis_result.get("analysis", {}),
                        "skill_progression": analysis_result.get("skill_progression", {}),
                        "adaptive_adjustments": analysis_result.get("adaptive_adjustments", {})
                    }
            
            # Fallback to simple response generation
            context = self._build_claude_context(user_input)
            
            # Determine response strategy based on coaching context
            if self.coaching_context:
                response = await self._generate_contextualized_response(user_input, context)
            else:
                response = await self._generate_default_response(user_input)
            
            # Generate basic coaching feedback
            coaching_feedback = await self._generate_coaching_feedback(user_input, response)
            
            # Update coaching context
            await self._update_coaching_progress(user_input, response)
            
            processing_time = (time.time() - claude_start) * 1000
            
            return {
                "response": response,
                "coaching_feedback": coaching_feedback,
                "confidence": 0.85,  # Lower confidence for fallback
                "processing_time_ms": processing_time,
                "context_used": context
            }
            
        except Exception as e:
            logger.error(f"Claude processing failed: {e}")
            return {
                "response": "I apologize, but I'm having trouble processing that right now. Could you please repeat?",
                "coaching_feedback": ["Technical issue encountered - let's continue with the conversation."],
                "confidence": 0.5,
                "error": str(e)
            }
    
    def _build_claude_context(self, user_input: str) -> Dict[str, Any]:
        """Build context for Claude processing"""
        context = {
            "user_input": user_input,
            "session_id": self.session_id,
            "turn_count": self.metrics.turn_count,
            "conversation_history": []
        }
        
        if self.coaching_context:
            context.update({
                "scenario_type": self.coaching_context.scenario_type,
                "prospect_persona": self.coaching_context.prospect_persona,
                "difficulty_level": self.coaching_context.difficulty_level,
                "current_step": self.coaching_context.current_step,
                "training_objectives": self.coaching_context.training_objectives,
                "performance_score": self.coaching_context.performance_score
            })
            
            # Include relevant conversation history
            context["conversation_history"] = [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp
                }
                for msg in self.coaching_context.conversation_history[-5:]  # Last 5 messages
            ]
        
        return context
    
    async def _generate_contextualized_response(self, user_input: str, context: Dict[str, Any]) -> str:
        """Generate contextualized response based on coaching scenario"""
        scenario_type = context.get("scenario_type", "general")
        prospect_persona = context.get("prospect_persona", "enterprise_vp")
        current_step = context.get("current_step", 1)
        
        # Response templates based on Mollick's 6-step framework
        if current_step == 1:  # Context Gathering
            return self._generate_context_gathering_response(user_input, prospect_persona)
        elif current_step == 2:  # Scenario Selection (already done)
            return self._generate_scene_setting_response(user_input, scenario_type)
        elif current_step == 3:  # Scene Setting
            return self._generate_scene_setting_response(user_input, scenario_type)
        elif current_step == 4:  # Interactive Role-Play
            return self._generate_roleplay_response(user_input, prospect_persona, scenario_type)
        elif current_step == 5:  # Structured Feedback
            return self._generate_feedback_response(user_input, context)
        elif current_step == 6:  # Extended Learning
            return self._generate_learning_response(user_input, context)
        else:
            return self._generate_default_response(user_input)
    
    def _generate_context_gathering_response(self, user_input: str, prospect_persona: str) -> str:
        """Generate response for context gathering phase"""
        responses = {
            "enterprise_vp": "Thanks for sharing that background. As a VP of Sales, I'm sure you understand the challenges of scaling a sales organization. What specific pain points are you facing with your current sales process?",
            "smb_owner": "I appreciate you taking the time to tell me about your business. As a business owner, you're probably wearing many hats. What's your biggest challenge when it comes to growing revenue right now?",
            "startup_founder": "That's exciting that you're building something new! I know how important every dollar and every decision is at your stage. What's your primary focus for customer acquisition right now?"
        }
        return responses.get(prospect_persona, responses["enterprise_vp"])
    
    def _generate_scene_setting_response(self, user_input: str, scenario_type: str) -> str:
        """Generate response for scene setting phase"""
        scenarios = {
            "cold_call": "Perfect! Let's jump into a realistic cold calling scenario. I'm going to play the role of a busy executive who just answered an unexpected call. You'll need to quickly grab my attention and establish value. Ready? *Phone rings* Hello, this is Sarah, how can I help you?",
            "demo": "Great! I'll be playing the role of a prospect who's agreed to see a demo but is skeptical about whether your solution can really solve our problems. I have limited time and high expectations. Go ahead and start your presentation.",
            "objection_handling": "Excellent! I'm going to throw some tough objections your way. Remember to acknowledge, understand, and respond with value. Let's start: 'Your solution sounds interesting, but honestly, it seems pretty expensive compared to what we're currently using.'"
        }
        return scenarios.get(scenario_type, scenarios["cold_call"])
    
    def _generate_roleplay_response(self, user_input: str, prospect_persona: str, scenario_type: str) -> str:
        """Generate realistic roleplay responses based on persona and scenario"""
        # This would contain sophisticated logic to generate realistic prospect responses
        # For now, return contextual responses based on common patterns
        
        if "price" in user_input.lower() or "cost" in user_input.lower():
            if prospect_persona == "enterprise_vp":
                return "I understand you're positioning this as an investment, but I need to see concrete ROI numbers. Our budget committee requires a detailed business case with measurable outcomes. Can you provide specific examples of results your other clients have achieved?"
            elif prospect_persona == "smb_owner":
                return "Look, I appreciate the value you're describing, but I have to be really careful with our budget. Every dollar counts for us. Is there a smaller package or trial option that would let us test this out first?"
            else:  # startup_founder
                return "I get it, and I can see the potential value, but we're pre-revenue and every expense has to directly contribute to growth. Do you have any success stories from other startups at our stage?"
        
        elif "time" in user_input.lower() or "implementation" in user_input.lower():
            return "Time is definitely a concern for us. We can't afford to have our team disrupted for months with a complex implementation. How quickly can we see results, and what kind of support do you provide during the transition?"
        
        else:
            # Default contextual response
            return "That's interesting. I'm still not entirely convinced this is the right fit for us. What makes your solution different from the other options we're considering?"
    
    def _generate_feedback_response(self, user_input: str, context: Dict[str, Any]) -> str:
        """Generate coaching feedback response"""
        return "Let me give you some feedback on that conversation. You did well establishing rapport and asking discovery questions. For improvement, I'd suggest being more specific about ROI metrics and addressing objections more directly. Let's try that scenario again with these adjustments."
    
    def _generate_learning_response(self, user_input: str, context: Dict[str, Any]) -> str:
        """Generate extended learning response"""
        return "Great work in this session! You've shown improvement in handling objections and building value propositions. For your next practice session, I recommend focusing on quantifying business impact earlier in conversations. Would you like to try a more challenging scenario?"
    
    async def _generate_default_response(self, user_input: str) -> str:
        """Generate default response when no specific context is available"""
        return "I understand what you're saying. Can you tell me more about your specific goals for this training session?"
    
    async def _generate_coaching_feedback(self, user_input: str, response: str) -> List[str]:
        """Generate specific coaching feedback based on user performance"""
        feedback = []
        
        # Analyze user input for coaching opportunities
        if len(user_input.split()) < 10:
            feedback.append("Try to provide more detailed responses to show deeper engagement.")
        
        if "?" not in user_input:
            feedback.append("Great opportunity to ask a follow-up question to keep the conversation flowing.")
        
        if any(word in user_input.lower() for word in ["yes", "no", "okay", "sure"]):
            feedback.append("Consider elaborating on your responses to provide more value to the conversation.")
        
        # Positive reinforcement
        if any(word in user_input.lower() for word in ["understand", "appreciate", "value"]):
            feedback.append("Excellent use of acknowledgment language!")
        
        if len(feedback) == 0:
            feedback.append("Good engagement! Keep building on the conversation momentum.")
        
        return feedback
    
    async def _update_coaching_progress(self, user_input: str, response: str):
        """Update coaching context based on conversation progress"""
        if not self.coaching_context:
            return
        
        # Add to conversation history
        self.coaching_context.conversation_history.extend([
            ConversationMessage(
                role="user",
                content=user_input,
                timestamp=time.time()
            ),
            ConversationMessage(
                role="assistant", 
                content=response,
                timestamp=time.time()
            )
        ])
        
        # Update turn count and step progression
        self.metrics.turn_count += 1
        
        # Simple step progression logic
        if self.metrics.turn_count >= 2 and self.coaching_context.current_step == 1:
            self.coaching_context.current_step = 3  # Move to scene setting
        elif self.metrics.turn_count >= 4 and self.coaching_context.current_step == 3:
            self.coaching_context.current_step = 4  # Move to roleplay
        elif self.metrics.turn_count >= 8 and self.coaching_context.current_step == 4:
            self.coaching_context.current_step = 5  # Move to feedback
    
    async def _update_stage(self, new_stage: ProcessingStage):
        """Update processing stage and notify callbacks"""
        self._current_stage = new_stage
        
        for callback in self.stage_callbacks:
            try:
                await callback(new_stage, self.session_id)
            except Exception as e:
                logger.warning(f"Error in stage callback: {e}")
    
    async def _update_metrics(self, total_latency: float, stt_latency: float, 
                            claude_latency: float, tts_latency: float, confidence: float):
        """Update processing metrics"""
        self.metrics.total_latency_ms = total_latency
        self.metrics.stt_latency_ms = stt_latency
        self.metrics.claude_latency_ms = claude_latency
        self.metrics.tts_latency_ms = tts_latency
        self.metrics.confidence_score = confidence
        self.metrics.last_activity = datetime.utcnow()
        
        # Calculate audio quality score (mock implementation)
        self.metrics.audio_quality_score = min(0.95, confidence + 0.1)
    
    async def _notify_processing_complete(self, processing_id: str, result: Dict[str, Any]):
        """Notify callbacks that processing is complete"""
        for callback in self.processing_callbacks:
            try:
                await callback("processing_complete", {
                    "processing_id": processing_id,
                    "result": result,
                    "session_id": self.session_id
                })
            except Exception as e:
                logger.warning(f"Error in processing callback: {e}")
    
    def get_metrics(self) -> VoiceProcessingMetrics:
        """Get current processing metrics"""
        return self.metrics
    
    def get_coaching_context(self) -> Optional[SalesCoachingContext]:
        """Get current coaching context"""
        return self.coaching_context

class VoiceServiceManager:
    """
    Manager for voice processing services and pipeline orchestration
    Handles multiple concurrent voice sessions and provides monitoring
    """
    
    def __init__(self):
        self.active_pipelines: Dict[str, VoiceProcessingPipeline] = {}
        self.service_metrics = {
            "total_sessions": 0,
            "active_sessions": 0,
            "average_latency_ms": 0.0,
            "success_rate": 0.0,
            "total_processing_time_ms": 0.0
        }
    
    async def create_pipeline(self, elevenlabs_client: ElevenLabsConversationalClient, 
                            coaching_context: Optional[SalesCoachingContext] = None,
                            user_id: str = "default_user") -> str:
        """Create a new voice processing pipeline"""
        pipeline = VoiceProcessingPipeline(elevenlabs_client)
        
        if coaching_context:
            await pipeline.set_coaching_context(coaching_context, user_id)
        
        # Add service-level callbacks
        pipeline.add_processing_callback(self._handle_pipeline_event)
        pipeline.add_stage_callback(self._handle_stage_change)
        
        # Store pipeline
        pipeline_id = pipeline.session_id
        self.active_pipelines[pipeline_id] = pipeline
        
        # Update metrics
        self.service_metrics["total_sessions"] += 1
        self.service_metrics["active_sessions"] = len(self.active_pipelines)
        
        logger.info(f"Created voice processing pipeline: {pipeline_id} for user: {user_id}")
        return pipeline_id
    
    async def get_pipeline(self, pipeline_id: str) -> Optional[VoiceProcessingPipeline]:
        """Get a pipeline by ID"""
        return self.active_pipelines.get(pipeline_id)
    
    async def remove_pipeline(self, pipeline_id: str):
        """Remove and cleanup a pipeline"""
        if pipeline_id in self.active_pipelines:
            del self.active_pipelines[pipeline_id]
            self.service_metrics["active_sessions"] = len(self.active_pipelines)
            logger.info(f"Removed voice processing pipeline: {pipeline_id}")
    
    async def _handle_pipeline_event(self, event_type: str, data: Dict[str, Any]):
        """Handle events from pipelines"""
        if event_type == "processing_complete":
            # Update service metrics
            result = data.get("result", {})
            metrics = result.get("metrics", {})
            
            if metrics:
                # Update average latency
                total_latency = metrics.get("total_latency_ms", 0)
                self.service_metrics["total_processing_time_ms"] += total_latency
                
                # Update success rate
                if result.get("status") == "success":
                    # Calculate success rate (simplified)
                    pass
    
    async def _handle_stage_change(self, stage: ProcessingStage, session_id: str):
        """Handle stage changes from pipelines"""
        logger.debug(f"Pipeline {session_id} moved to stage: {stage.value}")
    
    def get_service_metrics(self) -> Dict[str, Any]:
        """Get overall service metrics"""
        return {
            **self.service_metrics,
            "timestamp": datetime.utcnow().isoformat(),
            "active_pipeline_count": len(self.active_pipelines)
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform service health check"""
        return {
            "status": "healthy",
            "service": "voice_processing_pipeline",
            "metrics": self.get_service_metrics(),
            "elevenlabs_configured": bool(settings.ELEVENLABS_API_KEY)
        }

# Global service manager instance
voice_service_manager = VoiceServiceManager()

# Helper functions for common use cases

async def create_sales_coaching_pipeline(elevenlabs_client: ElevenLabsConversationalClient,
                                       scenario_config: Dict[str, Any],
                                       user_id: str) -> str:
    """Create a pipeline configured for sales coaching"""
    coaching_context = SalesCoachingContext(
        scenario_type=scenario_config.get("scenario_type", "cold_call"),
        prospect_persona=scenario_config.get("prospect_persona", "enterprise_vp"),
        difficulty_level=scenario_config.get("difficulty_level", 2),
        training_objectives=scenario_config.get("training_objectives", [
            "Practice discovery questions",
            "Handle price objections", 
            "Build value proposition"
        ]),
        conversation_history=[],
        current_step=1,
        performance_score=0.0,
        coaching_feedback=[]
    )
    
    return await voice_service_manager.create_pipeline(elevenlabs_client, coaching_context, user_id)

async def process_voice_interaction(pipeline_id: str, audio_data: bytes) -> Dict[str, Any]:
    """Process a voice interaction through the pipeline"""
    pipeline = await voice_service_manager.get_pipeline(pipeline_id)
    
    if not pipeline:
        return {
            "status": "error",
            "error": "Pipeline not found",
            "pipeline_id": pipeline_id
        }
    
    return await pipeline.process_user_audio(audio_data)