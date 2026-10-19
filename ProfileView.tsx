import React, { useState } from 'react';
import { 
  Award, 
  Shield, 
  Edit3, 
  Lock, 
  Check, 
  Sparkles, 
  ShieldAlert,
  GraduationCap,
  Mail,
  LogOut,
  ChevronRight,
  BookOpen,
  Info
} from 'lucide-react';
import { Badge, UserStats, ShsLevel } from '../../types';
import { ALL_BADGES } from '../../data/badges';
import { calculateLevelFromXP, updateUsername, updateShsLevel } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';
import { useAuth } from '../../utils/AuthContext';

interface ProfileViewProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
  onOpenAdmin: () => void;
  onOpenAuth?: () => void;
}

const SHS_LEVELS: { id: ShsLevel; label: string; desc: string }[] = [
  { id: 'SHS 1', label: 'SHS 1', desc: 'First Year Foundation' },
  { id: 'SHS 2', label: 'SHS 2', desc: 'Second Year Electives & Core' },
  { id: 'SHS 3', label: 'SHS 3', desc: 'Final Year WASSCE Prep' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  userStats,
  onStatsUpdated,
  onOpenAdmin,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, logout, updateProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.username || userStats.username);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);

  const currentShsLevel: ShsLevel = user?.shsLevel || userStats.shsLevel || 'SHS 2';

  const levelInfo = calculateLevelFromXP(userStats.xp);
  const accuracy = userStats.totalQuestions > 0 
    ? Math.round((userStats.totalCorrect / userStats.totalQuestions) * 100) 
    : 100;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    soundEffects.playClick();
    if (isAuthenticated) {
      await updateProfile({ username: nameInput.trim() });
    }
    const updated = updateUsername(nameInput.trim());
    onStatsUpdated(updated);
    setEditingName(false);
  };

  const handleLevelChange = async (newLevel: ShsLevel) => {
    soundEffects.playClick();
    setIsUpdatingLevel(true);
    if (isAuthenticated) {
      await updateProfile({ shsLevel: newLevel });
    }
    const updated = updateShsLevel(newLevel);
    onStatsUpdated(updated);
    setIsUpdatingLevel(false);
  };

  const unlockedSet = new Set(userStats.unlockedBadgeIds || []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar Icon */}
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-indigo-600/30 border border-white/20">
              {userStats.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider shadow">
              LVL {levelInfo.level}
            </div>
          </div>

          {/* Name & Academic Status */}
          <div className="flex-1 space-y-1.5">
            {editingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 max-w-xs">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  maxLength={20}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-indigo-500 text-white font-bold text-lg outline-none w-full"
                  autoFocus
                />
                <button
                  type="submit"
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  {userStats.username}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(userStats.username);
                    setEditingName(true);
                  }}
                  title="Edit username"
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5 text-xs">
              <span className="font-bold text-indigo-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                {levelInfo.rankTitle}
              </span>
              <span className="text-slate-500">•</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-extrabold flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                {currentShsLevel} Scholar
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              {isAuthenticated ? (
                <>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Synced: {user?.email}
                  </span>
                  <button
                    onClick={logout}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-medium">Guest Mode (Local Progress)</span>
                  {onOpenAuth && (
                    <button
                      onClick={onOpenAuth}
                      className="px-2.5 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition cursor-pointer"
                    >
                      Sign In / Register
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* XP Progress Bar */}
            <div className="pt-3 max-w-md">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-300">Level {levelInfo.level} Mastery</span>
                <span className="text-indigo-400">{levelInfo.currentLevelXp} / {levelInfo.xpNeededForNext} XP</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${levelInfo.progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SHS Level Selection Settings */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              SHS Academic Level Settings
            </h2>
            <p className="text-xs text-slate-400">
              Select your academic year. All topics and practice quizzes will adapt to this Ghana SHS curriculum tier.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs font-black">
            Active: {currentShsLevel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {SHS_LEVELS.map((lvl) => {
            const isCurrent = currentShsLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => handleLevelChange(lvl.id)}
                className={`p-4 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                  isCurrent
                    ? 'bg-gradient-to-br from-indigo-950/60 to-slate-900 border-indigo-500 text-white ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold">{lvl.label}</span>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{lvl.desc}</p>
                <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1 mt-1">
                  {isCurrent ? 'Current Selection' : 'Switch to ' + lvl.id}
                  <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Academic Statistics Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Career Academic Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Quizzes</span>
            <span className="text-xl sm:text-2xl font-black text-white">{userStats.gamesPlayed}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Victories</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{userStats.wins}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Defeats</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400">{userStats.losses}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Accuracy</span>
            <span className="text-xl sm:text-2xl font-black text-purple-300">{accuracy}%</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Daily Streak</span>
            <span className="text-xl sm:text-2xl font-black text-orange-400">{userStats.currentStreak || 1} 🔥</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Best Streak</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-400">{userStats.bestStreak || 1} d</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">1v1 Wins</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">{userStats.multiplayerWins || 0}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block font-semibold mb-1">Total XP</span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">{userStats.xp.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Badges Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              Prestige Badges & Medals
            </h2>
            <p className="text-xs text-slate-400">Unlock medals through academic mastery, speed, and subject precision</p>
          </div>
          <span className="text-xs font-bold text-indigo-400">
            {unlockedSet.size} / {ALL_BADGES.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = unlockedSet.has(badge.id);
            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/40 shadow-md hover:border-indigo-500'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-60 hover:opacity-80'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    isUnlocked
                      ? 'bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isUnlocked ? (
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white truncate">{badge.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 shrink-0">
                      {badge.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                  <span className="text-[10px] font-semibold text-indigo-400 block mt-2">
                    Requirement: {badge.requirement}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* About & Creator Credit Footer Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="space-y-1 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2 text-white font-extrabold text-sm">
            <span>SHS Science Hub</span>
            <span className="text-[10px] text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 font-bold">
              v2.5
            </span>
          </div>
          <p className="text-indigo-300 font-medium">Learn • Practice • Challenge • Achieve</p>
          <p className="text-slate-400 text-[11px] pt-0.5">
            Dedicated Ghanaian SHS science, mathematics, and NSMQ academic preparation platform.
          </p>
        </div>

        <div className="text-center sm:text-right shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300 font-medium text-xs">
            <span>Created & Developed by <strong className="text-indigo-400 font-bold">Avatar</strong></span>
          </div>
        </div>
      </div>

      {/* Admin Panel Trigger */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldAlert className="w-4 h-4 text-indigo-400" />
          <span>Curriculum Admin Portal (Passcode Protected)</span>
        </div>
        <button
          onClick={onOpenAdmin}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold transition cursor-pointer"
        >
          Manage Questions
        </button>
      </div>
    </div>
  );
};
