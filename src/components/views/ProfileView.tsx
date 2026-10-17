import React, { useState } from 'react';
import { 
  User, 
  Award, 
  Shield, 
  Flame, 
  Target, 
  Zap, 
  TrendingUp, 
  Edit3, 
  Lock, 
  Check, 
  Sparkles, 
  ShieldAlert,
  GraduationCap
} from 'lucide-react';
import { Badge, UserStats } from '../../types';
import { ALL_BADGES } from '../../data/badges';
import { calculateLevelFromXP, updateUsername, saveUserStats } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';

interface ProfileViewProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
  onOpenAdmin: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userStats,
  onStatsUpdated,
  onOpenAdmin,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userStats.username);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const levelInfo = calculateLevelFromXP(userStats.xp);
  const accuracy = userStats.totalQuestions > 0 
    ? Math.round((userStats.totalCorrect / userStats.totalQuestions) * 100) 
    : 100;

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    soundEffects.playClick();
    const updated = updateUsername(nameInput.trim());
    onStatsUpdated(updated);
    setEditingName(false);
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

          {/* Name & Title */}
          <div className="flex-1 space-y-1">
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

            <p className="text-sm font-bold text-indigo-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Shield className="w-4 h-4 text-indigo-400" />
              {levelInfo.rankTitle}
            </p>

            <p className="text-xs text-slate-400 pt-1">
              {unlockedSet.size} of {ALL_BADGES.length} Badges Unlocked • Member of Quiz Battle Academy
            </p>

            {/* XP Progress */}
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

      {/* Full Statistics Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Career Academic Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Games Played</span>
            <span className="text-2xl font-black text-white">{userStats.gamesPlayed}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Victories</span>
            <span className="text-2xl font-black text-emerald-400">{userStats.wins}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Defeats</span>
            <span className="text-2xl font-black text-rose-400">{userStats.losses}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Accuracy</span>
            <span className="text-2xl font-black text-purple-300">{accuracy}%</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Total XP</span>
            <span className="text-2xl font-black text-amber-400">{userStats.xp}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-xs text-slate-400 block font-semibold mb-1">Best Streak</span>
            <span className="text-2xl font-black text-indigo-400">{userStats.bestStreak} 🔥</span>
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
            <p className="text-xs text-slate-400">Unlock medals through battle triumphs, speed, and subject precision</p>
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
