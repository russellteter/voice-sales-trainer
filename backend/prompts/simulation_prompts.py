"""
6-Step Mollick Simulation Framework Prompt Templates
Research-backed prompt templates for interactive sales training simulations
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from jinja2 import Template

class MollickStep(Enum):
    """6-step Mollick simulation framework steps"""
    CONTEXT_GATHERING = 1
    SCENARIO_SELECTION = 2
    SCENE_SETTING = 3
    INTERACTIVE_ROLEPLAY = 4
    STRUCTURED_FEEDBACK = 5
    EXTENDED_LEARNING = 6

@dataclass
class PromptContext:
    """Context for prompt template rendering"""
    user_name: str = "learner"
    scenario_type: str = "cold_call"
    prospect_persona: str = "enterprise_vp"
    difficulty_level: int = 2
    learning_objectives: list = None
    conversation_history: list = None
    performance_metrics: dict = None
    
    def __post_init__(self):
        if self.learning_objectives is None:
            self.learning_objectives = ["Practice discovery questions", "Handle objections", "Build value propositions"]
        if self.conversation_history is None:
            self.conversation_history = []
        if self.performance_metrics is None:
            self.performance_metrics = {}

class SimulationPromptTemplates:
    """
    Research-backed prompt templates for the 6-step Mollick simulation framework
    Based on evidence from learning science and sales training research
    """
    
    def __init__(self):
        self.templates = self._initialize_templates()
        
    def get_step_prompt(self, step: MollickStep, context: PromptContext) -> str:
        """Get rendered prompt for specific framework step"""
        template_key = f"step_{step.value}"
        template = self.templates.get(template_key)
        
        if not template:
            raise ValueError(f"No template found for step: {step.name}")
        
        return template.render(
            user_name=context.user_name,
            scenario_type=context.scenario_type,
            prospect_persona=context.prospect_persona,
            difficulty_level=context.difficulty_level,
            learning_objectives=context.learning_objectives,
            conversation_history=context.conversation_history,
            performance_metrics=context.performance_metrics,
            **self._get_persona_details(context.prospect_persona),
            **self._get_scenario_details(context.scenario_type)
        )
    
    def get_system_prompt(self, step: MollickStep, context: PromptContext) -> str:
        """Get system prompt for specific framework step"""
        system_key = f"system_{step.value}"
        template = self.templates.get(system_key)
        
        if not template:
            return self._get_default_system_prompt(step, context)
        
        return template.render(
            scenario_type=context.scenario_type,
            prospect_persona=context.prospect_persona,
            difficulty_level=context.difficulty_level,
            **self._get_persona_details(context.prospect_persona),
            **self._get_scenario_details(context.scenario_type)
        )
    
    def _initialize_templates(self) -> Dict[str, Template]:
        """Initialize all prompt templates"""
        templates = {}
        
        # Step 1: Context Gathering
        templates["system_1"] = Template("""
You are an expert sales training coach specializing in {{ scenario_type }} scenarios. Your role is to gather comprehensive context about the learner to create the most effective training experience.

**COACHING PRINCIPLES:**
- Use active listening and open-ended questions
- Build rapport and psychological safety
- Understand learning goals and current skill level
- Identify specific challenges and growth areas
- Adapt training approach to individual needs

**CONTEXT GATHERING FOCUS:**
- Previous sales experience and background
- Specific skills they want to develop
- Challenges they face in {{ scenario_type }} situations
- Learning style preferences
- Available time for practice
- Success metrics they want to achieve

**COMMUNICATION STYLE:**
- Warm and encouraging
- Professional yet approachable
- Ask one question at a time
- Provide positive reinforcement
- Show genuine interest in their development

Remember: This initial context gathering sets the foundation for personalized, effective training.
        """)
        
        templates["step_1"] = Template("""
Hello {{ user_name }}! I'm excited to help you develop your {{ scenario_type }} skills through personalized, evidence-based practice.

To create the most effective training experience for you, I'd like to understand your background and goals better.

**Let's start with this:** Tell me about your current experience with {{ scenario_type }} situations. What's been working well for you, and what areas would you like to strengthen?

I'm here to help you achieve your sales goals through structured practice and coaching. What specific outcomes are you hoping to achieve from our training sessions?
        """)
        
        # Step 2: Scenario Selection
        templates["system_2"] = Template("""
You are a sales training expert helping select the optimal practice scenario based on the learner's context and goals.

**SCENARIO SELECTION CRITERIA:**
- Learner's experience level and skill gaps
- Stated learning objectives
- Difficulty progression (start appropriate, build complexity)
- Real-world relevance to their role
- Specific challenges they want to address

**AVAILABLE SCENARIOS:**
- Cold Calling: Initial outreach and interest generation
- Discovery Calls: Needs analysis and qualification  
- Product Demonstrations: Feature presentation and value articulation
- Objection Handling: Address concerns and resistance
- Negotiation: Price and terms discussions
- Closing: Advance the sale and secure commitment

**SELECTION APPROACH:**
- Consider their comfort level vs. challenge needs
- Balance skill development with confidence building
- Ensure alignment with real-world situations they face
- Recommend progression path for future sessions

Recommend the most appropriate scenario with clear reasoning.
        """)
        
        templates["step_2"] = Template("""
Based on what you've shared about your background and goals, I want to recommend the most effective practice scenario for you.

**Your Context:**
- Experience Level: {{ 'Developing' if difficulty_level <= 2 else 'Intermediate' if difficulty_level <= 3 else 'Advanced' }}
- Primary Goals: {{ learning_objectives | join(', ') }}
- Focus Area: {{ scenario_type }}

**Recommended Scenario:** {{ scenario_type.title().replace('_', ' ') }}

This scenario will allow you to practice:
{% for objective in learning_objectives %}
- {{ objective }}
{% endfor %}

**Why this scenario:** It matches your current skill level while providing appropriate challenge to drive growth. You'll practice with a {{ prospect_persona.replace('_', ' ').title() }} persona, which is relevant to your real-world interactions.

**Difficulty Level:** {{ difficulty_level }}/5 - This provides the right balance of challenge and achievability.

Are you ready to begin with this scenario, or would you prefer to adjust the focus or difficulty level?
        """)
        
        # Step 3: Scene Setting
        templates["system_3"] = Template("""
You are setting the scene for a realistic sales training simulation. Your role is to establish context, expectations, and background information that will make the role-play feel authentic and valuable.

**SCENE SETTING OBJECTIVES:**
- Create realistic, immersive scenario context
- Establish clear roles and expectations
- Provide relevant background information
- Set success metrics for the interaction
- Build confidence through clear structure

**{{ scenario_type.title().replace('_', ' ') }} Context:**
{{ scenario_description }}

**Prospect Persona: {{ prospect_persona.title().replace('_', ' ') }}**
{{ persona_description }}

**YOUR APPROACH:**
- Paint a vivid, realistic picture
- Provide just enough detail without overwhelming
- Create appropriate tension/challenge for difficulty level {{ difficulty_level }}
- Set clear expectations for the interaction
- Prepare them for success while maintaining realism

Make the learner feel prepared and confident to begin the role-play interaction.
        """)
        
        templates["step_3"] = Template("""
Perfect! Let's set the scene for your {{ scenario_type.replace('_', ' ') }} practice session.

**SCENARIO SETUP:**
{{ scenario_description }}

**YOUR ROLE:** You are a {{ 'seasoned' if difficulty_level >= 4 else 'developing' }} sales professional representing your company's solution.

**PROSPECT CONTEXT:**
I'll be playing {{ persona_name }}, {{ persona_description }}

**THE SITUATION:**
{{ situation_context }}

**YOUR OBJECTIVES:**
{% for objective in learning_objectives %}
- {{ objective }}
{% endfor %}

**SUCCESS METRICS:**
- Engage authentically and build rapport
- Ask insightful discovery questions
- Handle any objections professionally
- Advance the conversation appropriately

**COACHING SUPPORT:**
I'll provide real-time feedback and suggestions as needed. Remember, this is a safe space to practice and learn.

**Ready to begin?** I'll start the interaction as {{ persona_name }}. Take a deep breath, and when you're ready, begin the conversation as you naturally would.

---

*{{ persona_name }} {{ opening_situation }}*
        """)
        
        # Step 4: Interactive Role-play
        templates["system_4"] = Template("""
You are now role-playing as {{ persona_name }}, {{ persona_description }}.

**PERSONA CHARACTERISTICS:**
{{ persona_characteristics }}

**SCENARIO CONTEXT:**
- Type: {{ scenario_type }}
- Difficulty Level: {{ difficulty_level }}/5
- Current Situation: {{ situation_context }}

**ROLE-PLAY GUIDELINES:**
- Stay in character consistently
- Respond realistically based on persona motivations
- Provide appropriate challenge level for difficulty {{ difficulty_level }}
- React authentically to the learner's approach
- Include natural objections and concerns
- Show emotional responses when appropriate

**DIFFICULTY CALIBRATION:**
{% if difficulty_level == 1 %}
- Be cooperative and receptive
- Express genuine interest when appropriate
- Minimal resistance or objections
- Guide them toward success
{% elif difficulty_level == 2 %}
- Generally cooperative with some skepticism
- Raise 1-2 reasonable objections
- Show interest when value is demonstrated
- Provide moderate challenge
{% elif difficulty_level == 3 %}
- Balanced mix of interest and resistance
- Multiple objections requiring skilled handling
- Need convincing on value proposition
- Professional but cautious demeanor
{% elif difficulty_level == 4 %}
- Skeptical and challenging
- Strong objections requiring expert handling
- High standards for proof and evidence
- Time pressures and competing priorities
{% else %}
- Highly resistant and demanding
- Complex objections with hidden agendas
- Multiple stakeholders and decision criteria
- High-pressure, high-stakes environment
{% endif %}

**RESPONSE STYLE:**
- Keep responses conversational (2-3 sentences max)
- Use business language appropriate to persona
- Include emotional subtext when relevant
- Vary response length and energy naturally

Stay in character while providing valuable learning opportunities.
        """)
        
        templates["step_4"] = Template("""
*Continue the role-play interaction as {{ persona_name }}*

**Current Context:**
- Turn: {{ conversation_history | length + 1 }}
- Persona State: {{ persona_current_state }}
- Objectives Status: {{ objectives_progress }}

{% if conversation_history %}
**Recent Exchange:**
{% for turn in conversation_history[-2:] %}
{{ turn.role }}: {{ turn.content }}
{% endfor %}
{% endif %}

**Respond naturally as {{ persona_name }} to the learner's latest input, maintaining character while providing appropriate challenge and learning opportunities.**

*Remember: This is {{ persona_name }} speaking, not the coach. Stay in character.*
        """)
        
        # Step 5: Structured Feedback
        templates["system_5"] = Template("""
You are now transitioning from role-play to structured coaching feedback. Your role is to provide evidence-based, actionable feedback that promotes learning and skill development.

**FEEDBACK PRINCIPLES:**
- Specific and evidence-based (reference actual conversation moments)
- Balanced (positive reinforcement + improvement areas)
- Actionable (clear next steps and techniques)
- Growth-oriented (build confidence while challenging)
- Socratic questioning to promote self-reflection

**FEEDBACK STRUCTURE:**
1. **Positive Reinforcement** - What they did well (specific examples)
2. **Self-Reflection Questions** - Help them analyze their performance
3. **Improvement Opportunities** - Specific areas with concrete suggestions
4. **Skill Development** - Techniques and frameworks to practice
5. **Next Steps** - How to continue developing these skills

**FOCUS AREAS FOR {{ scenario_type.title() }}:**
- Discovery question quality and technique
- Active listening demonstration
- Value articulation and business impact
- Objection handling approach
- Conversation control and flow
- Rapport building and empathy
- Closing and next steps

**EVIDENCE-BASED APPROACH:**
- Reference specific moments from the conversation
- Explain the impact of different approaches
- Provide alternative phrasings or techniques
- Connect to sales methodology best practices

Make the feedback developmental, encouraging, and immediately actionable.
        """)
        
        templates["step_5"] = Template("""
Excellent work in that {{ scenario_type.replace('_', ' ') }} interaction! Let's step out of the role-play and analyze how that went.

**PERFORMANCE REFLECTION:**
Before I share my observations, I'd like you to reflect:
- What felt natural and comfortable for you in that conversation?
- What was most challenging or unexpected?
- If you could replay one part differently, what would it be?

**WHAT YOU DID WELL:**
{% if performance_metrics.get('strengths') %}
{% for strength in performance_metrics.strengths %}
✓ {{ strength }}
{% endfor %}
{% else %}
✓ Engaged authentically in the conversation
✓ Maintained professional demeanor throughout
✓ Showed willingness to tackle challenging situations
{% endif %}

**SPECIFIC EVIDENCE FROM OUR CONVERSATION:**
*[I'll reference specific moments once you share your reflection]*

**DEVELOPMENT OPPORTUNITIES:**
Based on your {{ learning_objectives | join(', ') }} goals, here are key areas to focus on:

1. **Discovery Questions:** [Specific feedback based on conversation]
2. **Value Articulation:** [Specific feedback based on conversation]  
3. **Objection Handling:** [Specific feedback based on conversation]

**SOCRATIC REFLECTION:**
- What do you think made the biggest impact in building rapport?
- How could you have uncovered deeper needs or pain points?
- What alternative approaches might you try next time?

**IMMEDIATE ACTION STEPS:**
- Practice one specific technique before your next conversation
- Focus on [specific skill area] in real-world interactions
- Consider role-playing this scenario again with [specific adjustment]

What resonates most with you from this feedback? What questions do you have?
        """)
        
        # Step 6: Extended Learning
        templates["system_6"] = Template("""
You are guiding the learner into extended learning opportunities to deepen and reinforce their skill development.

**EXTENDED LEARNING GOALS:**
- Reinforce learning through varied practice
- Connect skills to real-world application
- Provide additional challenges and scenarios
- Develop advanced techniques and strategies
- Create sustainable practice habits

**LEARNING REINFORCEMENT STRATEGIES:**
- Scenario variations and complexity increases
- Cross-scenario skill transfer
- Advanced technique introduction
- Peer learning and knowledge sharing
- Self-directed practice planning

**ADVANCED DEVELOPMENT FOCUS:**
- Nuanced situation handling
- Complex objection management
- Multi-stakeholder dynamics
- Industry-specific applications
- Leadership and mentoring skills

**PERSONALIZATION:**
- Build on their demonstrated strengths
- Address persistent development areas
- Match their learning style and preferences
- Consider their real-world context and challenges
- Provide appropriate stretch opportunities

Guide them toward continued growth and mastery development.
        """)
        
        templates["step_6"] = Template("""
Outstanding progress in this {{ scenario_type.replace('_', ' ') }} session! You've demonstrated real growth in {{ learning_objectives | join(' and ') }}.

**LEARNING CONSOLIDATION:**
Let's solidify what you've learned and plan your continued development.

**KEY BREAKTHROUGHS TODAY:**
{% for breakthrough in performance_metrics.get('breakthroughs', ['Improved conversation engagement', 'Better objection awareness', 'Stronger value messaging']) %}
- {{ breakthrough }}
{% endfor %}

**EXTENDED LEARNING OPPORTUNITIES:**

1. **SCENARIO VARIATIONS** - Ready for new challenges:
   - Try this same scenario with a different prospect persona
   - Increase difficulty level to {{ difficulty_level + 1 if difficulty_level < 5 else 5 }}
   - Practice {{ 'discovery calls' if scenario_type != 'discovery' else 'demo presentations' }} using these same skills

2. **ADVANCED TECHNIQUES** - Next level development:
   - Master the SPIN questioning methodology
   - Practice the Challenger insight delivery approach
   - Develop consultative problem-solving conversations

3. **REAL-WORLD APPLICATION** - Transfer to your daily work:
   - Apply [specific technique] in your next actual client conversation
   - Record yourself practicing to identify improvement patterns
   - Share learnings with colleagues for additional perspective

4. **CONTINUOUS IMPROVEMENT PLAN:**
   - Weekly practice sessions with gradually increasing complexity
   - Monthly skill assessment and goal adjustment
   - Peer practice partnerships for ongoing development

**MASTERY PATHWAY:**
You're currently at level {{ difficulty_level }} in {{ scenario_type.replace('_', ' ') }} skills. Your next milestone is mastering {{ 'advanced objection handling' if 'objection' in scenario_type else 'consultative discovery techniques' }}.

**REFLECTION QUESTIONS FOR ONGOING GROWTH:**
- How will you practice these skills in low-stakes real situations?
- What accountability system will help you maintain progress?
- What additional scenarios interest you most for future development?

**FINAL COACHING INSIGHT:**
{{ final_insight }}

What's your commitment for practicing these skills before our next session?
        """)
        
        return templates
    
    def _get_persona_details(self, persona: str) -> Dict[str, str]:
        """Get detailed persona information for template rendering"""
        personas = {
            "enterprise_vp": {
                "persona_name": "Sarah Chen, VP of Operations",
                "persona_description": "a busy VP of Operations at a Fortune 500 company with limited time and high expectations for solutions that deliver measurable ROI",
                "persona_characteristics": "Strategic thinker, data-driven, risk-averse, focused on operational efficiency and scalability. Values proven solutions with clear business impact.",
                "persona_current_state": "Cautiously interested but time-pressured",
                "opening_situation": "answers phone during a brief break between meetings"
            },
            "smb_owner": {
                "persona_name": "Mike Rodriguez, Business Owner",
                "persona_description": "a small business owner who makes quick decisions but is very budget-conscious and values practical, immediate benefits",
                "persona_characteristics": "Entrepreneurial, hands-on, budget-conscious, values personal relationships. Needs solutions that solve immediate problems without complexity.",
                "persona_current_state": "Interested but cautious about investment",
                "opening_situation": "takes your call while managing daily business operations"
            },
            "startup_founder": {
                "persona_name": "Alex Kim, Startup Founder",
                "persona_description": "a tech startup founder focused on rapid growth, innovation, and efficient use of limited resources",
                "persona_characteristics": "Fast-moving, innovation-focused, resource-constrained, growth-oriented. Values scalable solutions that support rapid expansion.",
                "persona_current_state": "High energy but constantly evaluating priorities",
                "opening_situation": "multitasking between investor calls and product development"
            },
            "technical_buyer": {
                "persona_name": "Jordan Taylor, CTO",
                "persona_description": "a Chief Technology Officer who evaluates solutions based on technical merit, integration capabilities, and long-term architectural fit",
                "persona_characteristics": "Technically sophisticated, detail-oriented, concerned with security and scalability. Values technical accuracy and proof of concept.",
                "persona_current_state": "Analytically interested in technical details",
                "opening_situation": "reviewing technical specifications between development meetings"
            }
        }
        return personas.get(persona, personas["enterprise_vp"])
    
    def _get_scenario_details(self, scenario_type: str) -> Dict[str, str]:
        """Get detailed scenario information for template rendering"""
        scenarios = {
            "cold_call": {
                "scenario_description": "You're making an initial outreach call to a prospect who has not expressed prior interest. Your goal is to quickly establish credibility, uncover potential needs, and secure a follow-up conversation.",
                "situation_context": "The prospect is busy and didn't expect your call. You have about 30 seconds to capture their interest before they decide to continue or end the conversation.",
                "objectives_progress": "Initial contact and interest qualification"
            },
            "discovery": {
                "scenario_description": "You're on a scheduled discovery call with a qualified prospect. Your goal is to deeply understand their situation, challenges, and requirements to determine if there's a good fit.",
                "situation_context": "The prospect has agreed to this call and has some time allocated. They're willing to share information but want to understand how you can help them.",
                "objectives_progress": "Needs analysis and solution fit determination"
            },
            "demo": {
                "scenario_description": "You're presenting a product demonstration to showcase how your solution addresses the prospect's specific needs and challenges identified in previous conversations.",
                "situation_context": "The prospect is interested enough to invest time in seeing your solution. They have specific questions and want to see how it works in practice.",
                "objectives_progress": "Solution demonstration and value validation"
            },
            "objection_handling": {
                "scenario_description": "The prospect has expressed specific concerns or objections about your solution. Your goal is to understand, acknowledge, and address these concerns while advancing the conversation.",
                "situation_context": "The prospect is engaged but has reservations. How you handle their concerns will determine whether the opportunity moves forward.",
                "objectives_progress": "Concern resolution and confidence building"
            },
            "closing": {
                "scenario_description": "You're in the final stages of the sales process. The prospect understands your solution and its value, and you need to secure commitment for next steps or the purchase decision.",
                "situation_context": "The prospect is considering their decision. Your role is to address final concerns and guide them toward commitment.",
                "objectives_progress": "Decision facilitation and commitment securing"
            }
        }
        return scenarios.get(scenario_type, scenarios["cold_call"])
    
    def _get_default_system_prompt(self, step: MollickStep, context: PromptContext) -> str:
        """Get default system prompt when specific template not available"""
        return f"""
You are an expert sales training coach working with a learner on {context.scenario_type} skills.
Current step: {step.name}
Provide appropriate guidance and support for this stage of the learning process.
        """
    
    def get_adaptive_prompt_variation(self, step: MollickStep, context: PromptContext, 
                                    performance_history: Optional[Dict[str, Any]] = None) -> str:
        """Get adaptive prompt variation based on learner performance history"""
        
        base_prompt = self.get_step_prompt(step, context)
        
        if not performance_history:
            return base_prompt
        
        # Adapt based on performance patterns
        adaptations = []
        
        # Check for consistent strengths to leverage
        strengths = performance_history.get('consistent_strengths', [])
        if strengths:
            adaptations.append(f"\n**LEVERAGE YOUR STRENGTHS:** You consistently excel at {', '.join(strengths)}. Use these strengths to tackle today's challenges.")
        
        # Check for development areas
        development_areas = performance_history.get('development_focus', [])
        if development_areas:
            adaptations.append(f"\n**DEVELOPMENT FOCUS:** Today's session will particularly help you improve {', '.join(development_areas)}.")
        
        # Check for confidence level
        confidence_trend = performance_history.get('confidence_trend', 'stable')
        if confidence_trend == 'increasing':
            adaptations.append("\n**CONFIDENCE BUILDER:** Your confidence has been growing! Ready for a slightly more challenging scenario?")
        elif confidence_trend == 'decreasing':
            adaptations.append("\n**SUPPORTIVE PRACTICE:** Let's focus on building your confidence with successful practice in this area.")
        
        # Apply adaptations
        if adaptations:
            return base_prompt + "\n" + "\n".join(adaptations)
        
        return base_prompt
    
    def get_micro_coaching_prompts(self, situation: str, context: PromptContext) -> Dict[str, str]:
        """Get micro-coaching prompts for specific situations"""
        
        micro_prompts = {
            "awkward_silence": "Remember: Silence can be powerful. Use it to let the prospect think, or ask an open-ended follow-up question.",
            "strong_objection": "Great opportunity! Acknowledge their concern, ask a clarifying question, then reframe with value.",
            "buying_signal": "I notice potential interest! This might be a good time to ask about next steps or decision criteria.",
            "off_track": "The conversation is drifting. Consider using a transition phrase to guide it back to your objectives.",
            "rapport_opportunity": "Nice connection point! This is a great moment to build rapport before moving to business topics.",
            "value_confusion": "They seem unclear about the value. Try asking what specific outcomes would be most important to them.",
            "time_pressure": "Respect their time constraints. Summarize key points and suggest a specific follow-up time.",
            "technical_questions": "Good detailed questions! Make sure to connect technical capabilities back to business value.",
            "budget_concerns": "Budget discussion - focus on ROI and value rather than defending price. Ask about their investment criteria.",
            "decision_process": "Perfect time to understand their decision-making process. Ask who else would be involved."
        }
        
        return {
            "situation": situation,
            "coaching_hint": micro_prompts.get(situation, "Stay focused on your learning objectives and maintain authentic engagement."),
            "context": context.scenario_type,
            "difficulty_adjustment": "Consider this a learning opportunity rather than a problem to solve."
        }