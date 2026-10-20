import React from 'react';
import { 
  Trophy, 
  Play, 
  Users, 
  BookOpen, 
  Medal, 
  Flame, 
  Target, 
  Clock, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Swords,
  GraduationCap,
  Building2,
  ChevronRight
} from 'lucide-react';
import { UserStats, ShsLevel } from '../../types';
import { calculateLevelFromXP } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';
import { useAuth } from '../../utils/AuthContext';

interface DashboardViewProps {
  userStats: UserStats;
  onNavigate: (view: string, subject?: string) => void;
  onOpenAuth: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userStats,
  onNavigate,
  onOpenAuth,
}) => {
  const { isGuest } = useAuth();
  const levelInfo = calculateLevelFromXP(userStats.xp);
  const accuracy = userStats.totalQuestions > 0 
    ? Math.round((userStats.totalCorrect / userStats.totalQuestions) * 100) 
    : 100;

  const currentShsLevel: ShsLevel = userStats.shsLevel || 'SHS 2';

  // Approximate rank position based on XP
  const estimatedRank = Math.max(1, Math.min(250, 150 - Math.floor(userStats.xp / 100)));

  const handleAction = (view: string) => {
    soundEffects.playClick();
    onNavigate(view);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Student Overview Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-600/30 border border-white/20">
                {userStats.username.substring(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                LVL {levelInfo.level}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {isGuest ? 'Guest Scholar' : userStats.username}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold flex items-center gap-1 ${
                  isGuest 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                }`}>
                  <GraduationCap className="w-3.5 h-3.5" />
                  {isGuest ? 'Guest Mode' : currentShsLevel}
                </span>
                <button
                  onClick={onOpenAuth}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                >
                  {isGuest ? 'Sign In / Register' : 'Edit Profile'}
                </button>
              </div>
              <p className="text-sm font-semibold text-indigo-400 flex items-center gap-1.5 mt-0.5">
                <Medal className="w-4 h-4 text-amber-400" />
                {isGuest ? 'Temporary Session Scholar • Practice & Explore' : `${levelInfo.rankTitle} • Ghanaian Senior High Scholar`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isGuest 
                  ? 'Session practice active • Sign in to save XP and appear on leaderboards'
                  : `Estimated Ranking: #${estimatedRank} • ${userStats.unlockedBadgeIds?.length || 1} Badges Earned`}
              </p>
            </div>
          </div>

          {/* XP Progress Bar Component */}
          <div className="w-full md:w-72 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-300">Level {levelInfo.level} Progress</span>
              <span className="text-indigo-400">{levelInfo.currentLevelXp} / {levelInfo.xpNeededForNext} XP</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressPercent}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
              <span>{levelInfo.progressPercent}% to Level {levelInfo.level + 1}</span>
              <span className="text-amber-400 font-bold">{userStats.xp} Total XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guest Mode Notice & Action Banner */}
      {isGuest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-white">
                Browsing in Guest Mode (Temporary Session)
              </div>
              <p className="text-xs text-slate-300">
                You have unrestricted access to practice curriculum quizzes and NSMQ rounds. Create an account or sign in to save your XP, earn badges, and join the School Leaderboard!
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAuth}
            className="self-stretch sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0 text-center"
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      {/* Featured Inter-School Challenge Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/35 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                School Challenge
              </span>
              <span className="text-xs text-slate-400">• Inter-School Championship</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
              Represent <span className="text-amber-400">{userStats.schoolName || 'Your Senior High School'}</span>
            </h2>
            <p className="text-xs text-slate-300">
              Your quiz and battle XP contributes directly to your school's standing on the National Leaderboard!
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAction('school-challenge')}
          className="self-stretch sm:self-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span>View School Leaderboard</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Practice Topics */}
        <button
          onClick={() => handleAction('practice')}
          className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/25 transition hover:scale-[1.02] flex items-center justify-between cursor-pointer"
        >
          <div className="text-left">
            <span className="text-xs uppercase font-extrabold text-blue-200 block mb-1">Curriculum Flow</span>
            <div className="text-lg font-black">Choose Topic & Quiz</div>
            <div className="text-xs text-indigo-100 mt-1">Subject → Topic → Level ({currentShsLevel})</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 fill-current" />
          </div>
        </button>

        {/* Dedicated NSMQ Practice */}
        <button
          onClick={() => handleAction('nsmq')}
          className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] flex items-center justify-between cursor-pointer"
        >
          <div className="text-left">
            <span className="text-xs uppercase font-extrabold text-amber-950 block mb-1">Competition Prep</span>
            <div className="text-lg font-black">NSMQ Practice</div>
            <div className="text-xs text-slate-900 font-semibold mt-1">Speed, Problems & Riddles</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center text-slate-950">
            <Flame className="w-6 h-6 fill-current" />
          </div>
        </button>

        {/* 1v1 Challenge a Friend */}
        <button
          onClick={() => handleAction('multiplayer')}
          className="p-5 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-bold shadow-lg shadow-purple-600/25 transition hover:scale-[1.02] flex items-center justify-between cursor-pointer"
        >
          <div className="text-left">
            <span className="text-xs uppercase font-extrabold text-purple-200 block mb-1">Live Multiplayer</span>
            <div className="text-lg font-black">Challenge Friend</div>
            <div className="text-xs text-purple-100 mt-1">Synchronized 1v1 Room Battle</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </button>

        {/* Leaderboard Standings */}
        <button
          onClick={() => handleAction('leaderboard')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-white font-bold transition hover:scale-[1.02] flex items-center justify-between cursor-pointer"
        >
          <div className="text-left">
            <span className="text-xs uppercase font-extrabold text-amber-400 block mb-1">Rankings</span>
            <div className="text-lg font-black">Leaderboard</div>
            <div className="text-xs text-slate-400 mt-1">Track top student scholars</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Core Stats Metric Grid (Level, XP, Daily Streak, Quizzes Played, Accuracy, Multiplayer Wins) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Level</span>
            <Medal className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{levelInfo.level}</div>
          <span className="text-[11px] text-indigo-400 font-semibold">{levelInfo.rankTitle}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total XP</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{userStats.xp.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400">Career XP points</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-orange-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Daily Streak</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-400 flex items-center gap-1">
            {userStats.currentStreak || 1} 🔥
          </div>
          <span className="text-[11px] text-slate-400">Best: {userStats.bestStreak || 1} days</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quizzes</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{userStats.gamesPlayed}</div>
          <span className="text-[11px] text-slate-400">{userStats.wins} Victories</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-300">{accuracy}%</div>
          <span className="text-[11px] text-slate-400">{userStats.totalCorrect} / {userStats.totalQuestions} answers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">1v1 Wins</span>
            <Swords className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {userStats.multiplayerWins || 0}
          </div>
          <span className="text-[11px] text-slate-400">{userStats.multiplayerLosses || 0} Losses in duels</span>
        </div>
      </div>

      {/* Recent Activity / Quiz History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Recent Quiz & Practice History
          </h2>
          <span className="text-xs text-slate-400">Synced to student account</span>
        </div>

        {userStats.recentGames.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
            <p className="text-sm text-slate-400">No quiz records yet. Pick a topic to start practicing!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {userStats.recentGames.slice(0, 6).map((item) => {
              const passed = item.score / item.totalQuestions >= 0.7;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {item.subject}
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.difficulty}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{item.date} • {item.mode}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-extrabold text-white">
                      {item.score} / {item.totalQuestions}
                    </div>
                    <div className="text-xs font-semibold text-indigo-400">
                      +{item.xpEarned} XP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dashboard Footer with Creator Credit */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>SHS Science Hub • Ghana High School Curriculum</span>
        <span>Created & Developed by <strong className="text-indigo-400 font-semibold">Avatar</strong></span>
      </div>
    </div>
  );
};
