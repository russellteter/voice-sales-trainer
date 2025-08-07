"""
Prompt Templates Package
Centralized repository for Claude API prompt templates
"""

from .simulation_prompts import SimulationPromptTemplates
from .assessment_prompts import AssessmentPromptTemplates

__all__ = [
    'SimulationPromptTemplates',
    'AssessmentPromptTemplates'
]