"""
Knowledge Management Service
Manages company-specific knowledge base, sales methodologies, and contextual information retrieval
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio

from config.settings import settings

# Configure logging
logger = logging.getLogger(__name__)

class SalesMethodology(Enum):
    """Supported sales methodologies"""
    SPIN = "spin"  # Situation, Problem, Implication, Need-payoff
    CHALLENGER = "challenger"  # Challenge customer thinking
    MEDDIC = "meddic"  # Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion
    SANDLER = "sandler"  # Pain, Budget, Decision
    CONSULTATIVE = "consultative"  # Solution-focused approach
    VALUE_SELLING = "value_selling"  # Value-based conversations

class IndustryType(Enum):
    """Industry types for specialized knowledge"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCIAL_SERVICES = "financial_services"
    MANUFACTURING = "manufacturing"
    RETAIL = "retail"
    EDUCATION = "education"
    REAL_ESTATE = "real_estate"
    PROFESSIONAL_SERVICES = "professional_services"

@dataclass
class KnowledgeEntry:
    """Individual knowledge base entry"""
    entry_id: str
    title: str
    content: str
    category: str
    tags: List[str]
    methodology: Optional[SalesMethodology]
    industry: Optional[IndustryType]
    confidence_score: float
    usage_count: int
    last_updated: datetime
    created_by: str
    metadata: Dict[str, Any]

@dataclass
class ContextualKnowledge:
    """Knowledge retrieved with context"""
    relevant_entries: List[KnowledgeEntry]
    methodology_guidance: Dict[str, str]
    industry_insights: Dict[str, str]
    objection_responses: List[Dict[str, str]]
    value_propositions: List[str]
    conversation_starters: List[str]
    closing_techniques: List[str]

@dataclass
class CompanyProfile:
    """Company/product profile for knowledge context"""
    company_name: str
    industry: IndustryType
    product_categories: List[str]
    target_customers: List[str]
    value_propositions: List[str]
    competitive_advantages: List[str]
    common_objections: Dict[str, List[str]]
    success_stories: List[Dict[str, Any]]
    pricing_framework: Dict[str, Any]
    sales_process_steps: List[str]

class KnowledgeService:
    """
    Comprehensive knowledge management service for sales training
    Provides contextual information retrieval, methodology guidance, and company-specific knowledge
    """
    
    def __init__(self):
        self.knowledge_base: Dict[str, KnowledgeEntry] = {}
        self.company_profiles: Dict[str, CompanyProfile] = {}
        self.methodology_frameworks: Dict[SalesMethodology, Dict[str, Any]] = {}
        self.industry_contexts: Dict[IndustryType, Dict[str, Any]] = {}
        
        # Initialize default knowledge
        asyncio.create_task(self._initialize_default_knowledge())
        
        logger.info("Knowledge Service initialized")

    async def _initialize_default_knowledge(self):
        """Initialize default knowledge base with sales best practices"""
        
        # Initialize sales methodologies
        await self._initialize_sales_methodologies()
        
        # Initialize industry contexts
        await self._initialize_industry_contexts()
        
        # Initialize default knowledge entries
        await self._initialize_default_entries()
        
        # Initialize sample company profile
        await self._initialize_sample_company_profile()

    async def add_knowledge_entry(self, title: str, content: str, category: str,
                                 tags: List[str], methodology: Optional[SalesMethodology] = None,
                                 industry: Optional[IndustryType] = None,
                                 created_by: str = "system") -> str:
        """Add a new knowledge base entry"""
        
        entry_id = f"kb_{len(self.knowledge_base)}_{int(datetime.utcnow().timestamp())}"
        
        entry = KnowledgeEntry(
            entry_id=entry_id,
            title=title,
            content=content,
            category=category,
            tags=tags,
            methodology=methodology,
            industry=industry,
            confidence_score=1.0,
            usage_count=0,
            last_updated=datetime.utcnow(),
            created_by=created_by,
            metadata={}
        )
        
        self.knowledge_base[entry_id] = entry
        logger.info(f"Added knowledge entry: {title} (ID: {entry_id})")
        
        return entry_id

    async def query_contextual_knowledge(self, query: str, context: Dict[str, Any]) -> ContextualKnowledge:
        """
        Query knowledge base with contextual information
        Returns relevant knowledge based on query and context
        """
        
        try:
            # Extract context parameters
            scenario_type = context.get("scenario_type", "general")
            prospect_persona = context.get("prospect_persona", "enterprise_vp")
            industry = context.get("industry")
            methodology = context.get("methodology")
            difficulty_level = context.get("difficulty_level", 2)
            
            # Find relevant knowledge entries
            relevant_entries = await self._find_relevant_entries(
                query, scenario_type, industry, methodology
            )
            
            # Get methodology-specific guidance
            methodology_guidance = await self._get_methodology_guidance(
                methodology, scenario_type, query
            )
            
            # Get industry-specific insights
            industry_insights = await self._get_industry_insights(
                industry, prospect_persona, scenario_type
            )
            
            # Get objection responses
            objection_responses = await self._get_objection_responses(
                query, industry, methodology
            )
            
            # Get value propositions
            value_propositions = await self._get_relevant_value_propositions(
                industry, prospect_persona
            )
            
            # Get conversation starters
            conversation_starters = await self._get_conversation_starters(
                scenario_type, prospect_persona, industry
            )
            
            # Get closing techniques
            closing_techniques = await self._get_closing_techniques(
                methodology, difficulty_level
            )
            
            contextual_knowledge = ContextualKnowledge(
                relevant_entries=relevant_entries,
                methodology_guidance=methodology_guidance,
                industry_insights=industry_insights,
                objection_responses=objection_responses,
                value_propositions=value_propositions,
                conversation_starters=conversation_starters,
                closing_techniques=closing_techniques
            )
            
            # Update usage counts
            for entry in relevant_entries:
                entry.usage_count += 1
            
            logger.info(f"Contextual knowledge query completed: {len(relevant_entries)} entries found")
            
            return contextual_knowledge
            
        except Exception as e:
            logger.error(f"Error querying contextual knowledge: {e}")
            return self._create_default_contextual_knowledge()

    async def get_objection_handling_guide(self, objection_type: str, 
                                         methodology: Optional[SalesMethodology] = None,
                                         industry: Optional[IndustryType] = None) -> Dict[str, Any]:
        """Get specific objection handling guidance"""
        
        # Build objection handling response
        response = {
            "objection_type": objection_type,
            "methodology_approach": {},
            "industry_specific_tips": {},
            "response_templates": [],
            "follow_up_questions": [],
            "success_stories": []
        }
        
        # Get methodology-specific approach
        if methodology and methodology in self.methodology_frameworks:
            framework = self.methodology_frameworks[methodology]
            response["methodology_approach"] = framework.get("objection_handling", {})
        
        # Get industry-specific insights
        if industry and industry in self.industry_contexts:
            context = self.industry_contexts[industry]
            response["industry_specific_tips"] = context.get("objection_insights", {})
        
        # Get response templates based on objection type
        response["response_templates"] = await self._get_objection_response_templates(objection_type)
        
        # Get follow-up questions
        response["follow_up_questions"] = await self._get_objection_follow_up_questions(objection_type)
        
        return response

    async def get_value_proposition_builder(self, prospect_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build value propositions based on prospect context"""
        
        industry = prospect_context.get("industry")
        company_size = prospect_context.get("company_size", "medium")
        pain_points = prospect_context.get("pain_points", [])
        business_objectives = prospect_context.get("business_objectives", [])
        
        value_props = {
            "primary_value_propositions": [],
            "supporting_evidence": [],
            "quantified_benefits": [],
            "risk_mitigation": [],
            "competitive_differentiators": []
        }
        
        # Build industry-specific value propositions
        if industry:
            industry_props = await self._get_industry_value_propositions(industry)
            value_props["primary_value_propositions"].extend(industry_props)
        
        # Build pain-point-specific propositions
        for pain_point in pain_points:
            pain_props = await self._get_pain_point_value_propositions(pain_point)
            value_props["primary_value_propositions"].extend(pain_props)
        
        # Add supporting evidence
        value_props["supporting_evidence"] = await self._get_supporting_evidence(
            industry, company_size
        )
        
        # Add quantified benefits
        value_props["quantified_benefits"] = await self._get_quantified_benefits(
            industry, business_objectives
        )
        
        return value_props

    async def get_conversation_framework(self, scenario_type: str, 
                                       methodology: SalesMethodology) -> Dict[str, Any]:
        """Get conversation framework for specific scenario and methodology"""
        
        framework = {
            "scenario_type": scenario_type,
            "methodology": methodology.value,
            "conversation_structure": [],
            "key_questions": [],
            "transition_phrases": [],
            "success_metrics": []
        }
        
        if methodology in self.methodology_frameworks:
            method_framework = self.methodology_frameworks[methodology]
            
            # Get scenario-specific structure
            structure_key = f"{scenario_type}_structure"
            framework["conversation_structure"] = method_framework.get(
                structure_key, method_framework.get("default_structure", [])
            )
            
            # Get key questions
            questions_key = f"{scenario_type}_questions"
            framework["key_questions"] = method_framework.get(
                questions_key, method_framework.get("discovery_questions", [])
            )
            
            # Get transition phrases
            framework["transition_phrases"] = method_framework.get("transitions", [])
            
            # Get success metrics
            framework["success_metrics"] = method_framework.get("success_metrics", [])
        
        return framework

    async def add_company_profile(self, profile: CompanyProfile) -> str:
        """Add or update company profile"""
        profile_id = profile.company_name.lower().replace(" ", "_")
        self.company_profiles[profile_id] = profile
        
        logger.info(f"Added/updated company profile: {profile.company_name}")
        return profile_id

    async def get_company_knowledge(self, company_id: str) -> Optional[CompanyProfile]:
        """Get company-specific knowledge"""
        return self.company_profiles.get(company_id)

    # Private helper methods

    async def _find_relevant_entries(self, query: str, scenario_type: str,
                                   industry: Optional[IndustryType],
                                   methodology: Optional[SalesMethodology]) -> List[KnowledgeEntry]:
        """Find relevant knowledge entries based on query and context"""
        
        relevant_entries = []
        query_lower = query.lower()
        
        for entry in self.knowledge_base.values():
            relevance_score = 0.0
            
            # Check title and content relevance
            if query_lower in entry.title.lower():
                relevance_score += 2.0
            if query_lower in entry.content.lower():
                relevance_score += 1.0
            
            # Check tag relevance
            for tag in entry.tags:
                if query_lower in tag.lower() or tag.lower() in query_lower:
                    relevance_score += 1.5
            
            # Check category relevance
            if scenario_type in entry.category.lower():
                relevance_score += 1.0
            
            # Check methodology match
            if methodology and entry.methodology == methodology:
                relevance_score += 2.0
            
            # Check industry match
            if industry and entry.industry == industry:
                relevance_score += 2.0
            
            # Include entries with sufficient relevance
            if relevance_score >= 1.0:
                relevant_entries.append((entry, relevance_score))
        
        # Sort by relevance score and return top entries
        relevant_entries.sort(key=lambda x: x[1], reverse=True)
        return [entry for entry, score in relevant_entries[:10]]

    async def _get_methodology_guidance(self, methodology: Optional[SalesMethodology],
                                      scenario_type: str, query: str) -> Dict[str, str]:
        """Get methodology-specific guidance"""
        
        if not methodology or methodology not in self.methodology_frameworks:
            return {}
        
        framework = self.methodology_frameworks[methodology]
        guidance = {}
        
        # Get general guidance
        guidance["approach"] = framework.get("general_approach", "")
        
        # Get scenario-specific guidance
        scenario_key = f"{scenario_type}_guidance"
        guidance["scenario_specific"] = framework.get(scenario_key, "")
        
        # Get questioning strategy
        guidance["questioning_strategy"] = framework.get("questioning_strategy", "")
        
        return guidance

    async def _get_industry_insights(self, industry: Optional[IndustryType],
                                   prospect_persona: str, scenario_type: str) -> Dict[str, str]:
        """Get industry-specific insights"""
        
        if not industry or industry not in self.industry_contexts:
            return {}
        
        context = self.industry_contexts[industry]
        insights = {}
        
        # Get general industry insights
        insights["overview"] = context.get("overview", "")
        
        # Get persona-specific insights
        persona_key = f"{prospect_persona}_insights"
        insights["persona_specific"] = context.get(persona_key, "")
        
        # Get common challenges
        insights["common_challenges"] = context.get("common_challenges", "")
        
        # Get business drivers
        insights["business_drivers"] = context.get("business_drivers", "")
        
        return insights

    async def _get_objection_responses(self, query: str, industry: Optional[IndustryType],
                                     methodology: Optional[SalesMethodology]) -> List[Dict[str, str]]:
        """Get objection response templates"""
        
        common_objections = [
            {
                "objection": "Price is too high",
                "response": "I understand cost is a consideration. Let's explore the value and ROI this solution provides...",
                "follow_up": "What specific budget constraints are you working within?"
            },
            {
                "objection": "We're happy with our current solution",
                "response": "That's great to hear you have something working. What would need to change for you to consider an alternative?",
                "follow_up": "What challenges, if any, do you face with your current approach?"
            },
            {
                "objection": "We don't have time to implement something new",
                "response": "Time is valuable, and I appreciate your honesty. What if we could minimize the implementation time while maximizing the impact?",
                "follow_up": "What would make this worth the time investment for you?"
            },
            {
                "objection": "I need to think about it",
                "response": "Absolutely, this is an important decision. What specific aspects would you like to think through?",
                "follow_up": "What information would help you make a confident decision?"
            }
        ]
        
        # Filter based on query content
        relevant_objections = []
        for objection in common_objections:
            if any(word in query.lower() for word in objection["objection"].lower().split()):
                relevant_objections.append(objection)
        
        return relevant_objections if relevant_objections else common_objections[:2]

    async def _get_relevant_value_propositions(self, industry: Optional[IndustryType],
                                             prospect_persona: str) -> List[str]:
        """Get relevant value propositions"""
        
        value_props = [
            "Increase operational efficiency by up to 30%",
            "Reduce costs while improving quality",
            "Accelerate time to market for new initiatives",
            "Enhance customer satisfaction and retention",
            "Provide better visibility and control over processes"
        ]
        
        # Customize based on industry
        if industry == IndustryType.TECHNOLOGY:
            value_props.extend([
                "Scale your development processes",
                "Improve system reliability and uptime",
                "Accelerate digital transformation"
            ])
        elif industry == IndustryType.HEALTHCARE:
            value_props.extend([
                "Improve patient outcomes",
                "Ensure regulatory compliance",
                "Reduce administrative burden"
            ])
        elif industry == IndustryType.FINANCIAL_SERVICES:
            value_props.extend([
                "Enhance risk management",
                "Improve regulatory reporting",
                "Increase customer acquisition"
            ])
        
        return value_props[:5]  # Return top 5

    async def _get_conversation_starters(self, scenario_type: str, prospect_persona: str,
                                       industry: Optional[IndustryType]) -> List[str]:
        """Get relevant conversation starters"""
        
        starters = []
        
        if scenario_type == "cold_call":
            starters = [
                f"Hi {prospect_persona}, I know you're busy, so I'll be brief. I'm calling because...",
                f"Good morning! I was researching {industry.value if industry else 'your industry'} and noticed...",
                f"Hi there! I help {prospect_persona}s like yourself with...",
                "Quick question - are you currently facing challenges with..."
            ]
        elif scenario_type == "demo":
            starters = [
                "Thank you for taking the time to see this demo. Based on our previous conversation...",
                "I'm excited to show you how this addresses the specific challenges you mentioned...",
                "Let me start by showing you the feature that directly impacts...",
                "Before we dive in, what would make this demo most valuable for you?"
            ]
        elif scenario_type == "objection_handling":
            starters = [
                "I appreciate you being direct about your concerns...",
                "That's a valid point, and I'm glad you brought it up...",
                "I understand where you're coming from. Let me address that...",
                "Many of our clients had similar concerns initially..."
            ]
        
        return starters

    async def _get_closing_techniques(self, methodology: Optional[SalesMethodology],
                                    difficulty_level: int) -> List[str]:
        """Get closing techniques appropriate for methodology and difficulty"""
        
        techniques = [
            "What questions do you have that would help you move forward?",
            "What would need to happen for this to make sense for your organization?",
            "Based on what we've discussed, what are your thoughts on next steps?",
            "How does this align with your priorities for this quarter?",
            "What other stakeholders should we include in this conversation?"
        ]
        
        if methodology == SalesMethodology.CHALLENGER:
            techniques.extend([
                "Given the risks of maintaining the status quo, how do you see us moving forward?",
                "What's the cost of not addressing this challenge?",
                "How will you measure success with this initiative?"
            ])
        elif methodology == SalesMethodology.CONSULTATIVE:
            techniques.extend([
                "How do you envision this fitting into your overall strategy?",
                "What outcomes would make this a success for you?",
                "What concerns do you have that we should address?"
            ])
        
        # Adjust for difficulty level
        if difficulty_level >= 4:
            techniques.extend([
                "What's your decision-making process for investments like this?",
                "Who else would be involved in evaluating this solution?",
                "What's your timeline for implementation?"
            ])
        
        return techniques[:5]

    async def _initialize_sales_methodologies(self):
        """Initialize sales methodology frameworks"""
        
        self.methodology_frameworks[SalesMethodology.SPIN] = {
            "general_approach": "Focus on understanding the situation, identifying problems, exploring implications, and determining need-payoff",
            "discovery_questions": [
                "Can you tell me about your current situation?",
                "What challenges are you facing?",
                "What would happen if this problem isn't addressed?",
                "How would solving this impact your business?"
            ],
            "questioning_strategy": "Use open-ended questions to uncover pain points and build value",
            "objection_handling": {
                "approach": "Use implication questions to help prospects understand the cost of inaction"
            },
            "success_metrics": ["Quality of discovery questions", "Pain identification", "Value articulation"]
        }
        
        self.methodology_frameworks[SalesMethodology.CHALLENGER] = {
            "general_approach": "Challenge customer thinking with insights, tailor the message, and take control of the conversation",
            "discovery_questions": [
                "What assumptions are you making about this challenge?",
                "How do industry leaders approach this differently?",
                "What risks are you not considering?",
                "What if there was a better way to think about this?"
            ],
            "questioning_strategy": "Provide insights that challenge conventional thinking",
            "objection_handling": {
                "approach": "Reframe objections by providing new perspectives and insights"
            },
            "success_metrics": ["Insight delivery", "Perspective shift", "Control maintenance"]
        }
        
        self.methodology_frameworks[SalesMethodology.MEDDIC] = {
            "general_approach": "Qualify opportunities using Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion",
            "discovery_questions": [
                "How do you measure success in this area?",
                "Who makes the final decision on initiatives like this?",
                "What criteria will you use to evaluate solutions?",
                "What's your process for making this type of decision?",
                "What pain points are driving this initiative?",
                "Who internally is advocating for change?"
            ],
            "questioning_strategy": "Systematically qualify each MEDDIC element",
            "success_metrics": ["MEDDIC qualification score", "Stakeholder mapping", "Process understanding"]
        }

    async def _initialize_industry_contexts(self):
        """Initialize industry-specific contexts"""
        
        self.industry_contexts[IndustryType.TECHNOLOGY] = {
            "overview": "Fast-paced industry focused on innovation, scalability, and competitive advantage",
            "common_challenges": "Technical debt, scaling challenges, security concerns, integration complexity",
            "business_drivers": "Growth, efficiency, innovation, competitive differentiation",
            "enterprise_vp_insights": "Focused on strategic initiatives, scalability, and ROI",
            "startup_founder_insights": "Resource-constrained, growth-focused, agile decision-making"
        }
        
        self.industry_contexts[IndustryType.HEALTHCARE] = {
            "overview": "Highly regulated industry focused on patient outcomes and operational efficiency",
            "common_challenges": "Regulatory compliance, cost management, patient satisfaction, technology adoption",
            "business_drivers": "Patient outcomes, cost reduction, regulatory compliance, operational efficiency",
            "enterprise_vp_insights": "Risk-averse, compliance-focused, long sales cycles",
            "startup_founder_insights": "Innovation-driven, outcome-focused, regulatory awareness"
        }
        
        self.industry_contexts[IndustryType.FINANCIAL_SERVICES] = {
            "overview": "Highly regulated industry focused on risk management and customer trust",
            "common_challenges": "Regulatory compliance, cybersecurity, digital transformation, customer experience",
            "business_drivers": "Risk mitigation, regulatory compliance, customer acquisition, operational efficiency",
            "enterprise_vp_insights": "Risk management, regulatory compliance, long-term relationships",
            "startup_founder_insights": "Agility, innovation, regulatory navigation"
        }

    async def _initialize_default_entries(self):
        """Initialize default knowledge base entries"""
        
        # Discovery questions
        await self.add_knowledge_entry(
            title="Open-Ended Discovery Questions",
            content="Use questions that start with What, How, Why to uncover deeper insights. Examples: 'What challenges are you currently facing?' 'How are you handling this today?' 'Why is this important now?'",
            category="discovery",
            tags=["questions", "discovery", "conversation"],
            methodology=SalesMethodology.SPIN
        )
        
        # Objection handling
        await self.add_knowledge_entry(
            title="Feel, Felt, Found Technique",
            content="'I understand how you feel, many of our clients felt the same way, and here's what they found...' This technique acknowledges the objection, normalizes it, and provides evidence.",
            category="objection_handling",
            tags=["objections", "technique", "persuasion"]
        )
        
        # Value propositions
        await self.add_knowledge_entry(
            title="Quantified Value Propositions",
            content="Always include specific metrics when possible. Instead of 'save time,' use 'reduce processing time by 40%.' Instead of 'improve efficiency,' use 'increase productivity by 25%.'",
            category="value_proposition",
            tags=["value", "metrics", "roi"]
        )
        
        # Closing techniques
        await self.add_knowledge_entry(
            title="Assumptive Close Techniques",
            content="Guide the conversation toward next steps by assuming agreement. Examples: 'When would you like to get started?' 'What would your implementation timeline look like?' 'Who else should we include in the next meeting?'",
            category="closing",
            tags=["closing", "techniques", "next_steps"]
        )

    async def _initialize_sample_company_profile(self):
        """Initialize a sample company profile"""
        
        sample_profile = CompanyProfile(
            company_name="TechSolutions Pro",
            industry=IndustryType.TECHNOLOGY,
            product_categories=["Software Development Tools", "Project Management", "Analytics"],
            target_customers=["Enterprise IT Teams", "Software Development Companies", "Digital Agencies"],
            value_propositions=[
                "Reduce development time by 40%",
                "Improve code quality and reliability",
                "Enhance team collaboration",
                "Accelerate time to market"
            ],
            competitive_advantages=[
                "AI-powered code analysis",
                "Seamless integrations",
                "Enterprise-grade security",
                "24/7 expert support"
            ],
            common_objections={
                "price": ["Too expensive", "Budget constraints", "ROI unclear"],
                "implementation": ["Too complex", "No time", "Resource constraints"],
                "adoption": ["Team resistance", "Learning curve", "Change management"]
            },
            success_stories=[
                {
                    "customer": "Fortune 500 Technology Company",
                    "challenge": "Long development cycles",
                    "solution": "Implemented automated testing and deployment",
                    "results": "40% faster releases, 60% fewer bugs"
                }
            ],
            pricing_framework={
                "tiers": ["Starter", "Professional", "Enterprise"],
                "pricing_model": "Per user per month",
                "contract_terms": ["Monthly", "Annual", "Multi-year"]
            },
            sales_process_steps=[
                "Initial discovery call",
                "Technical demonstration",
                "Pilot program",
                "Stakeholder presentation",
                "Contract negotiation",
                "Implementation planning"
            ]
        )
        
        await self.add_company_profile(sample_profile)

    async def _get_objection_response_templates(self, objection_type: str) -> List[str]:
        """Get response templates for specific objection types"""
        
        templates = {
            "price": [
                "I understand cost is a consideration. Let's look at the ROI and long-term value...",
                "Many clients initially had budget concerns. What they found was...",
                "What's the cost of not solving this problem?"
            ],
            "timing": [
                "Timing is important. What would need to change for this to be a priority?",
                "I appreciate you being upfront about timing. What's driving the current priorities?",
                "What would make this worth accelerating?"
            ],
            "authority": [
                "I understand you'll need buy-in from others. Who else should we include?",
                "What information would help you present this internally?",
                "What concerns might they have that we should address?"
            ]
        }
        
        return templates.get(objection_type, templates["price"])

    async def _get_objection_follow_up_questions(self, objection_type: str) -> List[str]:
        """Get follow-up questions for objection handling"""
        
        questions = {
            "price": [
                "What budget range were you considering?",
                "How do you typically evaluate ROI on initiatives like this?",
                "What would need to be included to justify the investment?"
            ],
            "timing": [
                "What would change your timeline?",
                "What are your top priorities right now?",
                "When do you think this challenge will become urgent?"
            ],
            "authority": [
                "Who else would be involved in this decision?",
                "What's the decision-making process?",
                "What criteria will they use to evaluate this?"
            ]
        }
        
        return questions.get(objection_type, questions["price"])

    async def _get_industry_value_propositions(self, industry: IndustryType) -> List[str]:
        """Get industry-specific value propositions"""
        
        props = {
            IndustryType.TECHNOLOGY: [
                "Accelerate development cycles",
                "Improve system reliability",
                "Scale efficiently",
                "Enhance security posture"
            ],
            IndustryType.HEALTHCARE: [
                "Improve patient outcomes",
                "Reduce administrative burden",
                "Ensure compliance",
                "Optimize resource utilization"
            ],
            IndustryType.FINANCIAL_SERVICES: [
                "Reduce operational risk",
                "Enhance regulatory compliance",
                "Improve customer experience",
                "Increase operational efficiency"
            ]
        }
        
        return props.get(industry, [])

    async def _get_pain_point_value_propositions(self, pain_point: str) -> List[str]:
        """Get value propositions for specific pain points"""
        
        pain_point_lower = pain_point.lower()
        
        if "cost" in pain_point_lower or "budget" in pain_point_lower:
            return ["Reduce operational costs", "Optimize resource utilization", "Improve cost predictability"]
        elif "time" in pain_point_lower or "efficiency" in pain_point_lower:
            return ["Save time on routine tasks", "Accelerate processes", "Improve productivity"]
        elif "quality" in pain_point_lower:
            return ["Improve output quality", "Reduce errors", "Enhance consistency"]
        else:
            return ["Solve your specific challenges", "Improve overall performance"]

    async def _get_supporting_evidence(self, industry: Optional[IndustryType], 
                                     company_size: str) -> List[str]:
        """Get supporting evidence for value propositions"""
        
        evidence = [
            "Case study: 40% improvement in efficiency",
            "Industry benchmark: Top quartile performance",
            "Customer testimonial: 'Transformed our operations'",
            "ROI analysis: Payback in 6 months"
        ]
        
        if industry == IndustryType.TECHNOLOGY:
            evidence.extend([
                "Reduced development time by average of 35%",
                "99.9% uptime across client base",
                "Gartner recognition as industry leader"
            ])
        
        return evidence

    async def _get_quantified_benefits(self, industry: Optional[IndustryType], 
                                     business_objectives: List[str]) -> List[str]:
        """Get quantified benefits based on objectives"""
        
        benefits = [
            "25-40% improvement in operational efficiency",
            "50% reduction in manual processes",
            "30% decrease in error rates",
            "6-month average payback period"
        ]
        
        for objective in business_objectives:
            if "growth" in objective.lower():
                benefits.append("20% faster time to market")
            elif "cost" in objective.lower():
                benefits.append("15% reduction in operational costs")
            elif "quality" in objective.lower():
                benefits.append("60% improvement in quality metrics")
        
        return benefits

    def _create_default_contextual_knowledge(self) -> ContextualKnowledge:
        """Create default contextual knowledge when query fails"""
        
        return ContextualKnowledge(
            relevant_entries=[],
            methodology_guidance={"approach": "Use consultative selling approach"},
            industry_insights={"overview": "Focus on business value and outcomes"},
            objection_responses=[{
                "objection": "General objection",
                "response": "I understand your concern. Let me address that...",
                "follow_up": "What specific aspects concern you most?"
            }],
            value_propositions=["Improve efficiency", "Reduce costs", "Enhance quality"],
            conversation_starters=["Tell me about your current challenges"],
            closing_techniques=["What questions can I answer for you?"]
        )

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of the knowledge service"""
        
        return {
            "status": "healthy",
            "service": "knowledge_management",
            "knowledge_base_size": len(self.knowledge_base),
            "company_profiles": len(self.company_profiles),
            "methodologies_loaded": len(self.methodology_frameworks),
            "industry_contexts": len(self.industry_contexts),
            "memory_usage": {
                "knowledge_entries": len(self.knowledge_base),
                "total_usage_count": sum(entry.usage_count for entry in self.knowledge_base.values())
            }
        }

    def get_usage_statistics(self) -> Dict[str, Any]:
        """Get knowledge base usage statistics"""
        
        if not self.knowledge_base:
            return {"message": "No knowledge base entries"}
        
        total_usage = sum(entry.usage_count for entry in self.knowledge_base.values())
        most_used = max(self.knowledge_base.values(), key=lambda x: x.usage_count)
        
        category_usage = {}
        for entry in self.knowledge_base.values():
            category = entry.category
            if category not in category_usage:
                category_usage[category] = {"count": 0, "usage": 0}
            category_usage[category]["count"] += 1
            category_usage[category]["usage"] += entry.usage_count
        
        return {
            "total_entries": len(self.knowledge_base),
            "total_usage_count": total_usage,
            "most_used_entry": {
                "title": most_used.title,
                "usage_count": most_used.usage_count
            },
            "category_breakdown": category_usage,
            "average_usage_per_entry": total_usage / len(self.knowledge_base)
        }