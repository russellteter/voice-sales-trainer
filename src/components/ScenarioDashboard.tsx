'use client';

import { useState, useMemo } from 'react';

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'Cold Calling' | 'Objection Handling' | 'Closing' | 'Discovery' | 'Product Demo' | 'Negotiation';
  duration: string;
  objectives: string[];
  tags: string[];
  completionCount: number;
  averageScore: number;
  persona: 'SDR/BDR' | 'Account Executive' | 'Sales Manager' | 'Customer Success';
}

const COMPREHENSIVE_SCENARIOS: TrainingScenario[] = [
  {
    id: '1',
    title: 'Cold Outreach Introduction',
    description: 'Practice introducing yourself and your product to a cold prospect with effective opening techniques',
    difficulty: 'Beginner',
    category: 'Cold Calling',
    duration: '5-8 minutes',
    objectives: [
      'Deliver a compelling value proposition in 30 seconds',
      'Handle initial skepticism and build rapport',
      'Secure a discovery call or next meeting'
    ],
    tags: ['value-prop', 'rapport-building', 'first-impression'],
    completionCount: 24,
    averageScore: 78,
    persona: 'SDR/BDR'
  },
  {
    id: '2',
    title: 'Price Objection Handling',
    description: 'Handle common price objections with confidence and value positioning',
    difficulty: 'Intermediate',
    category: 'Objection Handling',
    duration: '10-12 minutes',
    objectives: [
      'Acknowledge and empathize with price concerns',
      'Reframe conversation from cost to value',
      'Present ROI and business case effectively'
    ],
    tags: ['price-objections', 'value-selling', 'roi'],
    completionCount: 18,
    averageScore: 72,
    persona: 'Account Executive'
  },
  {
    id: '3',
    title: 'Discovery Questions Mastery',
    description: 'Ask the right questions to uncover customer needs and pain points using SPIN methodology',
    difficulty: 'Beginner',
    category: 'Discovery',
    duration: '12-15 minutes',
    objectives: [
      'Execute SPIN questioning framework',
      'Uncover business pain points and implications',
      'Build compelling need-payoff scenarios'
    ],
    tags: ['spin-selling', 'needs-analysis', 'pain-points'],
    completionCount: 31,
    averageScore: 81,
    persona: 'Account Executive'
  },
  {
    id: '4',
    title: 'Closing with Urgency',
    description: 'Create appropriate urgency to move prospects toward a decision without being pushy',
    difficulty: 'Advanced',
    category: 'Closing',
    duration: '8-10 minutes',
    objectives: [
      'Identify and leverage business drivers',
      'Create authentic urgency',
      'Handle last-minute objections'
    ],
    tags: ['urgency', 'closing-techniques', 'decision-making'],
    completionCount: 12,
    averageScore: 69,
    persona: 'Account Executive'
  },
  {
    id: '5',
    title: 'Product Demo Excellence',
    description: 'Deliver compelling product demonstrations that focus on customer value and outcomes',
    difficulty: 'Intermediate',
    category: 'Product Demo',
    duration: '15-20 minutes',
    objectives: [
      'Customize demo to customer use case',
      'Maintain prospect engagement throughout',
      'Connect features to business outcomes'
    ],
    tags: ['demo-skills', 'customization', 'engagement'],
    completionCount: 15,
    averageScore: 75,
    persona: 'Account Executive'
  },
  {
    id: '6',
    title: 'Competitive Displacement',
    description: 'Navigate competitive situations and position against incumbents',
    difficulty: 'Advanced',
    category: 'Objection Handling',
    duration: '12-15 minutes',
    objectives: [
      'Acknowledge competitor strengths appropriately',
      'Highlight unique differentiators',
      'Focus on switching costs and benefits'
    ],
    tags: ['competitive-selling', 'differentiation', 'switching-costs'],
    completionCount: 8,
    averageScore: 65,
    persona: 'Account Executive'
  },
  {
    id: '7',
    title: 'Contract Negotiation Basics',
    description: 'Handle basic contract negotiations and pricing discussions',
    difficulty: 'Advanced',
    category: 'Negotiation',
    duration: '10-12 minutes',
    objectives: [
      'Establish negotiation framework',
      'Find win-win solutions',
      'Maintain relationship during tough discussions'
    ],
    tags: ['negotiation', 'contract-terms', 'win-win'],
    completionCount: 6,
    averageScore: 71,
    persona: 'Account Executive'
  },
  {
    id: '8',
    title: 'Team Coaching Conversation',
    description: 'Conduct effective coaching conversations with sales team members',
    difficulty: 'Intermediate',
    category: 'Discovery',
    duration: '8-10 minutes',
    objectives: [
      'Identify performance gaps',
      'Provide constructive feedback',
      'Create development action plans'
    ],
    tags: ['coaching', 'feedback', 'development'],
    completionCount: 22,
    averageScore: 79,
    persona: 'Sales Manager'
  }
];

interface ScenarioDashboardProps {
  onScenarioSelect: (scenario: TrainingScenario) => void;
  selectedScenario?: TrainingScenario | null;
}

export default function ScenarioDashboard({ onScenarioSelect, selectedScenario }: ScenarioDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedPersona, setSelectedPersona] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'difficulty' | 'popularity' | 'score'>('popularity');

  const categories = ['All', 'Cold Calling', 'Objection Handling', 'Discovery', 'Closing', 'Product Demo', 'Negotiation'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const personas = ['All', 'SDR/BDR', 'Account Executive', 'Sales Manager', 'Customer Success'];

  const filteredScenarios = useMemo(() => {
    let filtered = COMPREHENSIVE_SCENARIOS;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(scenario =>
        scenario.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        scenario.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(scenario => scenario.category === selectedCategory);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(scenario => scenario.difficulty === selectedDifficulty);
    }

    // Apply persona filter
    if (selectedPersona !== 'All') {
      filtered = filtered.filter(scenario => scenario.persona === selectedPersona);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'difficulty':
          const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'popularity':
          return b.completionCount - a.completionCount;
        case 'score':
          return b.averageScore - a.averageScore;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchTerm, selectedCategory, selectedDifficulty, selectedPersona, sortBy]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-class-purple mb-2">Training Scenarios</h2>
          <p className="text-midnight-blue">Choose from {filteredScenarios.length} available scenarios</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' 
              ? 'bg-class-light-purple text-class-purple' 
              : 'text-middle-gray hover:text-class-purple'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm-6 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' 
              ? 'bg-class-light-purple text-class-purple' 
              : 'text-middle-gray hover:text-class-purple'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
        {/* Search */}
        <div className="lg:col-span-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search scenarios, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-middle-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input-field"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="input-field"
        >
          {difficulties.map(difficulty => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
          ))}
        </select>

        {/* Persona Filter */}
        <select
          value={selectedPersona}
          onChange={(e) => setSelectedPersona(e.target.value)}
          className="input-field"
        >
          {personas.map(persona => (
            <option key={persona} value={persona}>{persona}</option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="input-field"
        >
          <option value="popularity">Most Popular</option>
          <option value="score">Highest Score</option>
          <option value="name">Name A-Z</option>
          <option value="difficulty">Difficulty</option>
        </select>
      </div>

      {/* Scenarios Display */}
      {filteredScenarios.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-middle-gray mb-4">No scenarios found matching your criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedDifficulty('All');
              setSelectedPersona('All');
            }}
            className="btn-secondary"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
          : 'space-y-4'
        }>
          {filteredScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`
                ${viewMode === 'grid' ? 'p-6' : 'p-4 flex items-center justify-between'} 
                rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg
                ${selectedScenario?.id === scenario.id
                  ? 'border-class-purple bg-class-pale-purple shadow-md'
                  : 'border-gray-200 hover:border-class-light-purple'
                }
              `}
              onClick={() => onScenarioSelect(scenario)}
            >
              {viewMode === 'grid' ? (
                <>
                  {/* Grid View */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-sm rounded-full border font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                    <span className="text-sm text-dark-gray font-medium">{scenario.duration}</span>
                  </div>
                  
                  <h3 className="font-bold text-midnight-blue mb-2 text-lg">{scenario.title}</h3>
                  <p className="text-dark-gray text-sm mb-4 line-clamp-2">{scenario.description}</p>
                  
                  <div className="space-y-3">
                    {/* Category and Persona */}
                    <div className="flex justify-between">
                      <span className="inline-block px-3 py-1 text-xs bg-class-pale-purple text-class-purple rounded-full font-medium">
                        {scenario.category}
                      </span>
                      <span className="text-xs text-middle-gray font-medium">{scenario.persona}</span>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex justify-between items-center pt-3 border-t border-light-gray">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-dark-gray">
                          {scenario.completionCount} completions
                        </span>
                        <span className={`text-sm font-bold ${getScoreColor(scenario.averageScore)}`}>
                          {scenario.averageScore}% avg
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* List View */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <h3 className="font-bold text-midnight-blue">{scenario.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full border font-medium ${getDifficultyColor(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      <span className="text-xs bg-class-pale-purple text-class-purple px-2 py-1 rounded-full font-medium">
                        {scenario.category}
                      </span>
                    </div>
                    <p className="text-dark-gray text-sm mt-1">{scenario.description}</p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-middle-gray">
                    <span>{scenario.duration}</span>
                    <span>{scenario.completionCount} completions</span>
                    <span className={`font-bold ${getScoreColor(scenario.averageScore)}`}>
                      {scenario.averageScore}% avg
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}