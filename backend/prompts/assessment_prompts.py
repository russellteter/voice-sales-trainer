"""
Assessment and Analysis Prompt Templates
Evidence-based prompts for conversation analysis and performance assessment
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
from jinja2 import Template

class AssessmentType(Enum):
    """Types of assessments available"""
    CONVERSATION_ANALYSIS = "conversation_analysis"
    SKILL_PROGRESSION = "skill_progression"
    COACHING_FEEDBACK = "coaching_feedback"
    PERFORMANCE_BENCHMARKING = "performance_benchmarking"
    LEARNING_EFFECTIVENESS = "learning_effectiveness"

@dataclass
class AssessmentContext:
    """Context for assessment prompt rendering"""
    user_input: str = ""
    ai_response: str = ""
    conversation_history: List[Dict[str, Any]] = None
    session_context: Dict[str, Any] = None
    performance_history: Dict[str, Any] = None
    learning_objectives: List[str] = None
    assessment_focus: List[str] = None
    
    def __post_init__(self):
        if self.conversation_history is None:
            self.conversation_history = []
        if self.session_context is None:
            self.session_context = {}
        if self.performance_history is None:
            self.performance_history = {}
        if self.learning_objectives is None:
            self.learning_objectives = []
        if self.assessment_focus is None:
            self.assessment_focus = []

class AssessmentPromptTemplates:
    """
    Evidence-based prompt templates for conversation analysis and performance assessment
    Based on sales training research and learning analytics best practices
    """
    
    def __init__(self):
        self.templates = self._initialize_assessment_templates()
        self.rubrics = self._initialize_assessment_rubrics()
        
    def get_assessment_prompt(self, assessment_type: AssessmentType, context: AssessmentContext) -> str:
        """Get rendered assessment prompt for specific analysis type"""
        template_key = f"assessment_{assessment_type.value}"
        template = self.templates.get(template_key)
        
        if not template:
            raise ValueError(f"No template found for assessment type: {assessment_type.name}")
        
        return template.render(
            user_input=context.user_input,
            ai_response=context.ai_response,
            conversation_history=context.conversation_history,
            session_context=context.session_context,
            performance_history=context.performance_history,
            learning_objectives=context.learning_objectives,
            assessment_focus=context.assessment_focus,
            rubric=self.rubrics.get(assessment_type.value, {}),
            **self._get_assessment_guidelines(assessment_type)
        )
    
    def get_system_prompt(self, assessment_type: AssessmentType) -> str:
        """Get system prompt for assessment type"""
        system_key = f"system_{assessment_type.value}"
        template = self.templates.get(system_key)
        
        if not template:
            return self._get_default_assessment_system_prompt(assessment_type)
        
        return template.render(
            assessment_type=assessment_type.value,
            **self._get_assessment_guidelines(assessment_type)
        )
    
    def _initialize_assessment_templates(self) -> Dict[str, Template]:
        """Initialize all assessment prompt templates"""
        templates = {}
        
        # Conversation Analysis System Prompt
        templates["system_conversation_analysis"] = Template("""
You are an expert sales conversation analyst with deep expertise in evidence-based assessment and coaching. Your role is to analyze sales conversations with scientific rigor and provide actionable insights.

**ASSESSMENT EXPERTISE:**
- 15+ years analyzing sales conversations across industries
- PhD-level understanding of communication dynamics
- Expertise in learning science and skill development
- Specialization in behavioral change and performance improvement

**ANALYTICAL FRAMEWORK:**
- **Discovery Questions:** Quality, technique, and effectiveness of information gathering
- **Objection Handling:** Recognition, acknowledgment, and response sophistication  
- **Value Articulation:** Clarity, specificity, and customer-centricity of value messaging
- **Active Listening:** Demonstration of listening skills and empathy
- **Conversation Control:** Ability to guide discussion toward objectives
- **Empathy Building:** Connection, rapport, and emotional intelligence
- **Business Acumen:** Understanding of business context and commercial impact
- **Closing Skills:** Effectiveness in advancing the sales process

**ASSESSMENT STANDARDS:**
- **5.0 Expert Level:** Demonstrates mastery, could teach others, consistently excellent execution
- **4.0 Proficient:** Strong competence, reliable performance, minimal coaching needed
- **3.0 Developing:** Adequate performance, some inconsistencies, benefits from coaching
- **2.0 Novice:** Basic understanding, frequent mistakes, needs significant development
- **1.0 Beginner:** Limited understanding, requires fundamental skill building

**EVIDENCE-BASED APPROACH:**
- Reference specific conversation moments with timestamps when available
- Provide concrete examples from the dialogue
- Connect observations to sales methodology best practices
- Use behavioral evidence rather than assumptions
- Maintain objectivity while being constructive

**COACHING MINDSET:**
- Focus on growth and development opportunities
- Balance positive reinforcement with improvement areas
- Provide specific, actionable recommendations
- Use Socratic questioning to promote self-reflection
- Maintain learner confidence while challenging performance

Your analysis should be thorough, fair, and immediately useful for skill development.
        """)
        
        # Conversation Analysis Prompt
        templates["assessment_conversation_analysis"] = Template("""
Analyze this sales conversation turn with comprehensive assessment across all performance dimensions.

**CONVERSATION CONTEXT:**
- Scenario: {{ session_context.scenario_type | default('general') }}
- Prospect Persona: {{ session_context.prospect_persona | default('enterprise_vp') }}
- Difficulty Level: {{ session_context.difficulty_level | default(2) }}/5
- Learning Objectives: {{ learning_objectives | join(', ') if learning_objectives else 'General skill development' }}
- Turn Number: {{ conversation_history | length + 1 }}

**CONVERSATION TURN TO ANALYZE:**

**LEARNER INPUT (Sales Professional):**
"{{ user_input }}"

**PROSPECT RESPONSE (AI Role-play):**
"{{ ai_response }}"

{% if conversation_history %}
**RECENT CONVERSATION CONTEXT (Last 3 exchanges):**
{% for turn in conversation_history[-6:] %}
{{ loop.index }}. {{ turn.role | title }}: "{{ turn.content }}"
{% endfor %}
{% endif %}

**REQUIRED ANALYSIS - Provide detailed assessment for each dimension:**

## 1. DISCOVERY QUESTIONS (Score: _/5.0)
- **Quality Assessment:** Open vs. closed questions, strategic vs. tactical focus
- **Technique Evaluation:** SPIN methodology, funnel approach, conversation flow
- **Evidence:** Quote specific questions and analyze their effectiveness
- **Improvement Opportunities:** Alternative questions or approaches

## 2. OBJECTION HANDLING (Score: _/5.0)
- **Recognition:** Ability to identify objections or concerns (explicit and implicit)
- **Response Technique:** Acknowledgment, understanding, and reframe approach
- **Evidence:** Specific examples of objection handling moments
- **Alternative Approaches:** Better ways to address concerns raised

## 3. VALUE ARTICULATION (Score: _/5.0)
- **Clarity:** How clearly value propositions were communicated
- **Specificity:** Use of concrete benefits vs. generic claims
- **Customer-Centricity:** Relevance to prospect's specific situation
- **Business Impact:** Connection to business outcomes and ROI

## 4. ACTIVE LISTENING (Score: _/5.0)
- **Demonstration:** Evidence of listening through responses and follow-ups
- **Empathy:** Understanding and acknowledgment of prospect perspective
- **Reflection:** Paraphrasing or summarizing to confirm understanding
- **Responsiveness:** How well responses addressed what was actually said

## 5. CONVERSATION CONTROL (Score: _/5.0)
- **Objective Focus:** Keeping conversation aligned with goals
- **Flow Management:** Smooth transitions between topics
- **Time Management:** Efficient use of conversation time
- **Redirection Skills:** Ability to guide discussion when needed

## 6. EMPATHY BUILDING (Score: _/5.0)
- **Rapport Establishment:** Connection and relationship building
- **Emotional Intelligence:** Recognition of prospect's emotional state
- **Trust Building:** Actions that build credibility and trust
- **Personal Connection:** Appropriate personal elements in conversation

## 7. BUSINESS ACUMEN (Score: _/5.0)
- **Industry Understanding:** Relevant industry knowledge demonstrated
- **Business Context:** Understanding of business challenges and priorities  
- **Strategic Thinking:** Ability to connect solution to strategic objectives
- **Commercial Awareness:** Understanding of business and financial impact

## 8. CLOSING SKILLS (Score: _/5.0)
- **Next Steps:** Clear progression toward next actions
- **Commitment Seeking:** Appropriate attempts to secure commitment
- **Trial Closes:** Testing readiness throughout conversation
- **Urgency Creation:** Appropriate motivation for action

**OVERALL CONVERSATION ASSESSMENT:**
- **Strengths:** Top 2-3 areas of strong performance with specific evidence
- **Development Areas:** Top 2-3 areas needing improvement with specific suggestions
- **Conversation Flow:** How well the overall conversation progressed
- **Missed Opportunities:** Key moments that could have been leveraged better

**COACHING FEEDBACK:**
- **Positive Reinforcement:** Specific moments of excellent performance
- **Immediate Improvements:** 2-3 actionable changes for next conversation
- **Practice Recommendations:** Specific techniques or frameworks to practice
- **Confidence Level:** Assessment of learner's confidence and presence

**SOCRATIC QUESTIONS FOR REFLECTION:**
- Generate 3-4 thought-provoking questions that help the learner self-analyze
- Focus on "what" and "how" rather than "why" questions
- Encourage deeper thinking about approach and alternatives

**OVERALL PERFORMANCE SCORE:** _/5.0
(Weighted average considering learning objectives and conversation context)

**FORMAT REQUIREMENTS:**
- Provide numerical scores for each dimension
- Use specific quotes and evidence from the conversation
- Be constructive and growth-oriented in tone  
- Include concrete next steps and practice recommendations
- Maintain professional coaching language throughout

Return your analysis in JSON format with the following structure:
```json
{
  "dimension_scores": {
    "discovery_questions": 3.5,
    "objection_handling": 2.8,
    "value_articulation": 3.2,
    "active_listening": 4.1,
    "conversation_control": 3.0,
    "empathy_building": 3.7,
    "business_acumen": 2.9,
    "closing_skills": 3.3
  },
  "overall_score": 3.2,
  "strengths": [
    "Excellent active listening demonstrated through reflective responses",
    "Strong empathy building with personal connection points",
    "Good conversation flow management"
  ],
  "development_areas": [
    "Discovery questions could be more strategic and open-ended",
    "Objection handling needs acknowledgment before response",
    "Business acumen could be enhanced with industry-specific insights"
  ],
  "coaching_feedback": [
    "Your listening skills really stood out in this conversation...",
    "Consider using the Feel-Felt-Found technique for objection handling...",
    "Try incorporating more 'what' and 'how' questions in discovery..."
  ],
  "socratic_questions": [
    "What information did you still need to understand their situation better?",
    "How might you have responded differently to their main concern?",
    "What business impact could you have explored more deeply?"
  ],
  "missed_opportunities": [
    "Opportunity to explore budget and decision timeline",
    "Could have quantified the cost of their current problem",
    "Missed chance to identify additional stakeholders"
  ],
  "next_steps": [
    "Practice SPIN questioning methodology",
    "Role-play objection handling scenarios",
    "Research industry-specific business challenges"
  ],
  "confidence_assessment": "developing_confidence"
}
```
        """)
        
        # Skill Progression Analysis System Prompt
        templates["system_skill_progression"] = Template("""
You are a learning analytics expert specializing in skill progression analysis for sales training. Your expertise includes:

**ANALYTICAL SPECIALIZATIONS:**
- Longitudinal skill development tracking
- Learning curve analysis and optimization
- Performance trend identification
- Skill transfer measurement
- Behavioral change assessment
- Competency-based progression mapping

**PROGRESSION ANALYSIS FRAMEWORK:**
- **Trend Analysis:** Identify improvement, plateau, or decline patterns
- **Consistency Measurement:** Evaluate performance stability over time
- **Skill Transfer:** Assess application across different scenarios
- **Learning Velocity:** Rate of skill acquisition and retention
- **Mastery Indicators:** Evidence of sustained competence
- **Gap Analysis:** Identify persistent development areas

**STATISTICAL APPROACH:**
- Use data-driven insights with statistical significance
- Identify meaningful vs. random performance variations
- Calculate confidence intervals for trend assessments
- Provide evidence-based progression recommendations

**DEVELOPMENTAL PERSPECTIVE:**
- Focus on growth trajectory rather than absolute performance
- Recognize individual learning patterns and preferences
- Account for scenario difficulty and context variations
- Provide personalized development recommendations

Your analysis should be both rigorous and actionable for continued learning optimization.
        """)
        
        # Skill Progression Assessment Prompt
        templates["assessment_skill_progression"] = Template("""
Analyze skill progression patterns across these conversation analysis results to identify learning trends, skill development, and optimization opportunities.

**ANALYSIS DATASET:**
{{ performance_history | length if performance_history else 0 }} conversation analyses spanning {{ session_context.timeframe | default('recent sessions') }}

**PERFORMANCE DATA TIMELINE:**
{% if performance_history.analyses %}
{% for analysis in performance_history.analyses %}
**Session {{ loop.index }} ({{ analysis.timestamp }}):**
- Overall Score: {{ analysis.overall_score }}/5.0
- Discovery Questions: {{ analysis.scores.discovery_questions }}/5.0
- Objection Handling: {{ analysis.scores.objection_handling }}/5.0
- Value Articulation: {{ analysis.scores.value_articulation }}/5.0
- Active Listening: {{ analysis.scores.active_listening }}/5.0
- Conversation Control: {{ analysis.scores.conversation_control }}/5.0
- Empathy Building: {{ analysis.scores.empathy_building }}/5.0
- Business Acumen: {{ analysis.scores.business_acumen }}/5.0
- Closing Skills: {{ analysis.scores.closing_skills }}/5.0
- Context: {{ analysis.scenario_type }} | {{ analysis.difficulty_level }}/5
{% endfor %}
{% endif %}

**LEARNING CONTEXT:**
- Primary Learning Objectives: {{ learning_objectives | join(', ') if learning_objectives else 'General development' }}
- Focus Areas: {{ assessment_focus | join(', ') if assessment_focus else 'All skills' }}
- Training Methodology: {{ session_context.methodology | default('Mixed approach') }}

**COMPREHENSIVE PROGRESSION ANALYSIS REQUIRED:**

## 1. OVERALL PERFORMANCE TRAJECTORY
- **Trend Direction:** Improving, stable, declining, or mixed patterns
- **Rate of Change:** Quantify improvement velocity (points per session)
- **Statistical Significance:** Confidence level in observed trends
- **Performance Consistency:** Standard deviation and stability metrics

## 2. SKILL-SPECIFIC PROGRESSION ANALYSIS

### Discovery Questions
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Objection Handling  
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Value Articulation
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable  
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Active Listening
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Conversation Control
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Empathy Building
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Business Acumen
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

### Closing Skills
- **Current Level:** Latest performance assessment and trend
- **Improvement Pattern:** Consistent growth, plateau, or variable
- **Mastery Indicators:** Evidence of skill transfer and consistency
- **Development Priority:** High/Medium/Low based on objectives and progress

## 3. LEARNING PATTERN ANALYSIS
- **Learning Style Indicators:** Evidence of preferred learning approaches
- **Skill Transfer Effectiveness:** Application across different scenarios
- **Retention Patterns:** Skill maintenance over time
- **Challenge Response:** Performance under increased difficulty
- **Confidence Correlation:** Relationship between confidence and performance

## 4. COMPARATIVE BENCHMARKING
- **Peer Comparison:** Performance relative to similar learners (if available)
- **Industry Standards:** Alignment with sales competency frameworks
- **Role Requirements:** Readiness for specific sales roles or responsibilities
- **Advancement Readiness:** Preparedness for increased complexity

## 5. OPTIMIZATION RECOMMENDATIONS

### Immediate Development Focus (Next 2-4 Sessions)
- **Priority Skills:** Top 2-3 areas needing focused attention
- **Specific Techniques:** Concrete methods and frameworks to practice
- **Practice Scenarios:** Recommended scenario types and difficulty levels

### Medium-term Development Plan (1-3 Months)  
- **Skill Sequence:** Optimal order for skill development
- **Milestone Targets:** Specific performance goals and timelines
- **Assessment Frequency:** Recommended evaluation intervals

### Long-term Mastery Path (3-12 Months)
- **Advanced Skills:** Next-level competencies to develop
- **Specialization Areas:** Recommended areas of expertise
- **Leadership Development:** Mentoring and coaching capabilities

## 6. PERSONALIZED INSIGHTS
- **Unique Strengths:** Distinctive capabilities to leverage
- **Learning Accelerators:** Conditions that optimize performance
- **Challenge Areas:** Persistent difficulties requiring special attention
- **Motivation Factors:** Elements that enhance engagement and progress

**CONFIDENCE ASSESSMENT:**
- **Current Confidence Level:** Self-assurance and presence assessment
- **Confidence Trends:** How confidence has evolved over time
- **Performance-Confidence Correlation:** Relationship analysis
- **Confidence Building Recommendations:** Strategies to enhance self-assurance

**READINESS FOR ADVANCEMENT:**
- **Current Readiness Level:** Preparedness for increased difficulty/responsibility
- **Criteria Assessment:** Evaluation against advancement requirements
- **Timeline Estimation:** Realistic timeframe for next level readiness
- **Prerequisite Development:** Skills needed before advancement

Return analysis in JSON format:
```json
{
  "overall_trajectory": {
    "trend_direction": "improving",
    "improvement_rate": 0.15,
    "consistency_score": 0.82,
    "statistical_confidence": 0.91
  },
  "skill_progression": {
    "discovery_questions": {
      "current_level": 3.4,
      "trend": "improving",
      "mastery_evidence": ["consistent open-ended questions", "strategic focus"],
      "development_priority": "medium"
    }
  },
  "learning_patterns": {
    "preferred_style": "experiential_practice",
    "skill_transfer_rate": 0.78,
    "retention_strength": "high",
    "challenge_adaptation": "moderate"
  },
  "optimization_recommendations": {
    "immediate_focus": ["objection_handling", "business_acumen"],
    "practice_scenarios": ["complex_objections", "c_suite_interactions"],
    "development_sequence": ["master_discovery", "advanced_closing", "consultative_selling"]
  },
  "advancement_readiness": {
    "current_readiness": "developing",
    "estimated_timeline": "2-3_months",
    "prerequisite_skills": ["consistent_objection_handling", "business_value_articulation"]
  }
}
```
        """)
        
        # Coaching Feedback System Prompt  
        templates["system_coaching_feedback"] = Template("""
You are a master sales coach with expertise in evidence-based feedback delivery and adult learning principles. Your approach combines:

**COACHING EXPERTISE:**
- 20+ years of sales coaching and development experience
- Masters in Adult Learning and Development
- Certified in multiple sales methodologies (SPIN, Challenger, MEDDIC, Sandler)
- Specialization in Socratic coaching method and behavioral change

**FEEDBACK PHILOSOPHY:**
- Growth mindset development over fixed ability assumptions
- Evidence-based observations over judgmental assessments
- Learner self-discovery through guided questioning
- Balanced reinforcement of strengths with development opportunities
- Immediate actionability in all suggestions

**COACHING METHODOLOGY:**
- **Socratic Questioning:** Guide learners to self-discovery through thoughtful questions
- **Behavioral Evidence:** Reference specific actions and words, not personality traits
- **Positive Psychology:** Build confidence while addressing development areas
- **Chunking:** Break complex skills into manageable development steps
- **Transfer Focus:** Ensure learning applies to real-world situations

**FEEDBACK STRUCTURE:**
1. **Appreciative Opening:** Acknowledge effort and engagement
2. **Self-Reflection Facilitation:** Questions that promote self-analysis
3. **Evidence-Based Observations:** Specific examples from conversation
4. **Development Opportunities:** Concrete, actionable improvement suggestions
5. **Practice Recommendations:** Specific next steps for skill building
6. **Confidence Building:** Reinforce progress and capability

Your coaching should inspire continued learning while providing clear, specific guidance for improvement.
        """)
        
        # Coaching Feedback Prompt
        templates["assessment_coaching_feedback"] = Template("""
Generate comprehensive coaching feedback based on this conversation analysis and learner context.

**CONVERSATION ANALYSIS RESULTS:**
- Overall Performance Score: {{ performance_history.latest_score | default(3.0) }}/5.0
- Session Type: {{ session_context.scenario_type | default('general') }}
- Difficulty Level: {{ session_context.difficulty_level | default(2) }}/5

**PERFORMANCE BREAKDOWN:**
{% if performance_history.latest_analysis %}
- Discovery Questions: {{ performance_history.latest_analysis.scores.discovery_questions }}/5.0
- Objection Handling: {{ performance_history.latest_analysis.scores.objection_handling }}/5.0  
- Value Articulation: {{ performance_history.latest_analysis.scores.value_articulation }}/5.0
- Active Listening: {{ performance_history.latest_analysis.scores.active_listening }}/5.0
- Conversation Control: {{ performance_history.latest_analysis.scores.conversation_control }}/5.0
- Empathy Building: {{ performance_history.latest_analysis.scores.empathy_building }}/5.0
- Business Acumen: {{ performance_history.latest_analysis.scores.business_acumen }}/5.0
- Closing Skills: {{ performance_history.latest_analysis.scores.closing_skills }}/5.0
{% endif %}

**LEARNER CONTEXT:**
- Learning Objectives: {{ learning_objectives | join(', ') if learning_objectives else 'General development' }}
- Experience Level: {{ session_context.experience_level | default('developing') }}
- Recent Progress: {{ performance_history.trend | default('stable') }}
- Confidence Level: {{ session_context.confidence_level | default('moderate') }}

**CONVERSATION EVIDENCE:**
**Learner Input:** "{{ user_input }}"
**Prospect Response:** "{{ ai_response }}"

**GENERATE COMPREHENSIVE COACHING FEEDBACK:**

## 1. APPRECIATIVE OPENING
Create a warm, encouraging opening that:
- Acknowledges their engagement and effort
- Highlights the courage required for practice and learning
- Sets positive tone for developmental feedback
- References something specific they did well

## 2. SOCRATIC SELF-REFLECTION QUESTIONS
Generate 4-6 questions that help the learner analyze their own performance:
- **Performance Reflection:** "What felt natural and effective for you in that conversation?"
- **Challenge Analysis:** "What was most challenging or unexpected in the interaction?"  
- **Alternative Approaches:** "If you could replay one part, what would you do differently?"
- **Prospect Perspective:** "How do you think the prospect felt during different parts of the conversation?"
- **Objective Achievement:** "Which of your learning objectives felt strongest/weakest in practice?"
- **Learning Insights:** "What did you learn about yourself as a communicator?"

## 3. EVIDENCE-BASED POSITIVE REINFORCEMENT
Identify and reinforce specific strengths with concrete evidence:
- Quote exact words or phrases that demonstrated skill
- Explain why specific actions were effective
- Connect behaviors to sales best practices
- Acknowledge progress from previous sessions (if applicable)
- Build confidence through specific recognition

## 4. DEVELOPMENT OPPORTUNITIES
Present improvement areas constructively:
- Frame as growth opportunities, not deficiencies
- Provide specific examples from the conversation
- Offer alternative approaches or techniques
- Connect to learning objectives and goals
- Maintain encouraging and supportive tone

## 5. TECHNIQUE-SPECIFIC COACHING

### Discovery Questions Enhancement
- Specific improvements for question quality and technique
- Examples of better questions they could have asked
- Framework recommendations (SPIN, etc.)
- Practice exercises for question development

### Objection Handling Improvement  
- Better techniques for acknowledgment and response
- Alternative approaches to concerns raised
- Feel-Felt-Found or other structured methods
- Practice scenarios for objection skills

### Value Articulation Strengthening
- More specific and quantifiable value statements
- Better connection to prospect's situation
- Business impact focus improvements
- ROI and outcome emphasis techniques

### Active Listening Development
- Techniques for demonstrating listening
- Reflection and paraphrasing improvements
- Empathy expression methods
- Response quality enhancements

### Other Skills (as relevant to performance)
- Conversation control and flow management
- Empathy building and rapport techniques
- Business acumen demonstration
- Closing and next steps effectiveness

## 6. IMMEDIATE ACTION STEPS
Provide 3-5 specific, actionable next steps:
- One technique to practice before next session
- One framework to study and understand
- One real-world application opportunity
- One self-assessment or reflection activity
- One resource for continued learning

## 7. PRACTICE RECOMMENDATIONS
Suggest specific practice activities:
- Scenarios to repeat with different approaches
- Role-play situations for skill development
- Real-world application opportunities
- Self-recording and review exercises
- Peer practice suggestions

## 8. CONFIDENCE BUILDING CONCLUSION
End with confidence-building elements:
- Reinforce capability and potential
- Acknowledge learning journey progress  
- Express confidence in continued improvement
- Connect efforts to real-world success
- Inspire continued practice and development

**TONE AND STYLE REQUIREMENTS:**
- Encouraging and supportive throughout
- Specific and evidence-based
- Action-oriented and practical
- Professional yet warm and personable
- Growth-focused rather than deficit-focused

Return coaching feedback in JSON format:
```json
{
  "appreciative_opening": "Fantastic job stepping into that challenging conversation...",
  "socratic_questions": [
    "What felt most natural for you in that interaction?",
    "What surprised you about the prospect's responses?",
    "If you could replay one moment, what would you adjust?"
  ],
  "positive_reinforcement": [
    "Your active listening really stood out when you said...",
    "The way you built rapport by mentioning... was excellent",
    "Your question about... showed strong business thinking"
  ],
  "development_opportunities": [
    {
      "area": "Discovery Questions",
      "feedback": "Consider using more open-ended questions to uncover deeper needs",
      "example": "Instead of 'Do you have budget concerns?' try 'What factors will influence your investment decision?'",
      "practice_suggestion": "Practice converting closed questions to open-ended ones"
    }
  ],
  "immediate_action_steps": [
    "Practice the SPIN questioning sequence before your next real conversation",
    "Record yourself asking discovery questions and assess open vs. closed ratio",
    "Study one industry-specific business challenge relevant to your prospects"
  ],
  "practice_recommendations": [
    "Repeat this scenario focusing only on discovery questions",
    "Role-play with a colleague using more challenging objections",
    "Practice value articulation with specific ROI numbers"
  ],
  "confidence_building": "Your natural empathy and genuine curiosity are real strengths that will serve you well...",
  "overall_assessment": "developing_well",
  "next_session_focus": ["discovery_questions", "value_quantification"]
}
```
        """)
        
        return templates
    
    def _initialize_assessment_rubrics(self) -> Dict[str, Dict[str, Any]]:
        """Initialize assessment rubrics for consistent evaluation"""
        rubrics = {
            "conversation_analysis": {
                "discovery_questions": {
                    "5.0": {
                        "description": "Expert Level: Masterful use of strategic, open-ended questions that uncover deep insights",
                        "indicators": ["Strategic question sequencing", "Uncovers hidden needs", "Creates new awareness", "Drives thinking"]
                    },
                    "4.0": {
                        "description": "Proficient: Strong questioning skills with good technique and outcomes",
                        "indicators": ["Mostly open-ended questions", "Good information gathering", "Logical sequence", "Builds understanding"]
                    },
                    "3.0": {
                        "description": "Developing: Adequate questioning with room for improvement",
                        "indicators": ["Mix of open/closed questions", "Basic information gathering", "Some strategic questions", "Functional approach"]
                    },
                    "2.0": {
                        "description": "Novice: Basic questioning skills with frequent issues",
                        "indicators": ["Mostly closed questions", "Surface-level inquiry", "Weak follow-up", "Limited insight generation"]
                    },
                    "1.0": {
                        "description": "Beginner: Minimal questioning skills requiring development",
                        "indicators": ["Few questions asked", "Tells more than asks", "No discovery strategy", "Misses opportunities"]
                    }
                },
                "objection_handling": {
                    "5.0": {
                        "description": "Expert Level: Masterful objection handling with sophisticated techniques",
                        "indicators": ["Anticipates objections", "Reframes effectively", "Uses social proof", "Creates urgency"]
                    },
                    "4.0": {
                        "description": "Proficient: Strong objection handling with good technique",
                        "indicators": ["Acknowledges concerns", "Responds with value", "Addresses root issues", "Maintains rapport"]
                    },
                    "3.0": {
                        "description": "Developing: Adequate objection handling with improvement opportunities",
                        "indicators": ["Basic acknowledgment", "Some value response", "Decent technique", "Maintains composure"]
                    },
                    "2.0": {
                        "description": "Novice: Basic objection handling with common mistakes",
                        "indicators": ["Weak acknowledgment", "Defensive responses", "Generic answers", "Misses opportunities"]
                    },
                    "1.0": {
                        "description": "Beginner: Poor objection handling requiring significant development",
                        "indicators": ["No acknowledgment", "Argues with prospect", "Avoids objections", "Damages rapport"]
                    }
                }
            }
        }
        return rubrics
    
    def _get_assessment_guidelines(self, assessment_type: AssessmentType) -> Dict[str, Any]:
        """Get assessment guidelines for specific type"""
        guidelines = {
            AssessmentType.CONVERSATION_ANALYSIS: {
                "focus_areas": ["discovery_questions", "objection_handling", "value_articulation", "active_listening"],
                "evidence_requirement": "specific_quotes",
                "scoring_method": "rubric_based",
                "feedback_style": "developmental"
            },
            AssessmentType.SKILL_PROGRESSION: {
                "focus_areas": ["trend_analysis", "consistency_measurement", "skill_transfer"],
                "evidence_requirement": "quantitative_data",
                "scoring_method": "statistical_analysis",
                "feedback_style": "analytical"
            },
            AssessmentType.COACHING_FEEDBACK: {
                "focus_areas": ["socratic_questioning", "positive_reinforcement", "action_steps"],
                "evidence_requirement": "behavioral_examples",
                "scoring_method": "qualitative_assessment",
                "feedback_style": "supportive_developmental"
            }
        }
        return guidelines.get(assessment_type, {})
    
    def _get_default_assessment_system_prompt(self, assessment_type: AssessmentType) -> str:
        """Get default system prompt for assessment type"""
        return f"""
You are an expert sales training analyst specializing in {assessment_type.value.replace('_', ' ')}.
Provide thorough, evidence-based analysis that supports learner development.
Focus on specific, actionable insights that drive skill improvement.
        """
    
    def get_micro_assessment_prompt(self, situation: str, context: AssessmentContext) -> str:
        """Get micro-assessment prompt for specific situations"""
        
        micro_templates = {
            "question_quality": Template("""
Assess the quality of this question in context:

**Question:** "{{ context.user_input }}"
**Context:** {{ context.session_context.scenario_type }} conversation, turn {{ context.conversation_history | length }}

Rate 1-5: Quality, Technique, Strategic Value
Provide: Alternative questions that would be more effective
            """),
            
            "objection_response": Template("""
Evaluate this objection handling attempt:

**Objection Indicator:** Signs of concern or resistance in prospect response
**Response:** "{{ context.user_input }}"

Assess: Recognition, Acknowledgment, Response technique
Suggest: Improved approach using proven methodologies
            """),
            
            "value_statement": Template("""
Analyze this value articulation:

**Value Statement:** "{{ context.user_input }}"
**Prospect Context:** {{ context.session_context.prospect_persona }}

Evaluate: Specificity, Relevance, Business Impact
Recommend: More compelling value articulation approaches
            """)
        }
        
        template = micro_templates.get(situation)
        if template:
            return template.render(context=context)
        
        return f"Assess the effectiveness of this {situation} in the sales conversation context."
    
    def get_performance_benchmark_prompt(self, context: AssessmentContext) -> str:
        """Get performance benchmarking assessment prompt"""
        
        benchmark_template = Template("""
Compare this performance against sales competency benchmarks:

**Performance Data:**
- Overall Score: {{ context.performance_history.latest_score | default(3.0) }}/5.0
- Experience Level: {{ context.session_context.experience_level | default('developing') }}
- Practice Hours: {{ context.session_context.practice_hours | default('unknown') }}

**BENCHMARK ANALYSIS REQUIRED:**

1. **Peer Comparison:** Performance vs. similar experience levels
2. **Industry Standards:** Alignment with sales competency frameworks  
3. **Role Readiness:** Preparedness for target sales roles
4. **Skill Maturity:** Development stage for each competency area
5. **Advancement Timeline:** Realistic progression expectations

**Reference Standards:**
- Entry Level: 2.0-2.5 average performance
- Developing: 2.5-3.5 average performance  
- Proficient: 3.5-4.0 average performance
- Expert: 4.0-5.0 average performance

Provide detailed benchmark assessment with specific development recommendations.
        """)
        
        return benchmark_template.render(context=context)
    
    def get_learning_effectiveness_prompt(self, context: AssessmentContext) -> str:
        """Get learning effectiveness assessment prompt"""
        
        effectiveness_template = Template("""
Assess learning effectiveness and optimization opportunities:

**LEARNING DATA:**
- Sessions Completed: {{ context.performance_history.session_count | default(0) }}
- Time Investment: {{ context.performance_history.total_hours | default('unknown') }}
- Improvement Rate: {{ context.performance_history.improvement_rate | default('unknown') }}
- Retention Evidence: {{ context.performance_history.retention_indicators | default('unknown') }}

**EFFECTIVENESS ASSESSMENT:**

1. **Learning Velocity:** Rate of skill acquisition vs. benchmarks
2. **Retention Quality:** Evidence of sustained improvement
3. **Transfer Success:** Application to varied scenarios
4. **Engagement Level:** Participation and motivation indicators
5. **Method Optimization:** Most/least effective learning approaches

**OPTIMIZATION RECOMMENDATIONS:**
- Learning method adjustments
- Practice frequency optimization  
- Difficulty progression recommendations
- Motivation enhancement strategies
- Resource allocation suggestions

Provide comprehensive assessment with specific optimization strategies.
        """)
        
        return effectiveness_template.render(context=context)