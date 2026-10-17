import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Flame, Target, Sparkles, User } from 'lucide-react';
import { LeaderboardEntry, UserStats } from '../../types';
import { calculateLevelFromXP } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';

interface LeaderboardViewProps {
  userStats: UserStats;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ userStats }) => {
  const [tab, setTab] = useState<'global' | 'weekly'>('global');
  const [globalList, setGlobalList] = useState<LeaderboardEntry[]>([]);
  const [weeklyList, setWeeklyList] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const levelInfo = calculateLevelFromXP(userStats.xp);
  const userAccuracy = userStats.totalQuestions > 0 
    ? Math.round((userStats.totalCorrect / userStats.totalQuestions) * 100) 
    : 100;

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const res = await fetch('/api/leaderboards');
        if (res.ok) {
          const data = await res.json();
          setGlobalList(data.global || []);
          setWeeklyList(data.weekly || []);
        }
      } catch {
        // Fallback gracefully if network is offline
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboards();
  }, []);

  const currentList = tab === 'global' ? globalList : weeklyList;

  // Compute where the user fits in the leaderboard
  let userRank = 1;
  for (const entry of currentList) {
    if (userStats.xp < entry.xp) {
      userRank = entry.rank + 1;
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" /> Competitive Academic Hall of Fame
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Leaderboards</h1>
        <p className="text-sm text-slate-400">
          Rankings are calibrated based on total battle XP, victory count, and exam-level accuracy.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-xs">
          <button
            onClick={() => {
              soundEffects.playClick();
              setTab('global');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              tab === 'global'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Global All-Time
          </button>
          <button
            onClick={() => {
              soundEffects.playClick();
              setTab('weekly');
            }}
            className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              tab === 'weekly'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Weekly Sprint
          </button>
        </div>
      </div>

      {/* Current User Standings Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-md">
            #{userRank}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">{userStats.username}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                You
              </span>
            </div>
            <p className="text-xs text-indigo-300 font-medium mt-0.5">
              Level {levelInfo.level} • {levelInfo.rankTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-center text-xs">
          <div>
            <span className="text-slate-400 block font-semibold">XP</span>
            <span className="text-base font-extrabold text-amber-400">{userStats.xp}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Wins</span>
            <span className="text-base font-extrabold text-emerald-400">{userStats.wins}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold">Accuracy</span>
            <span className="text-base font-extrabold text-purple-300">{userAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* Leaderboard Table Card */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Table Head */}
        <div className="grid grid-cols-12 px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
          <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
          <div className="col-span-6 sm:col-span-5">Contender</div>
          <div className="col-span-2 text-right">XP</div>
          <div className="col-span-2 text-right">Wins</div>
          <div className="hidden sm:block sm:col-span-2 text-right">Accuracy</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-800/80">
          {currentList.map((entry) => {
            const isTop3 = entry.rank <= 3;
            let rankBadge = (
              <span className="font-bold text-slate-400 text-sm">#{entry.rank}</span>
            );

            if (entry.rank === 1) {
              rankBadge = (
                <div className="w-7 h-7 mx-auto rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-400" />
                </div>
              );
            } else if (entry.rank === 2) {
              rankBadge = (
                <div className="w-7 h-7 mx-auto rounded-full bg-slate-300/20 text-slate-200 border border-slate-300/40 flex items-center justify-center font-black text-xs">
                  2
                </div>
              );
            } else if (entry.rank === 3) {
              rankBadge = (
                <div className="w-7 h-7 mx-auto rounded-full bg-amber-700/20 text-amber-500 border border-amber-700/40 flex items-center justify-center font-black text-xs">
                  3
                </div>
              );
            }

            return (
              <div
                key={entry.rank}
                className={`grid grid-cols-12 px-5 py-3.5 items-center transition ${
                  isTop3 ? 'bg-indigo-950/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="col-span-2 sm:col-span-1 text-center">{rankBadge}</div>

                <div className="col-span-6 sm:col-span-5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                    {entry.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                      {entry.username}
                      {entry.rank === 1 && (
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Level {entry.level}
                    </span>
                  </div>
                </div>

                <div className="col-span-2 text-right font-extrabold text-amber-400 text-sm">
                  {entry.xp.toLocaleString()}
                </div>

                <div className="col-span-2 text-right font-bold text-emerald-400 text-sm">
                  {entry.wins}
                </div>

                <div className="hidden sm:block sm:col-span-2 text-right font-bold text-purple-300 text-sm">
                  {entry.accuracy}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
