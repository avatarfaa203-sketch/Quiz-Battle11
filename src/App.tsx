/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserStats, Subject, Difficulty, Question, Badge } from './types';
import { loadUserStats } from './utils/storage';
import { Navbar } from './components/Navbar';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { AuthModal } from './components/AuthModal';
import { AdminModal } from './components/AdminModal';
import { BadgeCelebrationModal } from './components/BadgeCelebrationModal';
import { HomeView } from './components/views/HomeView';
import { DashboardView } from './components/views/DashboardView';
import { QuizView } from './components/views/QuizView';
import { ResultsView } from './components/views/ResultsView';
import { MultiplayerView } from './components/views/MultiplayerView';
import { LeaderboardView } from './components/views/LeaderboardView';
import { ProfileView } from './components/views/ProfileView';
import { AdminView } from './components/views/AdminView';
import { NsmqPracticeView } from './components/views/NsmqPracticeView';
import { DailyChallengeView } from './components/views/DailyChallengeView';
import { GraduationCap } from 'lucide-react';

function MainPlatform({
  userStats,
  onStatsUpdated,
}: {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    isOpen: boolean;
    badges: Badge[];
    leveledUp: boolean;
    newLevel: number;
  }>({
    isOpen: false,
    badges: [],
    leveledUp: false,
    newLevel: 1,
  });

  // Recent Quiz / Battle Result
  const [lastResult, setLastResult] = useState<{
    subject: Subject;
    difficulty: Difficulty;
    score: number;
    totalQuestions: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    newBadges: Badge[];
    questions: Question[];
    userAnswers: (string | null)[];
    mode: 'battle' | 'practice';
  } | null>(null);

  const handleNavigate = (view: string, subject?: string) => {
    if (!isAuthenticated && !isGuest) return;
    if (subject) {
      setSelectedSubject(subject as Subject);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinishQuiz = (result: {
    subject: Subject;
    difficulty: Difficulty;
    score: number;
    totalQuestions: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    newBadges: Badge[];
    questions: Question[];
    userAnswers: (string | null)[];
    mode: 'battle' | 'practice';
  }) => {
    setLastResult(result);
    // Reload user stats
    const updated = loadUserStats();
    onStatsUpdated(updated);

    // If new badges or level up occurred, open celebration
    if (result.leveledUp || result.newBadges.length > 0) {
      setCelebrationData({
        isOpen: true,
        badges: result.newBadges,
        leveledUp: result.leveledUp,
        newLevel: result.newLevel,
      });
    }

    setCurrentView('results');
  };

  // 1. Loading screen while authenticating / validating active session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 animate-pulse">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">SHS Science Hub</h2>
            <p className="text-xs text-indigo-300 font-medium">Verifying student credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Compulsory Authentication: Unauthenticated visitors MUST sign in or create an account (or continue as guest)
  if (!isAuthenticated && !isGuest) {
    return <AuthScreen userStats={userStats} onStatsUpdated={onStatsUpdated} />;
  }

  // 3. Authenticated: Full access to the learning platform
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
      {/* Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userStats={userStats}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {currentView === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            userStats={userStats}
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'daily-challenge' && (
          <DailyChallengeView
            userStats={userStats}
            onStatsUpdated={onStatsUpdated}
            onCancel={() => handleNavigate('dashboard')}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'play' && (
          <QuizView
            mode="battle"
            initialSubject={selectedSubject}
            userStats={userStats}
            onFinishQuiz={handleFinishQuiz}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'practice' && (
          <QuizView
            mode="practice"
            initialSubject={selectedSubject}
            userStats={userStats}
            onFinishQuiz={handleFinishQuiz}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'nsmq' && (
          <NsmqPracticeView
            userStats={userStats}
            onFinishQuiz={handleFinishQuiz}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'multiplayer' && (
          <MultiplayerView
            userStats={userStats}
            onStatsUpdated={onStatsUpdated}
            onCancel={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'results' && lastResult && (
          <ResultsView
            result={lastResult}
            onPlayAgain={() => handleNavigate(lastResult.mode === 'practice' ? 'practice' : 'play')}
            onTryAnotherSubject={() => {
              setSelectedSubject(null);
              handleNavigate('play');
            }}
            onGoToDashboard={() => handleNavigate('dashboard')}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView
            userStats={userStats}
            initialMode="students"
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'school-challenge' && (
          <LeaderboardView
            userStats={userStats}
            initialMode="schools"
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'profile' && (
          <ProfileView
            userStats={userStats}
            onStatsUpdated={onStatsUpdated}
            onOpenAdmin={() => setAdminModalOpen(true)}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentView === 'admin' && (
          <AdminView onBack={() => handleNavigate('profile')} />
        )}
      </main>

      {/* Global Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        userStats={userStats}
        onStatsUpdated={onStatsUpdated}
      />

      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSuccess={() => handleNavigate('admin')}
      />

      <BadgeCelebrationModal
        isOpen={celebrationData.isOpen}
        onClose={() => setCelebrationData((prev) => ({ ...prev, isOpen: false }))}
        badges={celebrationData.badges}
        leveledUp={celebrationData.leveledUp}
        newLevel={celebrationData.newLevel}
      />
    </div>
  );
}

export default function App() {
  const [userStats, setUserStats] = useState<UserStats>(() => loadUserStats());

  const handleStatsUpdated = (newStats: UserStats) => {
    setUserStats({ ...newStats });
  };

  return (
    <AuthProvider onUserStatsLoaded={handleStatsUpdated}>
      <MainPlatform userStats={userStats} onStatsUpdated={handleStatsUpdated} />
    </AuthProvider>
  );
}
