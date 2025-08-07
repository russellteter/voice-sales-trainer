'use client';

import { useState, useEffect } from 'react';

export type FeedbackType = 'positive' | 'improvement' | 'critical' | 'coaching' | 'achievement';
export type FeedbackCategory = 'technique' | 'tone' | 'timing' | 'content' | 'objection_handling';

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  category: FeedbackCategory;
  message: string;
  timestamp: Date;
  priority: 1 | 2 | 3; // 1 = high, 2 = medium, 3 = low
  isNew?: boolean;
  context?: string; // What triggered this feedback
  suggestion?: string; // Specific improvement suggestion
}

interface RealTimeFeedbackPanelProps {
  feedbackItems: FeedbackItem[];
  maxVisibleItems?: number;
  showCategories?: boolean;
  isActive?: boolean;
  className?: string;
  onFeedbackDismiss?: (id: string) => void;
}

export default function RealTimeFeedbackPanel({
  feedbackItems,
  maxVisibleItems = 5,
  showCategories = true,
  isActive = false,
  className = '',
  onFeedbackDismiss
}: RealTimeFeedbackPanelProps) {
  const [displayedItems, setDisplayedItems] = useState<FeedbackItem[]>([]);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  // Handle new feedback items with animation
  useEffect(() => {
    const sortedItems = [...feedbackItems]
      .sort((a, b) => {
        // Sort by priority first, then by timestamp
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.timestamp.getTime() - a.timestamp.getTime();
      })
      .slice(0, maxVisibleItems);

    // Find new items
    const currentIds = new Set(displayedItems.map(item => item.id));
    const newItems = sortedItems.filter(item => !currentIds.has(item.id));

    if (newItems.length > 0) {
      // Mark new items for animation
      const newItemIds = new Set(newItems.map(item => item.id));
      setAnimatingItems(newItemIds);

      // Clear animation state after animation completes
      setTimeout(() => {
        setAnimatingItems(new Set());
      }, 600);
    }

    setDisplayedItems(sortedItems);
  }, [feedbackItems, maxVisibleItems, displayedItems]);

  const getFeedbackConfig = (item: FeedbackItem) => {
    const configs = {
      positive: {
        icon: '✅',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-900',
        accentColor: 'bg-green-500'
      },
      improvement: {
        icon: '💡',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
        accentColor: 'bg-blue-500'
      },
      critical: {
        icon: '⚠️',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        accentColor: 'bg-red-500'
      },
      coaching: {
        icon: '🎯',
        bgColor: 'bg-class-pale-purple',
        borderColor: 'border-class-light-purple',
        textColor: 'text-class-purple',
        accentColor: 'bg-class-purple'
      },
      achievement: {
        icon: '🏆',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-900',
        accentColor: 'bg-yellow-500'
      }
    };
    return configs[item.type];
  };

  const getCategoryConfig = (category: FeedbackCategory) => {
    const configs = {
      technique: { label: 'Technique', icon: '🛠️' },
      tone: { label: 'Tone', icon: '🎵' },
      timing: { label: 'Timing', icon: '⏰' },
      content: { label: 'Content', icon: '📝' },
      objection_handling: { label: 'Objections', icon: '🛡️' }
    };
    return configs[category];
  };

  const getPriorityIndicator = (priority: 1 | 2 | 3) => {
    const indicators = {
      1: { dots: 3, color: 'bg-red-500' },
      2: { dots: 2, color: 'bg-yellow-500' },
      3: { dots: 1, color: 'bg-green-500' }
    };
    const config = indicators[priority];
    
    return (
      <div className="flex items-center space-x-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < config.dots ? config.color : 'bg-light-gray'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatTimeAgo = (timestamp: Date) => {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`bg-white rounded-lg border-2 border-class-light-purple shadow-lg ${className}`}>
      {/* Header */}
      <div className="bg-class-pale-purple px-4 py-3 rounded-t-lg border-b border-class-light-purple">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">💬</span>
            <h3 className="text-lg font-bold text-class-purple">Live Coaching</h3>
            {isActive && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Active</span>
              </div>
            )}
          </div>
          <div className="text-xs text-middle-gray font-mono">
            {displayedItems.length} / {feedbackItems.length} items
          </div>
        </div>
      </div>

      {/* Feedback Items */}
      <div className="max-h-96 overflow-y-auto">
        {displayedItems.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-4xl mb-3">🎤</div>
            <p className="text-middle-gray font-medium">
              {isActive ? 'Listening for coaching opportunities...' : 'Coaching tips will appear here during conversation'}
            </p>
            {!isActive && (
              <p className="text-sm text-dark-gray mt-2">
                Start your voice session to receive real-time feedback
              </p>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {displayedItems.map((item) => {
              const config = getFeedbackConfig(item);
              const categoryConfig = getCategoryConfig(item.category);
              const isAnimating = animatingItems.has(item.id);
              
              return (
                <div
                  key={item.id}
                  className={`
                    ${config.bgColor} ${config.borderColor} border rounded-lg p-3 
                    transition-all duration-500 ease-out
                    ${isAnimating ? 'scale-102 shadow-lg animate-pulse' : 'scale-100'}
                    ${item.isNew ? 'ring-2 ring-class-purple ring-opacity-50' : ''}
                    hover:shadow-md
                  `}
                >
                  {/* Feedback Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{config.icon}</span>
                      {showCategories && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{categoryConfig.icon}</span>
                          <span className={`text-xs font-semibold ${config.textColor} opacity-75`}>
                            {categoryConfig.label}
                          </span>
                        </div>
                      )}
                      {getPriorityIndicator(item.priority)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${config.textColor} opacity-60`}>
                        {formatTimeAgo(item.timestamp)}
                      </span>
                      {onFeedbackDismiss && (
                        <button
                          onClick={() => onFeedbackDismiss(item.id)}
                          className={`${config.textColor} hover:opacity-75 text-sm font-bold`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Feedback Content */}
                  <div className={`text-sm font-medium ${config.textColor} mb-2`}>
                    {item.message}
                  </div>

                  {/* Context */}
                  {item.context && (
                    <div className={`text-xs ${config.textColor} opacity-75 mb-2 italic`}>
                      Context: {item.context}
                    </div>
                  )}

                  {/* Suggestion */}
                  {item.suggestion && (
                    <div className={`text-xs bg-white p-2 rounded border ${config.borderColor}`}>
                      <span className={`font-semibold ${config.textColor}`}>💡 Try this:</span>
                      <span className={`ml-2 ${config.textColor}`}>{item.suggestion}</span>
                    </div>
                  )}

                  {/* Priority indicator bar */}
                  <div className={`h-1 ${config.accentColor} rounded-full mt-2 opacity-20`} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with summary */}
      {feedbackItems.length > 0 && (
        <div className="bg-lightest-gray px-4 py-2 rounded-b-lg border-t border-light-gray">
          <div className="flex items-center justify-between text-xs text-dark-gray">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>{feedbackItems.filter(f => f.type === 'positive').length} positive</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>{feedbackItems.filter(f => f.type === 'improvement').length} improvements</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>{feedbackItems.filter(f => f.type === 'critical').length} critical</span>
              </div>
            </div>
            {feedbackItems.length > maxVisibleItems && (
              <span className="font-medium">
                +{feedbackItems.length - maxVisibleItems} more items
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility hook for managing feedback
export function useFeedbackManager() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);

  const addFeedback = (
    type: FeedbackType,
    category: FeedbackCategory,
    message: string,
    options: {
      priority?: 1 | 2 | 3;
      context?: string;
      suggestion?: string;
    } = {}
  ) => {
    const newItem: FeedbackItem = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      category,
      message,
      timestamp: new Date(),
      priority: options.priority ?? 2,
      context: options.context,
      suggestion: options.suggestion,
      isNew: true
    };

    setFeedbackItems(prev => {
      // Mark item as not new after a delay
      setTimeout(() => {
        setFeedbackItems(items => 
          items.map(item => 
            item.id === newItem.id ? { ...item, isNew: false } : item
          )
        );
      }, 3000);

      return [newItem, ...prev];
    });
  };

  const removeFeedback = (id: string) => {
    setFeedbackItems(prev => prev.filter(item => item.id !== id));
  };

  const clearFeedback = () => {
    setFeedbackItems([]);
  };

  const getFeedbackByCategory = (category: FeedbackCategory) => {
    return feedbackItems.filter(item => item.category === category);
  };

  const getFeedbackByType = (type: FeedbackType) => {
    return feedbackItems.filter(item => item.type === type);
  };

  return {
    feedbackItems,
    addFeedback,
    removeFeedback,
    clearFeedback,
    getFeedbackByCategory,
    getFeedbackByType
  };
}

// Common feedback generators
export const FeedbackGenerators = {
  positiveResponse: (context: string) => ({
    type: 'positive' as FeedbackType,
    category: 'technique' as FeedbackCategory,
    message: 'Great response! You handled that well.',
    options: { context, priority: 3 as const }
  }),

  improveQuestioning: (suggestion: string) => ({
    type: 'improvement' as FeedbackType,
    category: 'technique' as FeedbackCategory,
    message: 'Consider asking more open-ended questions.',
    options: { suggestion, priority: 2 as const }
  }),

  toneConcern: (context: string) => ({
    type: 'critical' as FeedbackType,
    category: 'tone' as FeedbackCategory,
    message: 'Your tone seemed rushed. Try slowing down.',
    options: { context, priority: 1 as const }
  }),

  objectionHandling: (suggestion: string) => ({
    type: 'coaching' as FeedbackType,
    category: 'objection_handling' as FeedbackCategory,
    message: 'Good objection handling technique.',
    options: { suggestion, priority: 2 as const }
  }),

  achievementUnlocked: (achievement: string) => ({
    type: 'achievement' as FeedbackType,
    category: 'technique' as FeedbackCategory,
    message: `Achievement unlocked: ${achievement}`,
    options: { priority: 1 as const }
  })
};