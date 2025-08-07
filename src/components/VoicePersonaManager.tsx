'use client';

import { useState, useEffect } from 'react';

export interface VoicePersona {
  name: string;
  voiceName: string;
  description: string;
  role: 'coach' | 'prospect';
  personality: string;
  objectives: string[];
  sampleResponses: string[];
  voiceSettings: {
    stability: number;
    similarityBoost: number;
    style: number;
    useSpeakerBoost: boolean;
  };
}

export const DEFAULT_PERSONAS: VoicePersona[] = [
  {
    name: 'Coach Marcus',
    voiceName: 'coach_marcus',
    description: 'Professional sales trainer - Direct, analytical feedback persona',
    role: 'coach',
    personality: 'Direct, analytical, constructive, and experienced. Uses data-driven insights and proven sales methodologies.',
    objectives: [
      'Provide specific, actionable feedback on sales techniques',
      'Identify areas for improvement in conversation flow',
      'Coach on objection handling and closing techniques',
      'Share best practices and industry insights',
      'Maintain professional but encouraging tone'
    ],
    sampleResponses: [
      "Great question! That shows you're listening to the prospect's concerns. Now let's work on quantifying the benefits more specifically.",
      "I noticed you handled that objection well, but you could have been more direct about the next steps. Try asking for the business explicitly.",
      "Your discovery questions are strong. The key is to dig deeper into the business impact. Ask follow-up questions about costs of not solving this problem.",
      "Nice job building rapport! Now transition into value-based selling by connecting their pain points to your solution's specific capabilities."
    ],
    voiceSettings: {
      stability: 0.7,
      similarityBoost: 0.8,
      style: 0.3,
      useSpeakerBoost: true
    }
  },
  {
    name: 'Tim',
    voiceName: 'tim',
    description: 'Realistic business prospect - Mid-sized company decision maker with budget concerns',
    role: 'prospect',
    personality: 'Professional but cautious, interested yet skeptical. Makes decisions carefully with team input.',
    objectives: [
      'Provide realistic prospect responses with genuine objections',
      'Test sales rep on common business concerns (budget, timeline, ROI)',
      'Simulate multi-stakeholder decision processes',
      'Challenge sales rep with tough but fair questions',
      'Progress conversation based on quality of responses'
    ],
    sampleResponses: [
      "That sounds interesting, but I'm not sure we have the budget allocated for this kind of solution right now. Can you help me understand the ROI timeline?",
      "I've heard similar promises from other vendors. What makes your approach different, and can you provide some concrete examples of results?",
      "I'll need to run this by my team and our CFO. What kind of information would you recommend I present to them to get buy-in?",
      "The implementation timeline is critical for us. We're already managing three other initiatives this quarter. How quickly could we see results?"
    ],
    voiceSettings: {
      stability: 0.6,
      similarityBoost: 0.7,
      style: 0.5,
      useSpeakerBoost: false
    }
  }
];

interface VoicePersonaManagerProps {
  onPersonaSelect?: (persona: VoicePersona) => void;
  onPersonaUpdate?: (persona: VoicePersona) => void;
  selectedPersona?: VoicePersona;
}

export default function VoicePersonaManager({ 
  onPersonaSelect, 
  onPersonaUpdate, 
  selectedPersona 
}: VoicePersonaManagerProps) {
  const [personas, setPersonas] = useState<VoicePersona[]>(DEFAULT_PERSONAS);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPersona, setEditingPersona] = useState<VoicePersona | null>(null);

  const handlePersonaSelect = (persona: VoicePersona) => {
    if (onPersonaSelect) {
      onPersonaSelect(persona);
    }
  };

  const handleEditPersona = (persona: VoicePersona) => {
    setEditingPersona({ ...persona });
    setIsEditing(true);
  };

  const handleSavePersona = () => {
    if (!editingPersona) return;

    const updatedPersonas = personas.map(p => 
      p.voiceName === editingPersona.voiceName ? editingPersona : p
    );
    setPersonas(updatedPersonas);

    if (onPersonaUpdate) {
      onPersonaUpdate(editingPersona);
    }

    setIsEditing(false);
    setEditingPersona(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPersona(null);
  };

  const generateSystemPrompt = (persona: VoicePersona): string => {
    return `
You are ${persona.name} (voice: ${persona.voiceName}), a ${persona.role === 'coach' ? 'sales training coach' : 'business prospect'}.

PERSONALITY: ${persona.personality}

ROLE OBJECTIVES:
${persona.objectives.map(obj => `• ${obj}`).join('\n')}

COMMUNICATION STYLE:
${persona.role === 'coach' ? 
  '• Provide direct, actionable feedback\n• Use industry terminology\n• Reference best practices\n• Maintain professional but encouraging tone' :
  '• Show genuine interest but express realistic concerns\n• Ask pointed questions about ROI and implementation\n• Simulate real business decision-making process\n• Be professional but appropriately skeptical'
}

SAMPLE RESPONSES FOR REFERENCE:
${persona.sampleResponses.map(response => `"${response}"`).join('\n')}

Respond authentically as ${persona.name} would in a real ${persona.role === 'coach' ? 'training session' : 'business meeting'}.
    `.trim();
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-class-purple">🎭 Voice Persona Management</h2>
        <div className="text-sm text-gray-500">
          Configure AI personalities for sales training
        </div>
      </div>

      {/* Persona Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {personas.map((persona) => (
          <div
            key={persona.voiceName}
            className={`border-2 rounded-lg p-6 transition-all cursor-pointer ${
              selectedPersona?.voiceName === persona.voiceName
                ? 'border-class-purple bg-class-pale-purple'
                : 'border-gray-300 hover:border-class-light-purple bg-white'
            }`}
            onClick={() => handlePersonaSelect(persona)}
          >
            {/* Persona Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${
                  persona.role === 'coach' ? 'bg-green-500' : 'bg-blue-500'
                }`}></div>
                <h3 className="text-lg font-bold text-midnight-blue">{persona.name}</h3>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {persona.voiceName}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPersona(persona);
                }}
                className="text-gray-500 hover:text-class-purple"
              >
                ✏️
              </button>
            </div>

            {/* Role Badge */}
            <div className="mb-3">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                persona.role === 'coach' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {persona.role === 'coach' ? '👨‍🏫 Sales Coach' : '👔 Business Prospect'}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-sm mb-4">{persona.description}</p>

            {/* Personality */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-midnight-blue mb-1">Personality:</h4>
              <p className="text-xs text-gray-500">{persona.personality}</p>
            </div>

            {/* Key Objectives */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-midnight-blue mb-2">Key Objectives:</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {persona.objectives.slice(0, 3).map((objective, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-class-purple mr-1">•</span>
                    {objective}
                  </li>
                ))}
                {persona.objectives.length > 3 && (
                  <li className="text-gray-400">...and {persona.objectives.length - 3} more</li>
                )}
              </ul>
            </div>

            {/* Voice Settings Preview */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Stability: {persona.voiceSettings.stability}</span>
                <span>Similarity: {persona.voiceSettings.similarityBoost}</span>
                <span>Style: {persona.voiceSettings.style}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Prompt Generator */}
      {selectedPersona && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-midnight-blue mb-4">
            📝 System Prompt for {selectedPersona.name}
          </h3>
          <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 overflow-auto max-h-64">
            <pre className="whitespace-pre-wrap">{generateSystemPrompt(selectedPersona)}</pre>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              This prompt will be sent to ElevenLabs for voice persona initialization
            </span>
            <button
              onClick={() => navigator.clipboard.writeText(generateSystemPrompt(selectedPersona))}
              className="btn-secondary text-xs"
            >
              📋 Copy Prompt
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && editingPersona && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-midnight-blue">
                Edit {editingPersona.name}
              </h3>
              <button
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-midnight-blue mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editingPersona.name}
                    onChange={(e) => setEditingPersona({
                      ...editingPersona,
                      name: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-midnight-blue mb-1">
                    Voice Name (ElevenLabs)
                  </label>
                  <input
                    type="text"
                    value={editingPersona.voiceName}
                    onChange={(e) => setEditingPersona({
                      ...editingPersona,
                      voiceName: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-midnight-blue mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editingPersona.description}
                  onChange={(e) => setEditingPersona({
                    ...editingPersona,
                    description: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
                />
              </div>

              {/* Personality */}
              <div>
                <label className="block text-sm font-medium text-midnight-blue mb-1">
                  Personality
                </label>
                <textarea
                  value={editingPersona.personality}
                  onChange={(e) => setEditingPersona({
                    ...editingPersona,
                    personality: e.target.value
                  })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-class-purple focus:border-transparent"
                />
              </div>

              {/* Voice Settings */}
              <div>
                <h4 className="text-sm font-medium text-midnight-blue mb-2">Voice Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Stability: {editingPersona.voiceSettings.stability}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editingPersona.voiceSettings.stability}
                      onChange={(e) => setEditingPersona({
                        ...editingPersona,
                        voiceSettings: {
                          ...editingPersona.voiceSettings,
                          stability: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Similarity Boost: {editingPersona.voiceSettings.similarityBoost}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editingPersona.voiceSettings.similarityBoost}
                      onChange={(e) => setEditingPersona({
                        ...editingPersona,
                        voiceSettings: {
                          ...editingPersona.voiceSettings,
                          similarityBoost: parseFloat(e.target.value)
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={handleCancelEdit}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePersona}
                className="btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Instructions */}
      <div className="bg-class-pale-purple rounded-lg p-6">
        <h3 className="font-bold text-class-purple mb-3">🔧 Integration Instructions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-midnight-blue">
          <div>
            <h4 className="font-medium mb-2">In ElevenLabs Dashboard:</h4>
            <ol className="space-y-1 text-sm">
              <li>1. Create Multi-Voice Conversational Agent</li>
              <li>2. Add voices with exact names: <code>coach_marcus</code>, <code>tim</code></li>
              <li>3. Copy system prompt from above</li>
              <li>4. Configure GPT-4, 150-200 token limit</li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium mb-2">Voice Switching Commands:</h4>
            <div className="bg-white rounded p-2 font-mono text-xs">
              <div>"Switch to coach_marcus"</div>
              <div>"Switch to tim"</div>
              <div>"Be coach_marcus now"</div>
              <div>"Act as tim"</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useVoicePersona() {
  const [currentPersona, setCurrentPersona] = useState<VoicePersona>(DEFAULT_PERSONAS[0]);
  const [personas] = useState<VoicePersona[]>(DEFAULT_PERSONAS);

  const switchPersona = (voiceName: string): VoicePersona | null => {
    const persona = personas.find(p => p.voiceName === voiceName);
    if (persona) {
      setCurrentPersona(persona);
      return persona;
    }
    return null;
  };

  const getSystemPrompt = (persona: VoicePersona): string => {
    return `
You are ${persona.name} (voice: ${persona.voiceName}), a ${persona.role === 'coach' ? 'sales training coach' : 'business prospect'}.

PERSONALITY: ${persona.personality}

ROLE OBJECTIVES:
${persona.objectives.map(obj => `• ${obj}`).join('\n')}

Respond authentically as ${persona.name} would in a real ${persona.role === 'coach' ? 'training session' : 'business meeting'}.
    `.trim();
  };

  return {
    currentPersona,
    personas,
    switchPersona,
    getSystemPrompt,
    setCurrentPersona
  };
}