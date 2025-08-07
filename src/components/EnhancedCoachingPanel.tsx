'use client';

import { useState, useEffect, useRef } from 'react';
import { FeedbackItem, FeedbackType, FeedbackCategory } from './RealTimeFeedbackPanel';

export type CoachPersona = 'coach_marcus' | 'tim';

export interface CoachingMessage extends FeedbackItem {
  persona: CoachPersona;
  intensity: 1 | 2 | 3 | 4 | 5; // 1 = gentle, 5 = intense
  conversationContext?: string;
  alternativeApproach?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

interface EnhancedCoachingPanelProps {
  messages: CoachingMessage[];
  activePersona: CoachPersona;
  isVoiceActive: boolean;
  conversationHeatMap?: number[]; // Array representing conversation effectiveness over time
  onPersonaSwitch?: (persona: CoachPersona) => void;
  onMessageDismiss?: (id: string) => void;
  className?: string;
}

export default function EnhancedCoachingPanel({
  messages,
  activePersona,
  isVoiceActive,
  conversationHeatMap = [],
  onPersonaSwitch,
  onMessageDismiss,
  className = ''
}: EnhancedCoachingPanelProps) {
  const [displayedMessages, setDisplayedMessages] = useState<CoachingMessage[]>([]);
  const [heatMapVisible, setHeatMapVisible] = useState(false);
  const [animatingMessageIds, setAnimatingMessageIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages]);

  // Handle new messages with persona-specific animations
  useEffect(() => {
    const newMessages = messages.filter(msg => 
      !displayedMessages.find(displayed => displayed.id === msg.id)
    );

    if (newMessages.length > 0) {
      const newIds = new Set(newMessages.map(msg => msg.id));
      setAnimatingMessageIds(newIds);

      // Clear animation after delay
      setTimeout(() => {
        setAnimatingMessageIds(new Set());
      }, 1000);
    }

    setDisplayedMessages(messages.slice(-10)); // Keep last 10 messages
  }, [messages, displayedMessages]);

  const getPersonaConfig = (persona: CoachPersona) => {
    const configs = {
      coach_marcus: {
        name: 'Coach Marcus',
        icon: '🎯',
        avatar: '👨‍💼',
        bgColor: 'from-red-50 to-orange-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        accentColor: 'bg-red-500',
        description: 'Direct, analytical coaching',
        style: 'sharp edges, data-focused',
        personality: 'No-nonsense, results-driven'
      },
      tim: {
        name: 'Tim',
        icon: '🤝',
        avatar: '👨‍🏫',
        bgColor: 'from-blue-50 to-indigo-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        accentColor: 'bg-blue-500',
        description: 'Conversational, supportive coaching',
        style: 'rounded edges, relationship-focused',
        personality: 'Encouraging, collaborative'
      }
    };
    return configs[persona];
  };

  const getIntensityIndicator = (intensity: 1 | 2 | 3 | 4 | 5, persona: CoachPersona) => {
    const config = getPersonaConfig(persona);
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`w-1 h-3 rounded-sm transition-all ${
              i < intensity 
                ? `${config.accentColor} opacity-100` 
                : 'bg-gray-200 opacity-50'
            }`}
          />
        ))}
      </div>
    );
  };

  const getConversationHeatMap = () => {
    if (conversationHeatMap.length === 0) return null;

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-900">Conversation Flow</h4>
          <button
            onClick={() => setHeatMapVisible(!heatMapVisible)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            {heatMapVisible ? 'Hide' : 'Show'} Details
          </button>
        </div>
        
        <div className="flex items-center space-x-1 h-8">
          {conversationHeatMap.map((effectiveness, index) => (
            <div
              key={index}
              className={`flex-1 h-full rounded-sm transition-all ${
                effectiveness >= 8 
                  ? 'bg-green-500' 
                  : effectiveness >= 6 
                  ? 'bg-yellow-500' 
                  : effectiveness >= 4 
                  ? 'bg-orange-500' 
                  : 'bg-red-500'
              }`}
              style={{ opacity: effectiveness / 10 }}
              title={`Effectiveness: ${effectiveness}/10`}
            />
          ))}
        </div>
        
        {heatMapVisible && (
          <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">Excellent (8-10)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-600">Good (6-7)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-600">Fair (4-5)</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">Needs Work (1-3)</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const activeConfig = getPersonaConfig(activePersona);
  const inactivePersona = activePersona === 'coach_marcus' ? 'tim' : 'coach_marcus';
  const inactiveConfig = getPersonaConfig(inactivePersona);

  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 border-gray-200 ${className}`}>
      {/* Persona Selector Header */}
      <div className="bg-gradient-to-r from-class-pale-purple to-lightest-purple p-4 rounded-t-lg border-b border-class-light-purple">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">💬</span>
            <h3 className="text-lg font-bold text-class-purple">AI Coaching</h3>
            {isVoiceActive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Live</span>
              </div>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {displayedMessages.length} active insights
          </div>
        </div>

        {/* Persona Switcher */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => onPersonaSwitch?.('coach_marcus')}
            className={`p-3 rounded-lg border-2 transition-all ${
              activePersona === 'coach_marcus'
                ? 'border-red-300 bg-gradient-to-r from-red-50 to-orange-50 shadow-md scale-105'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xl">{getPersonaConfig('coach_marcus').avatar}</span>
              <span className={`font-bold text-sm ${
                activePersona === 'coach_marcus' ? 'text-red-900' : 'text-gray-700'
              }`}>
                Coach Marcus
              </span>
            </div>
            <p className={`text-xs ${
              activePersona === 'coach_marcus' ? 'text-red-700' : 'text-gray-500'
            }`}>
              Direct, analytical coaching
            </p>
          </button>

          <button
            onClick={() => onPersonaSwitch?.('tim')}
            className={`p-3 rounded-lg border-2 transition-all ${
              activePersona === 'tim'
                ? 'border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-105'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xl">{getPersonaConfig('tim').avatar}</span>
              <span className={`font-bold text-sm ${
                activePersona === 'tim' ? 'text-blue-900' : 'text-gray-700'
              }`}>
                Tim
              </span>
            </div>
            <p className={`text-xs ${
              activePersona === 'tim' ? 'text-blue-700' : 'text-gray-500'
            }`}>
              Supportive, conversational
            </p>
          </button>
        </div>
      </div>

      {/* Conversation Heat Map */}
      {conversationHeatMap.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          {getConversationHeatMap()}
        </div>
      )}

      {/* Coaching Messages */}
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {displayedMessages.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">{activeConfig.avatar}</div>
            <p className="text-gray-600 font-medium">
              {isVoiceActive 
                ? `${activeConfig.name} is listening for coaching opportunities...`
                : `Start your conversation to receive insights from ${activeConfig.name}`
              }
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {activeConfig.description}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {displayedMessages.map((message) => {
              const config = getPersonaConfig(message.persona);
              const isAnimating = animatingMessageIds.has(message.id);
              
              return (
                <div
                  key={message.id}
                  className={`
                    bg-gradient-to-r ${config.bgColor} border-2 ${config.borderColor} 
                    rounded-lg p-4 transition-all duration-500 ease-out
                    ${isAnimating ? 'scale-105 shadow-lg animate-pulse' : 'scale-100'}
                    ${message.persona !== activePersona ? 'opacity-60 transform scale-95' : ''}
                  `}
                >
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{config.avatar}</span>
                      <div>
                        <div className={`font-bold text-sm ${config.textColor}`}>
                          {config.name}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getIntensityIndicator(message.intensity, message.persona)}
                          <span className={`text-xs ${config.textColor} opacity-75`}>
                            {message.category.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${config.textColor} opacity-60`}>
                        {Math.floor((Date.now() - message.timestamp.getTime()) / 1000)}s ago
                      </span>
                      {onMessageDismiss && (
                        <button
                          onClick={() => onMessageDismiss(message.id)}
                          className={`${config.textColor} hover:opacity-75 text-sm font-bold`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className={`text-sm font-medium ${config.textColor} mb-3 leading-relaxed`}>
                    {message.message}
                  </div>

                  {/* Context */}
                  {message.conversationContext && (
                    <div className={`text-xs ${config.textColor} opacity-75 mb-2 italic bg-white bg-opacity-50 p-2 rounded`}>
                      <span className="font-semibold">Context:</span> {message.conversationContext}
                    </div>
                  )}

                  {/* Alternative Approach */}
                  {message.alternativeApproach && (
                    <div className={`text-xs bg-white p-2 rounded border ${config.borderColor}`}>
                      <span className={`font-semibold ${config.textColor}`}>💡 Alternative approach:</span>
                      <span className={`ml-2 ${config.textColor}`}>{message.alternativeApproach}</span>
                    </div>
                  )}

                  {/* Skill Level Indicator */}
                  {message.skillLevel && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-xs ${config.textColor} opacity-75`}>
                        Skill level: {message.skillLevel}
                      </span>
                      <div className={`text-xs px-2 py-1 rounded-full ${config.accentColor} bg-opacity-20 ${config.textColor}`}>
                        {message.type}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Footer with Quick Stats */}
      {displayedMessages.length > 0 && (
        <div className="bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{displayedMessages.filter(m => m.type === 'positive').length} positive</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>{displayedMessages.filter(m => m.type === 'improvement').length} improvements</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span>{displayedMessages.filter(m => m.type === 'coaching').length} coaching</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{activeConfig.name} Active</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to create coaching messages with personas
export const CoachingMessageFactory = {
  createMarcusMessage: (
    type: FeedbackType,
    category: FeedbackCategory,
    message: string,
    intensity: 1 | 2 | 3 | 4 | 5 = 3,
    options: {
      conversationContext?: string;
      alternativeApproach?: string;
      skillLevel?: 'beginner' | 'intermediate' | 'advanced';
      priority?: 1 | 2 | 3;
    } = {}
  ): CoachingMessage => ({
    id: `marcus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    category,
    message,
    timestamp: new Date(),
    priority: options.priority ?? 2,
    persona: 'coach_marcus',
    intensity,
    conversationContext: options.conversationContext,
    alternativeApproach: options.alternativeApproach,
    skillLevel: options.skillLevel,
    isNew: true
  }),

  createTimMessage: (
    type: FeedbackType,
    category: FeedbackCategory,
    message: string,
    intensity: 1 | 2 | 3 | 4 | 5 = 2,
    options: {
      conversationContext?: string;
      alternativeApproach?: string;
      skillLevel?: 'beginner' | 'intermediate' | 'advanced';
      priority?: 1 | 2 | 3;
    } = {}
  ): CoachingMessage => ({
    id: `tim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    category,
    message,
    timestamp: new Date(),
    priority: options.priority ?? 2,
    persona: 'tim',
    intensity,
    conversationContext: options.conversationContext,
    alternativeApproach: options.alternativeApproach,
    skillLevel: options.skillLevel,
    isNew: true
  })
};