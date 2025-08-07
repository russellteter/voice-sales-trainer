'use client';

import { useState, useMemo, useEffect } from 'react';
import { scenarioApi, handleApiError } from '../lib/api';
import { TrainingScenario, ScenarioFilters } from '../types/api';
import { useAuth } from '../contexts/AuthContext';

// This will be replaced by API data

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
  
  // API state
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { isAuthenticated } = useAuth();

  const categories = ['All', 'Cold Calling', 'Objection Handling', 'Discovery', 'Closing', 'Product Demo', 'Negotiation'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const personas = ['All', 'SDR/BDR', 'Account Executive', 'Sales Manager', 'Customer Success'];

  // Load scenarios on component mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadScenarios();
    }
  }, [isAuthenticated]);

  // Reload scenarios when filters change
  useEffect(() => {
    if (isAuthenticated) {
      loadScenarios();
    }
  }, [selectedCategory, selectedDifficulty, selectedPersona, searchTerm]);

  const loadScenarios = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ScenarioFilters = {
        category: selectedCategory !== 'All' ? selectedCategory as any : undefined,
        difficulty: selectedDifficulty !== 'All' ? selectedDifficulty as any : undefined,
        persona: selectedPersona !== 'All' ? selectedPersona as any : undefined,
        search: searchTerm || undefined,
      };

      const response = await scenarioApi.getAll(filters);
      
      if (response.data) {
        setScenarios(response.data);
      } else if (response.error) {
        setError(handleApiError(response.error));
      }
    } catch (err) {
      setError('Failed to load scenarios. Please try again.');
      console.error('Error loading scenarios:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredScenarios = useMemo(() => {
    // Client-side filtering is now handled by the API, but we keep sorting here
    let filtered = scenarios;

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'difficulty':
          const difficultyOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
          return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
        case 'popularity':
          return b.completion_count - a.completion_count;
        case 'score':
          return b.average_score - a.average_score;
        default:
          return 0;
      }
    });

    return filtered;
  }, [scenarios, sortBy]);

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view training scenarios.</p>
        </div>
      </div>
    );
  }

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
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Training Scenarios</h2>
          <p className="text-gray-600">Choose from {filteredScenarios.length} available scenarios</p>
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm-6 8a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm6 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        {/* Difficulty Filter */}
        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {difficulties.map(difficulty => (
            <option key={difficulty} value={difficulty}>{difficulty}</option>
          ))}
        </select>

        {/* Persona Filter */}
        <select
          value={selectedPersona}
          onChange={(e) => setSelectedPersona(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {personas.map(persona => (
            <option key={persona} value={persona}>{persona}</option>
          ))}
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'name' | 'difficulty' | 'popularity' | 'score')}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="popularity">Most Popular</option>
          <option value="score">Highest Score</option>
          <option value="name">Name A-Z</option>
          <option value="difficulty">Difficulty</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading scenarios...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="text-red-500 mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Scenarios</h3>
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={loadScenarios}
                className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenarios Display */}
      {!isLoading && !error && filteredScenarios.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-gray-600">No scenarios found matching your criteria</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
              setSelectedDifficulty('All');
              setSelectedPersona('All');
            }}
            className="mt-4 text-blue-600 hover:text-blue-700"
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
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              onClick={() => onScenarioSelect(scenario)}
            >
              {viewMode === 'grid' ? (
                <>
                  {/* Grid View */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-3 py-1 text-sm rounded-full border ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty}
                    </span>
                    <span className="text-sm text-gray-500">{scenario.duration}</span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 text-lg">{scenario.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{scenario.description}</p>
                  
                  <div className="space-y-3">
                    {/* Category and Persona */}
                    <div className="flex justify-between">
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {scenario.category}
                      </span>
                      <span className="text-xs text-gray-500">{scenario.persona}</span>
                    </div>
                    
                    {/* Stats */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {scenario.completion_count} completions
                        </span>
                        <span className={`text-sm font-medium ${getScoreColor(scenario.average_score)}`}>
                          {scenario.average_score}% avg
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
                      <h3 className="font-medium text-gray-900">{scenario.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getDifficultyColor(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {scenario.category}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{scenario.description}</p>
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>{scenario.duration}</span>
                    <span>{scenario.completion_count} completions</span>
                    <span className={getScoreColor(scenario.average_score)}>
                      {scenario.average_score}% avg
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