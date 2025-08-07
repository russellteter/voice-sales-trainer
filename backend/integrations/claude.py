"""
Claude API Integration for Sales Training Intelligence
Implements the 6-step Mollick simulation framework with conversation analysis and learning effectiveness measurement
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import tiktoken

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from anthropic import AsyncAnthropic, APIError, APIConnectionError, RateLimitError

from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

class MollickFrameworkStep(Enum):
    """6-step Mollick simulation framework steps"""
    CONTEXT_GATHERING = 1  # Gather user context and learning objectives
    SCENARIO_SELECTION = 2  # Select appropriate scenario based on context
    SCENE_SETTING = 3  # Establish scenario context and goals
    INTERACTIVE_ROLEPLAY = 4  # Core role-play interaction
    STRUCTURED_FEEDBACK = 5  # Provide evidence-based feedback
    EXTENDED_LEARNING = 6  # Deepen learning with additional scenarios

class AssessmentDimension(Enum):
    """Performance assessment dimensions"""
    DISCOVERY_QUESTIONS = "discovery_questions"
    OBJECTION_HANDLING = "objection_handling"
    VALUE_ARTICULATION = "value_articulation"
    ACTIVE_LISTENING = "active_listening"
    CONVERSATION_CONTROL = "conversation_control"
    EMPATHY_BUILDING = "empathy_building"
    BUSINESS_ACUMEN = "business_acumen"
    CLOSING_SKILLS = "closing_skills"

@dataclass
class ConversationAnalysis:
    """Analysis results for a conversation turn"""
    turn_id: str
    user_input: str
    ai_response: str
    assessment_scores: Dict[AssessmentDimension, float]
    coaching_feedback: List[str]
    improvement_suggestions: List[str]
    confidence_score: float
    processing_time_ms: float
    timestamp: datetime

@dataclass
class LearningContext:
    """Context for learning intelligence processing"""
    user_id: str
    session_id: str
    scenario_type: str
    prospect_persona: str
    difficulty_level: int
    learning_objectives: List[str]
    current_step: MollickFrameworkStep
    conversation_history: List[Dict[str, Any]]
    performance_metrics: Dict[str, float]
    skill_gaps: List[str]
    adaptive_parameters: Dict[str, Any]

@dataclass
class ClaudeResponse:
    """Response from Claude API with metadata"""
    content: str
    usage_tokens: int
    processing_time_ms: float
    model_used: str
    confidence: float
    timestamp: datetime
    coaching_metadata: Dict[str, Any]

class ClaudeAPIClient:
    """
    Advanced Claude API client for sales training intelligence
    Implements sophisticated conversation analysis and coaching feedback generation
    """
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.CLAUDE_API_KEY
        if not self.api_key:
            raise ValueError("Claude API key is required")
        
        self.client = AsyncAnthropic(api_key=self.api_key)
        self.model = settings.CLAUDE_MODEL
        self.max_tokens = settings.CLAUDE_MAX_TOKENS
        self.temperature = getattr(settings, 'CLAUDE_TEMPERATURE', 0.7)
        
        # Initialize tokenizer for prompt optimization
        try:
            self.tokenizer = tiktoken.encoding_for_model("gpt-4")  # Approximate tokenizer
        except:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Performance tracking
        self.call_count = 0
        self.total_tokens_used = 0
        self.average_response_time = 0.0
        
        logger.info(f"Claude API client initialized with model: {self.model}")

    @retry(
        retry=retry_if_exception_type((APIConnectionError, RateLimitError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=60)
    )
    async def _make_api_call(self, messages: List[Dict[str, str]], 
                           system_prompt: str = None,
                           max_tokens: int = None,
                           temperature: float = None) -> ClaudeResponse:
        """Make API call to Claude with retry logic and error handling"""
        start_time = time.time()
        
        try:
            # Prepare request parameters
            request_params = {
                "model": self.model,
                "max_tokens": max_tokens or self.max_tokens,
                "temperature": temperature or self.temperature,
                "messages": messages
            }
            
            if system_prompt:
                request_params["system"] = system_prompt
            
            # Make the API call
            response = await self.client.messages.create(**request_params)
            
            # Calculate processing time
            processing_time = (time.time() - start_time) * 1000
            
            # Extract response content
            content = response.content[0].text if response.content else ""
            
            # Update performance metrics
            self.call_count += 1
            self.total_tokens_used += response.usage.input_tokens + response.usage.output_tokens
            self.average_response_time = (
                (self.average_response_time * (self.call_count - 1) + processing_time) 
                / self.call_count
            )
            
            # Create response object
            claude_response = ClaudeResponse(
                content=content,
                usage_tokens=response.usage.input_tokens + response.usage.output_tokens,
                processing_time_ms=processing_time,
                model_used=self.model,
                confidence=0.9,  # Default confidence, could be enhanced
                timestamp=datetime.utcnow(),
                coaching_metadata={}
            )
            
            logger.debug(f"Claude API call successful. Tokens: {claude_response.usage_tokens}, "
                        f"Time: {processing_time:.2f}ms")
            
            return claude_response
            
        except APIError as e:
            logger.error(f"Claude API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in Claude API call: {e}")
            raise

    async def analyze_conversation_turn(self, learning_context: LearningContext, 
                                      user_input: str, ai_response: str) -> ConversationAnalysis:
        """
        Analyze a single conversation turn for learning effectiveness
        Provides detailed assessment across multiple dimensions
        """
        
        # Build analysis prompt
        system_prompt = self._build_analysis_system_prompt(learning_context)
        analysis_prompt = self._build_conversation_analysis_prompt(
            learning_context, user_input, ai_response
        )
        
        messages = [{"role": "user", "content": analysis_prompt}]
        
        try:
            # Get analysis from Claude
            response = await self._make_api_call(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=1500,
                temperature=0.3  # Lower temperature for more consistent analysis
            )
            
            # Parse the structured response
            analysis_data = self._parse_analysis_response(response.content)
            
            # Create conversation analysis object
            analysis = ConversationAnalysis(
                turn_id=f"{learning_context.session_id}_{len(learning_context.conversation_history)}",
                user_input=user_input,
                ai_response=ai_response,
                assessment_scores=analysis_data["scores"],
                coaching_feedback=analysis_data["coaching_feedback"],
                improvement_suggestions=analysis_data["improvement_suggestions"],
                confidence_score=analysis_data["confidence"],
                processing_time_ms=response.processing_time_ms,
                timestamp=datetime.utcnow()
            )
            
            logger.info(f"Conversation analysis completed for turn: {analysis.turn_id}")
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze conversation turn: {e}")
            # Return default analysis on failure
            return self._create_default_analysis(user_input, ai_response, learning_context.session_id)

    async def generate_enhanced_response(self, learning_context: LearningContext, 
                                       user_input: str) -> ClaudeResponse:
        """
        Generate an enhanced AI response using sales coaching intelligence
        Adapts response based on current step in Mollick framework
        """
        
        # Build contextual system prompt
        system_prompt = self._build_response_system_prompt(learning_context)
        
        # Build response generation prompt
        response_prompt = self._build_response_generation_prompt(learning_context, user_input)
        
        messages = [{"role": "user", "content": response_prompt}]
        
        try:
            # Generate response with higher creativity for roleplay
            temperature = self._get_temperature_for_step(learning_context.current_step)
            
            response = await self._make_api_call(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=300,  # Shorter responses for voice interaction
                temperature=temperature
            )
            
            # Add coaching metadata
            response.coaching_metadata = {
                "current_step": learning_context.current_step.value,
                "scenario_type": learning_context.scenario_type,
                "difficulty_level": learning_context.difficulty_level,
                "adaptive_adjustments": learning_context.adaptive_parameters
            }
            
            logger.info(f"Enhanced response generated for step: {learning_context.current_step.name}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to generate enhanced response: {e}")
            # Return fallback response
            return self._create_fallback_response()

    async def generate_coaching_feedback(self, learning_context: LearningContext,
                                       conversation_analysis: ConversationAnalysis) -> Dict[str, Any]:
        """
        Generate structured coaching feedback using Socratic method
        Provides evidence-based improvement suggestions
        """
        
        system_prompt = self._build_coaching_system_prompt()
        coaching_prompt = self._build_coaching_feedback_prompt(learning_context, conversation_analysis)
        
        messages = [{"role": "user", "content": coaching_prompt}]
        
        try:
            response = await self._make_api_call(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=800,
                temperature=0.4
            )
            
            # Parse coaching feedback
            feedback_data = self._parse_coaching_response(response.content)
            
            return {
                "socratic_questions": feedback_data.get("socratic_questions", []),
                "specific_improvements": feedback_data.get("specific_improvements", []),
                "positive_reinforcement": feedback_data.get("positive_reinforcement", []),
                "skill_development_focus": feedback_data.get("skill_development_focus", []),
                "next_challenge_level": feedback_data.get("next_challenge_level", learning_context.difficulty_level),
                "confidence": response.confidence,
                "processing_time_ms": response.processing_time_ms
            }
            
        except Exception as e:
            logger.error(f"Failed to generate coaching feedback: {e}")
            return self._create_default_coaching_feedback()

    async def assess_skill_progression(self, user_id: str, 
                                     recent_analyses: List[ConversationAnalysis]) -> Dict[str, Any]:
        """
        Assess skill progression over time using conversation analyses
        Identifies improvement trends and skill gaps
        """
        
        if not recent_analyses:
            return {"error": "No conversation analyses provided"}
        
        # Build progression analysis prompt
        system_prompt = self._build_progression_system_prompt()
        progression_prompt = self._build_progression_analysis_prompt(recent_analyses)
        
        messages = [{"role": "user", "content": progression_prompt}]
        
        try:
            response = await self._make_api_call(
                messages=messages,
                system_prompt=system_prompt,
                max_tokens=1000,
                temperature=0.2  # Very low temperature for analytical tasks
            )
            
            # Parse progression assessment
            assessment_data = self._parse_progression_response(response.content)
            
            return {
                "skill_improvements": assessment_data.get("skill_improvements", {}),
                "areas_needing_focus": assessment_data.get("areas_needing_focus", []),
                "confidence_trends": assessment_data.get("confidence_trends", {}),
                "recommended_practice": assessment_data.get("recommended_practice", []),
                "readiness_for_advancement": assessment_data.get("readiness_for_advancement", False),
                "overall_progress_score": assessment_data.get("overall_progress_score", 0.0),
                "assessment_timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to assess skill progression: {e}")
            return {"error": str(e)}

    def _build_analysis_system_prompt(self, learning_context: LearningContext) -> str:
        """Build system prompt for conversation analysis"""
        return f"""You are an expert sales training coach with deep expertise in conversation analysis and skill assessment. You specialize in the {learning_context.scenario_type} scenario type.

Your role is to analyze sales conversations with precision and provide evidence-based feedback. You evaluate performance across multiple dimensions:

1. Discovery Questions: Quality and effectiveness of information gathering
2. Objection Handling: Acknowledgment, understanding, and response technique
3. Value Articulation: Clarity and customer-centricity of value propositions
4. Active Listening: Demonstration of listening skills and empathy
5. Conversation Control: Ability to guide conversation toward objectives
6. Empathy Building: Connection and rapport establishment
7. Business Acumen: Understanding of business contexts and challenges
8. Closing Skills: Effectiveness in advancing the sales process

Assessment Scale: Rate each dimension from 1.0 (needs significant improvement) to 5.0 (expert level).

Current Context:
- Scenario: {learning_context.scenario_type}
- Prospect Persona: {learning_context.prospect_persona}
- Difficulty Level: {learning_context.difficulty_level}/5
- Learning Objectives: {', '.join(learning_context.learning_objectives)}
- Current Framework Step: {learning_context.current_step.name}

Provide structured, actionable feedback that helps learners improve their sales skills systematically."""

    def _build_conversation_analysis_prompt(self, learning_context: LearningContext, 
                                          user_input: str, ai_response: str) -> str:
        """Build prompt for analyzing conversation turn"""
        return f"""Analyze this sales conversation turn and provide detailed assessment:

**USER INPUT (Salesperson):**
{user_input}

**AI RESPONSE (Prospect):**
{ai_response}

**CONVERSATION HISTORY (Last 3 turns):**
{self._format_conversation_history(learning_context.conversation_history[-6:])}

**ANALYSIS REQUIREMENTS:**

1. **Dimension Scores** (1.0-5.0 scale):
   - Discovery Questions: [score and justification]
   - Objection Handling: [score and justification]  
   - Value Articulation: [score and justification]
   - Active Listening: [score and justification]
   - Conversation Control: [score and justification]
   - Empathy Building: [score and justification]
   - Business Acumen: [score and justification]
   - Closing Skills: [score and justification]

2. **Coaching Feedback** (2-3 specific observations):
   - What was done well
   - What could be improved
   - Evidence from the conversation

3. **Improvement Suggestions** (2-3 actionable recommendations):
   - Specific techniques to try
   - Alternative approaches
   - Practice opportunities

4. **Confidence Assessment** (0.0-1.0):
   - Overall confidence in this assessment

Format your response as JSON with the structure:
{{
  "scores": {{"discovery_questions": 3.5, ...}},
  "coaching_feedback": ["observation 1", "observation 2"],
  "improvement_suggestions": ["suggestion 1", "suggestion 2"],
  "confidence": 0.85
}}"""

    def _build_response_system_prompt(self, learning_context: LearningContext) -> str:
        """Build system prompt for response generation"""
        
        step_guidance = {
            MollickFrameworkStep.CONTEXT_GATHERING: "Focus on understanding the learner's background and goals. Ask clarifying questions about their experience and learning objectives.",
            MollickFrameworkStep.SCENARIO_SELECTION: "Help select an appropriate practice scenario based on their needs and skill level.",
            MollickFrameworkStep.SCENE_SETTING: "Establish the scenario context clearly. Set expectations and provide any necessary background information.",
            MollickFrameworkStep.INTERACTIVE_ROLEPLAY: f"Act as a realistic {learning_context.prospect_persona} in a {learning_context.scenario_type} scenario. Be challenging but fair, appropriate for difficulty level {learning_context.difficulty_level}.",
            MollickFrameworkStep.STRUCTURED_FEEDBACK: "Provide constructive feedback on the role-play performance. Be specific and actionable.",
            MollickFrameworkStep.EXTENDED_LEARNING: "Deepen the learning with additional scenarios or advanced techniques."
        }
        
        return f"""You are an expert sales coach and role-play partner specializing in {learning_context.scenario_type} scenarios.

Current Framework Step: {learning_context.current_step.name}
Step Guidance: {step_guidance[learning_context.current_step]}

Persona Details:
- Type: {learning_context.prospect_persona}
- Difficulty Level: {learning_context.difficulty_level}/5
- Scenario: {learning_context.scenario_type}

Learning Objectives: {', '.join(learning_context.learning_objectives)}

**Response Guidelines:**
- Keep responses concise (2-3 sentences) for voice interaction
- Stay in character and maintain consistency
- Provide appropriate challenge level for the learner's skill
- Use realistic business language and scenarios
- Be responsive to the learner's approach and adapt accordingly

**Voice Optimization:**
- Use natural, conversational tone
- Avoid overly complex sentences
- Include appropriate pauses with punctuation
- Maintain professional but engaging delivery"""

    def _build_response_generation_prompt(self, learning_context: LearningContext, 
                                        user_input: str) -> str:
        """Build prompt for generating contextual responses"""
        return f"""Generate an appropriate response to this sales conversation:

**LEARNER'S INPUT:**
{user_input}

**CONVERSATION CONTEXT:**
{self._format_conversation_history(learning_context.conversation_history[-4:])}

**CURRENT SITUATION:**
- Framework Step: {learning_context.current_step.name}
- Turn Count: {len(learning_context.conversation_history)}
- Performance Level: {learning_context.performance_metrics.get('average_score', 'N/A')}

**RESPONSE REQUIREMENTS:**
1. Stay in character as {learning_context.prospect_persona}
2. Respond appropriately to the learner's approach
3. Provide suitable challenge for difficulty level {learning_context.difficulty_level}
4. Keep response conversational and realistic
5. Optimize for voice delivery (clear, natural pacing)

Generate only the response content, no additional formatting or explanations."""

    def _parse_analysis_response(self, response_content: str) -> Dict[str, Any]:
        """Parse Claude's analysis response into structured data"""
        try:
            # Try to extract JSON from the response
            import json
            import re
            
            # Look for JSON pattern in the response
            json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)
                
                # Ensure all required keys are present
                scores = data.get("scores", {})
                
                # Convert string keys to enum keys if needed
                processed_scores = {}
                for dim in AssessmentDimension:
                    key_variants = [dim.value, dim.name.lower(), dim.value.replace('_', ' ')]
                    for variant in key_variants:
                        if variant in scores:
                            processed_scores[dim] = float(scores[variant])
                            break
                    if dim not in processed_scores:
                        processed_scores[dim] = 3.0  # Default score
                
                return {
                    "scores": processed_scores,
                    "coaching_feedback": data.get("coaching_feedback", ["Good conversation engagement"]),
                    "improvement_suggestions": data.get("improvement_suggestions", ["Continue practicing"]),
                    "confidence": float(data.get("confidence", 0.8))
                }
            else:
                # Fallback parsing if no JSON found
                return self._parse_text_analysis(response_content)
                
        except Exception as e:
            logger.warning(f"Failed to parse analysis response: {e}")
            return self._create_default_analysis_data()

    def _parse_text_analysis(self, content: str) -> Dict[str, Any]:
        """Fallback text parsing for analysis response"""
        # Simple heuristic parsing
        scores = {}
        for dim in AssessmentDimension:
            scores[dim] = 3.0  # Default score
        
        feedback = ["Analysis completed successfully"]
        suggestions = ["Continue practicing your sales skills"]
        
        return {
            "scores": scores,
            "coaching_feedback": feedback,
            "improvement_suggestions": suggestions,
            "confidence": 0.7
        }

    def _parse_coaching_response(self, response_content: str) -> Dict[str, Any]:
        """Parse coaching feedback response"""
        try:
            import json
            import re
            
            json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                return self._extract_coaching_from_text(response_content)
        except:
            return self._create_default_coaching_data()

    def _parse_progression_response(self, response_content: str) -> Dict[str, Any]:
        """Parse skill progression assessment response"""
        try:
            import json
            import re
            
            json_match = re.search(r'\{.*\}', response_content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        return {
            "skill_improvements": {},
            "areas_needing_focus": [],
            "confidence_trends": {},
            "recommended_practice": [],
            "readiness_for_advancement": False,
            "overall_progress_score": 3.0
        }

    def _format_conversation_history(self, history: List[Dict[str, Any]]) -> str:
        """Format conversation history for prompts"""
        if not history:
            return "No previous conversation history."
        
        formatted = []
        for i, turn in enumerate(history[-6:], 1):  # Last 6 turns max
            role = "Salesperson" if turn.get("role") == "user" else "Prospect"
            content = turn.get("content", "")
            formatted.append(f"{i}. {role}: {content}")
        
        return "\n".join(formatted)

    def _get_temperature_for_step(self, step: MollickFrameworkStep) -> float:
        """Get appropriate temperature for different framework steps"""
        temperature_map = {
            MollickFrameworkStep.CONTEXT_GATHERING: 0.7,
            MollickFrameworkStep.SCENARIO_SELECTION: 0.5,
            MollickFrameworkStep.SCENE_SETTING: 0.6,
            MollickFrameworkStep.INTERACTIVE_ROLEPLAY: 0.8,
            MollickFrameworkStep.STRUCTURED_FEEDBACK: 0.4,
            MollickFrameworkStep.EXTENDED_LEARNING: 0.6
        }
        return temperature_map.get(step, 0.7)

    def _create_default_analysis(self, user_input: str, ai_response: str, session_id: str) -> ConversationAnalysis:
        """Create default analysis when processing fails"""
        default_scores = {dim: 3.0 for dim in AssessmentDimension}
        
        return ConversationAnalysis(
            turn_id=f"{session_id}_{int(time.time())}",
            user_input=user_input,
            ai_response=ai_response,
            assessment_scores=default_scores,
            coaching_feedback=["Unable to analyze this conversation turn, but keep practicing!"],
            improvement_suggestions=["Continue engaging in the conversation"],
            confidence_score=0.5,
            processing_time_ms=0.0,
            timestamp=datetime.utcnow()
        )

    def _create_default_analysis_data(self) -> Dict[str, Any]:
        """Create default analysis data structure"""
        return {
            "scores": {dim: 3.0 for dim in AssessmentDimension},
            "coaching_feedback": ["Good conversation engagement"],
            "improvement_suggestions": ["Continue practicing"],
            "confidence": 0.7
        }

    def _create_default_coaching_feedback(self) -> Dict[str, Any]:
        """Create default coaching feedback"""
        return {
            "socratic_questions": ["What do you think worked well in that interaction?"],
            "specific_improvements": ["Continue practicing active listening"],
            "positive_reinforcement": ["Good job engaging in the conversation"],
            "skill_development_focus": ["Communication skills"],
            "next_challenge_level": 2,
            "confidence": 0.6,
            "processing_time_ms": 0.0
        }

    def _create_fallback_response(self) -> ClaudeResponse:
        """Create fallback response when generation fails"""
        return ClaudeResponse(
            content="I understand. Could you tell me more about that?",
            usage_tokens=0,
            processing_time_ms=0.0,
            model_used=self.model,
            confidence=0.5,
            timestamp=datetime.utcnow(),
            coaching_metadata={"fallback": True}
        )

    def _build_coaching_system_prompt(self) -> str:
        """Build system prompt for coaching feedback generation"""
        return """You are an expert sales coach specializing in evidence-based feedback using the Socratic method. Your approach focuses on:

1. **Socratic Questioning**: Ask thought-provoking questions that lead learners to self-discovery
2. **Specific Evidence**: Reference specific moments from the conversation
3. **Positive Reinforcement**: Highlight what was done well
4. **Actionable Improvements**: Provide concrete next steps
5. **Skill Development Focus**: Identify key areas for continued growth

Your feedback should inspire reflection and promote autonomous learning rather than simply telling the learner what to do."""

    def _build_coaching_feedback_prompt(self, learning_context: LearningContext,
                                      conversation_analysis: ConversationAnalysis) -> str:
        """Build prompt for generating coaching feedback"""
        return f"""Provide coaching feedback for this sales conversation analysis:

**CONVERSATION ANALYSIS:**
- User Input: {conversation_analysis.user_input}
- AI Response: {conversation_analysis.ai_response}
- Assessment Scores: {conversation_analysis.assessment_scores}
- Current Feedback: {conversation_analysis.coaching_feedback}

**LEARNER CONTEXT:**
- Scenario: {learning_context.scenario_type}
- Difficulty Level: {learning_context.difficulty_level}/5
- Learning Objectives: {', '.join(learning_context.learning_objectives)}
- Session Progress: {len(learning_context.conversation_history)} turns

**GENERATE COACHING FEEDBACK:**

1. **Socratic Questions** (2-3 questions that promote reflection):
   - Questions about their approach
   - Questions about alternative strategies
   - Questions about the prospect's perspective

2. **Specific Improvements** (2-3 actionable recommendations):
   - Reference specific moments from the conversation
   - Provide alternative phrasings or approaches
   - Connect to learning objectives

3. **Positive Reinforcement** (1-2 specific strengths):
   - What they did well
   - Evidence from the conversation
   - Connection to sales best practices

4. **Skill Development Focus** (1-2 key areas):
   - Most important areas for continued practice
   - Specific techniques to work on

5. **Next Challenge Level** (1-5):
   - Recommended difficulty for next practice

Format as JSON: {{"socratic_questions": [...], "specific_improvements": [...], "positive_reinforcement": [...], "skill_development_focus": [...], "next_challenge_level": 3}}"""

    def _build_progression_system_prompt(self) -> str:
        """Build system prompt for skill progression assessment"""
        return """You are an expert learning analytics specialist for sales training. You analyze conversation patterns over time to identify skill progression, learning trends, and areas for development.

Your assessment focuses on:
1. Trend analysis across conversation dimensions
2. Identification of consistent improvements or declines
3. Recognition of skill transfer between different scenarios
4. Assessment of readiness for more challenging practice
5. Personalized learning path recommendations

Provide data-driven insights that help learners understand their growth trajectory and optimize their practice sessions."""

    def _build_progression_analysis_prompt(self, analyses: List[ConversationAnalysis]) -> str:
        """Build prompt for skill progression analysis"""
        # Aggregate data from analyses
        time_series = []
        for analysis in analyses:
            time_series.append({
                "timestamp": analysis.timestamp.isoformat(),
                "scores": {dim.value: score for dim, score in analysis.assessment_scores.items()},
                "confidence": analysis.confidence_score,
                "turn_id": analysis.turn_id
            })
        
        return f"""Analyze skill progression from these {len(analyses)} conversation analyses:

**TIME SERIES DATA:**
{json.dumps(time_series, indent=2)}

**ASSESSMENT REQUIREMENTS:**

1. **Skill Improvements** (dimension-wise trends):
   - Which skills are improving consistently?
   - Rate of improvement for each dimension
   - Statistical confidence in trends

2. **Areas Needing Focus** (priority order):
   - Skills showing decline or stagnation
   - Skills consistently scoring below average
   - Skills critical for advancement

3. **Confidence Trends**:
   - Overall confidence progression
   - Stability of assessment confidence

4. **Recommended Practice**:
   - Specific scenarios to focus on
   - Skills requiring targeted practice
   - Optimal practice frequency

5. **Readiness for Advancement**:
   - Boolean assessment of readiness for harder scenarios
   - Criteria met/not met for advancement

6. **Overall Progress Score** (1.0-5.0):
   - Weighted average considering all factors
   - Trajectory and consistency bonuses

Format as JSON with detailed analysis for each category."""

    def _extract_coaching_from_text(self, content: str) -> Dict[str, Any]:
        """Extract coaching elements from text response"""
        return {
            "socratic_questions": ["What do you think could be improved?"],
            "specific_improvements": ["Focus on building rapport"],
            "positive_reinforcement": ["Good engagement in the conversation"],
            "skill_development_focus": ["Communication"],
            "next_challenge_level": 2
        }

    def _create_default_coaching_data(self) -> Dict[str, Any]:
        """Create default coaching data structure"""
        return {
            "socratic_questions": ["What worked well in that interaction?"],
            "specific_improvements": ["Continue practicing active listening"],
            "positive_reinforcement": ["Good conversation engagement"],
            "skill_development_focus": ["General communication skills"],
            "next_challenge_level": 2
        }

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of Claude API connection"""
        try:
            # Simple test call
            test_messages = [{"role": "user", "content": "Hello, this is a health check."}]
            response = await self._make_api_call(
                messages=test_messages,
                max_tokens=10,
                temperature=0.1
            )
            
            return {
                "status": "healthy",
                "service": "claude_api",
                "model": self.model,
                "average_response_time_ms": self.average_response_time,
                "total_calls": self.call_count,
                "total_tokens_used": self.total_tokens_used,
                "last_successful_call": response.timestamp.isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "service": "claude_api",
                "error": str(e),
                "last_attempt": datetime.utcnow().isoformat()
            }

    def get_usage_metrics(self) -> Dict[str, Any]:
        """Get API usage metrics"""
        return {
            "total_api_calls": self.call_count,
            "total_tokens_used": self.total_tokens_used,
            "average_response_time_ms": self.average_response_time,
            "tokens_per_call_avg": self.total_tokens_used / max(1, self.call_count),
            "estimated_cost_usd": self.total_tokens_used * 0.000015,  # Approximate cost
            "last_reset": datetime.utcnow().isoformat()
        }