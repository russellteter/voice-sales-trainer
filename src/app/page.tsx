'use client';

import { useState, useEffect } from 'react';
import { useAuth, LoginForm } from '@/components/AuthProvider';
import ScenarioDashboard, { TrainingScenario } from '@/components/ScenarioDashboard';
import VoiceConversationInterface from '@/components/VoiceConversationInterface';
import VoiceConversationInterfaceReal from '@/components/VoiceConversationInterfaceReal';
import SessionFeedback from '@/components/SessionFeedback';
import SessionPlayback from '@/components/SessionPlayback';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import AdminDashboard from '@/components/AdminDashboard';
import ElevenLabsTest from '@/components/ElevenLabsTest';
import { UserProfile } from '@/components/AuthProvider';

type AppScreen = 'dashboard' | 'conversation' | 'feedback' | 'analytics' | 'admin' | 'profile' | 'playback' | 'test';

interface SessionRecording {
  id: string;
  scenarioTitle: string;
  duration: number;
  timestamp: Date;
  audioUrl: string;
  transcript: any[];
  feedbackMarkers: any[];
  score: number;
}

export default function VoiceSalesTrainerApp() {
  const { user, loading } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [selectedRecording, setSelectedRecording] = useState<SessionRecording | null>(null);

  // Mock session recordings for demonstration
  const mockRecordings: SessionRecording[] = [
    {
      id: '1',
      scenarioTitle: 'Cold Outreach Introduction',
      duration: 420,
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      audioUrl: '/mock-audio.mp3',
      transcript: [
        {
          id: '1',
          speaker: 'user',
          text: 'Hi John, this is Sarah from TechCorp. I understand you downloaded our sales automation guide last week?',
          startTime: 5,
          endTime: 12,
          confidence: 0.95
        },
        {
          id: '2',
          speaker: 'ai',
          text: 'Yes, I did. But I have to say, I\'m pretty busy right now and we\'re not really looking to change our current system.',
          startTime: 15,
          endTime: 23,
          confidence: 1.0
        }
      ],
      feedbackMarkers: [
        {
          id: '1',
          timestamp: 8,
          type: 'positive',
          category: 'Opening',
          message: 'Great personalized opening with reference to their interest',
          details: 'Referencing the downloaded guide shows you did your research'
        },
        {
          id: '2',
          timestamp: 25,
          type: 'improvement',
          category: 'Objection Handling',
          message: 'Consider acknowledging the objection before responding',
          details: 'Use "I understand you\'re busy" before proceeding with value prop'
        }
      ],
      score: 78
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-class-pale-purple flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-class-purple mx-auto mb-4"></div>
          <p className="text-midnight-blue">Loading Voice Sales Trainer...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onSuccess={() => window.location.reload()} />;
  }

  const handleScenarioSelect = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setCurrentScreen('conversation');
  };

  const handleSessionComplete = (data: any) => {
    setSessionData(data);
    setCurrentScreen('feedback');
  };

  const handleResetToScenarios = () => {
    setCurrentScreen('dashboard');
    setSelectedScenario(null);
    setSessionData(null);
    setSelectedRecording(null);
  };

  const NavigationHeader = () => (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-black text-class-purple">
              Voice Sales Trainer
            </div>
            <div className="text-sm text-dark-gray">by Class</div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <button
              onClick={() => setCurrentScreen('dashboard')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentScreen === 'dashboard' 
                  ? 'text-class-purple bg-class-pale-purple' 
                  : 'text-dark-gray hover:text-class-purple'
              }`}
            >
              🎯 Scenarios
            </button>
            <button
              onClick={() => setCurrentScreen('analytics')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentScreen === 'analytics' 
                  ? 'text-class-purple bg-class-pale-purple' 
                  : 'text-dark-gray hover:text-class-purple'
              }`}
            >
              📊 Analytics
            </button>
            <button
              onClick={() => setCurrentScreen('test')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentScreen === 'test' 
                  ? 'text-class-purple bg-class-pale-purple' 
                  : 'text-dark-gray hover:text-class-purple'
              }`}
            >
              🧪 Voice Test
            </button>
            {(user.permissions?.includes('system_admin') || user.permissions?.includes('manage_content')) ? (
              <button
                onClick={() => setCurrentScreen('admin')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentScreen === 'admin' 
                    ? 'text-class-purple bg-class-pale-purple' 
                    : 'text-dark-gray hover:text-class-purple'
                }`}
              >
                ⚙️ Admin
              </button>
            ) : null}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-dark-gray">
              Welcome, {user.firstName}
            </div>
            <button
              onClick={() => setCurrentScreen('profile')}
              className={`p-2 rounded-full transition-colors ${
                currentScreen === 'profile' 
                  ? 'text-class-purple bg-class-pale-purple' 
                  : 'text-dark-gray hover:text-class-purple'
              }`}
            >
              👤
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-lightest-purple">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard - Scenario Selection */}
        {currentScreen === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-class-purple mb-2">
                Choose Your Training Scenario
              </h1>
              <p className="text-midnight-blue">
                Select a scenario to practice your sales skills with AI-powered role-play
              </p>
            </div>
            <ScenarioDashboard 
              onScenarioSelect={handleScenarioSelect}
              selectedScenario={selectedScenario}
            />
            
            {/* Recent Sessions */}
            {mockRecordings.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-class-purple mb-6">Recent Sessions</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {mockRecordings.map(recording => (
                    <div key={recording.id} className="card hover:shadow-xl transition-shadow cursor-pointer"
                         onClick={() => {
                           setSelectedRecording(recording);
                           setCurrentScreen('playback');
                         }}>
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-midnight-blue">{recording.scenarioTitle}</h3>
                        <span className="text-sm text-class-purple font-bold">{recording.score}%</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-middle-gray">
                        <span>{Math.floor(recording.duration / 60)}m {recording.duration % 60}s</span>
                        <span>{recording.timestamp.toLocaleDateString()}</span>
                      </div>
                      <div className="mt-4">
                        <button className="btn-primary text-sm py-2 px-4">
                          🔄 Review Session
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Voice Conversation Interface */}
        {currentScreen === 'conversation' && selectedScenario && (
          <VoiceConversationInterfaceReal
            scenario={selectedScenario}
            onComplete={handleSessionComplete}
            onReset={handleResetToScenarios}
          />
        )}

        {/* ElevenLabs Test Interface */}
        {currentScreen === 'test' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-class-purple mb-2">
                Voice Integration Testing
              </h1>
              <p className="text-midnight-blue">
                Test your ElevenLabs API integration and troubleshoot voice issues
              </p>
            </div>
            <ElevenLabsTest />
          </div>
        )}

        {/* Session Feedback */}
        {currentScreen === 'feedback' && sessionData && (
          <SessionFeedback
            sessionData={sessionData}
            onNewSession={handleResetToScenarios}
            onReplaySession={() => setCurrentScreen('conversation')}
          />
        )}

        {/* Session Playback */}
        {currentScreen === 'playback' && selectedRecording && (
          <SessionPlayback
            recording={selectedRecording}
            onClose={handleResetToScenarios}
          />
        )}

        {/* Analytics Dashboard */}
        {currentScreen === 'analytics' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-class-purple mb-2">
                Performance Analytics
              </h1>
              <p className="text-midnight-blue">
                Track your progress and identify areas for improvement
              </p>
            </div>
            <AnalyticsDashboard sessions={[]} />
          </div>
        )}

        {/* Admin Dashboard */}
        {currentScreen === 'admin' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-class-purple mb-2">
                Admin Dashboard
              </h1>
              <p className="text-midnight-blue">
                Manage scenarios, users, and system settings
              </p>
            </div>
            <AdminDashboard />
          </div>
        )}

        {/* User Profile */}
        {currentScreen === 'profile' && (
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-class-purple mb-2">
                User Profile
              </h1>
              <p className="text-midnight-blue">
                Manage your account settings and preferences
              </p>
            </div>
            <UserProfile />
          </div>
        )}
      </main>

      {/* Quick Action Floating Button */}
      {currentScreen !== 'conversation' && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className="btn-primary rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
          >
            🎯 Quick Practice
          </button>
        </div>
      )}
    </div>
  );
}