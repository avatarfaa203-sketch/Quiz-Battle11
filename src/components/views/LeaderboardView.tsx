import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Target, 
  Sparkles, 
  Building2, 
  Users, 
  GraduationCap, 
  ShieldCheck, 
  Award,
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { LeaderboardEntry, SchoolLeaderboardEntry, StudentSchoolStats, UserStats } from '../../types';
import { calculateLevelFromXP, getStoredAuthToken } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';
import { useAuth } from '../../utils/AuthContext';

interface LeaderboardViewProps {
  userStats: UserStats;
  initialMode?: 'students' | 'schools';
  onOpenAuth?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ 
  userStats, 
  initialMode = 'students',
  onOpenAuth
}) => {
  const { isGuest } = useAuth();
  const [mainMode, setMainMode] = useState<'students' | 'schools'>(initialMode);
  const [studentTab, setStudentTab] = useState<'global' | 'weekly'>('global');

  const [globalList, setGlobalList] = useState<LeaderboardEntry[]>([]);
  const [weeklyList, setWeeklyList] = useState<LeaderboardEntry[]>([]);
  const [schoolList, setSchoolList] = useState<SchoolLeaderboardEntry[]>([]);
  const [serverUserRank, setServerUserRank] = useState<number | null>(null);
  const [userSchoolStats, setUserSchoolStats] = useState<StudentSchoolStats | null>(null);
  const [loading, setLoading] = useState(true);

  const levelInfo = calculateLevelFromXP(userStats.xp);
  const userAccuracy = userStats.totalQuestions > 0 
    ? Math.round((userStats.totalCorrect / userStats.totalQuestions) * 100) 
    : 100;

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        const token = getStoredAuthToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/leaderboards', { headers });
        if (res.ok) {
          const data = await res.json();
          setGlobalList(data.global || []);
          setWeeklyList(data.weekly || []);
          setSchoolList(data.schools || []);
          if (typeof data.currentUserRank === 'number') {
            setServerUserRank(data.currentUserRank);
          }
          if (data.userSchoolStats) {
            setUserSchoolStats(data.userSchoolStats);
          }
        }
      } catch {
        // Fallback gracefully if network is offline
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboards();
  }, [userStats.xp, userStats.wins]);

  const currentStudentList = studentTab === 'global' ? globalList : weeklyList;

  // Compute where the user fits in the student leaderboard if server didn't specify
  let userRankDisplay = '–';
  if (isGuest) {
    userRankDisplay = '–';
  } else if (serverUserRank) {
    userRankDisplay = `#${serverUserRank}`;
  } else if (currentStudentList.length > 0) {
    let rank = 1;
    for (const entry of currentStudentList) {
      if (userStats.xp < entry.xp) {
        rank = entry.rank + 1;
      }
    }
    userRankDisplay = `#${rank}`;
  } else if (userStats.xp > 0) {
    userRankDisplay = '#1';
  }

  // Current student's school info
  const registeredSchool = userStats.schoolName || userSchoolStats?.schoolName || 'Senior High School';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" /> Competitive Academic Hall of Fame
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">
          {mainMode === 'schools' ? 'School Challenge Championship' : 'Student Leaderboards'}
        </h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          {mainMode === 'schools'
            ? 'Inter-school competition — Coming Soon. Registered students will represent their Senior High School in Ghana’s premier academic championship.'
            : 'Rankings calibrated on curriculum quiz mastery, battle victories, and academic accuracy.'}
        </p>
      </div>

      {/* Guest Mode Notice & Sign-In Call to Action */}
      {isGuest && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-white">
                Browsing Leaderboard in Guest Mode
              </div>
              <p className="text-xs text-slate-300">
                Guests do not appear on the student leaderboard and do not contribute points to school rankings. Sign in or create an account to get ranked and represent your school!
              </p>
            </div>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="self-stretch sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0 text-center"
            >
              Sign In / Get Ranked
            </button>
          )}
        </div>
      )}

      {/* Main Mode Toggle: Student Leaderboard vs School Leaderboard */}
      <div className="flex justify-center">
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-md shadow-lg">
          <button
            onClick={() => {
              soundEffects.playClick();
              setMainMode('students');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-2 ${
              mainMode === 'students'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student Leaderboard</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setMainMode('schools');
            }}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mainMode === 'schools'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>School Challenge</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-extrabold uppercase border border-amber-500/40">
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODE 1: STUDENT LEADERBOARD                                    */}
      {/* ============================================================== */}
      {mainMode === 'students' && (
        <div className="space-y-6">
          {/* Sub-Tabs: Global All-Time vs Weekly Sprint */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-900/90 border border-slate-800 w-full max-w-xs">
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setStudentTab('global');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  studentTab === 'global'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Global All-Time
              </button>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  setStudentTab('weekly');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                  studentTab === 'weekly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Weekly Sprint
              </button>
            </div>
          </div>

          {/* Current Student Standings Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black shadow-md ${
                isGuest 
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 text-xs font-black' 
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-base'
              }`}>
                {isGuest ? 'GUEST' : userRankDisplay}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base">
                    {isGuest ? 'Guest Scholar' : userStats.username}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isGuest 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {isGuest ? 'Guest (Unranked)' : 'You'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium mt-0.5">
                  <span>Level {levelInfo.level}</span>
                  <span>•</span>
                  <span className="text-amber-300 font-semibold">
                    {isGuest ? 'Unregistered • Session Only' : registeredSchool}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-center text-xs">
              <div>
                <span className="text-slate-400 block font-semibold">{isGuest ? 'Session XP' : 'XP'}</span>
                <span className="text-base font-extrabold text-amber-400">{userStats.xp.toLocaleString()}</span>
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

          {/* Student Leaderboard Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            {/* Table Head */}
            <div className="grid grid-cols-12 px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
              <div className="col-span-6 sm:col-span-5">Student / School</div>
              <div className="col-span-2 text-right">XP</div>
              <div className="col-span-2 text-right">Wins</div>
              <div className="hidden sm:block sm:col-span-2 text-right">Accuracy</div>
            </div>

            {/* Rows or Empty State */}
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-medium">Loading student rankings...</p>
              </div>
            ) : currentStudentList.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                  <Trophy className="w-7 h-7 text-amber-400/60" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">No students have ranked yet.</h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
                    Complete curriculum quizzes or battle in multiplayer to claim the top spot!
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {currentStudentList.map((entry) => {
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

                  const isCurrentUserRow = entry.isCurrentUser || entry.username === userStats.username;

                  return (
                    <div
                      key={entry.username + entry.rank}
                      className={`grid grid-cols-12 px-5 py-3.5 items-center transition ${
                        isCurrentUserRow
                          ? 'bg-indigo-600/20 border-y border-indigo-500/40'
                          : isTop3
                          ? 'bg-indigo-950/10'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 text-center">{rankBadge}</div>

                      <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                          {entry.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                            <span className="truncate">{entry.username}</span>
                            {isCurrentUserRow && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shrink-0">
                                You
                              </span>
                            )}
                            {entry.rank === 1 && (
                              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <span>Level {entry.level}</span>
                            {entry.schoolName && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-300/90 truncate">{entry.schoolName}</span>
                              </>
                            )}
                          </div>
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
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 2: SCHOOL CHALLENGE LEADERBOARD (COMING SOON)             */}
      {/* ============================================================== */}
      {mainMode === 'schools' && (
        <div className="space-y-6">
          {/* POLISHED COMING SOON HERO BANNER */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950/50 via-slate-900 to-indigo-950/40 border border-amber-500/40 shadow-2xl relative overflow-hidden space-y-5">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 shrink-0">
                  <Building2 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      COMING SOON
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">• Inter-School Championship</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    National Inter-School Competition Is Under Preparation
                  </h2>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">
                In Active Development
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Soon, Senior High Schools across Ghana will compete head-to-head on the National Academic Leaderboard! All registered students will rally their curriculum quiz scores, NSMQ challenges, and multiplayer battle victories to crown Ghana's top science high school.
            </p>

            {/* Upcoming Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>National Championship</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Combined school XP earned by all registered students will determine the national standings.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Real Students Only</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Strict isolation: Guest users cannot influence rankings. Only verified registered accounts qualify.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>XP Preserved</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Every quiz and battle you complete today will count toward your school's championship qualification.
                </p>
              </div>
            </div>
          </div>

          {/* Student's Personal School Standings & Contribution Banner */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-black shadow shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
                      {isGuest ? 'School Challenge Participation' : 'Your Enrolled School'}
                    </span>
                    {isGuest && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Guest Mode
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {isGuest ? 'Represent Your Senior High School' : registeredSchool}
                  </h2>
                  <p className="text-xs text-slate-300">
                    {isGuest 
                      ? 'You are browsing as Guest. Register an account with your school to save your XP and qualify your school for the upcoming tournament!'
                      : 'Your school is registered and enrolled. All current XP you earn will count when inter-school battles launch!'}
                  </p>
                </div>
              </div>

              {/* School Rank Badge / Sign In Action */}
              <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                {isGuest ? (
                  onOpenAuth && (
                    <button
                      onClick={onOpenAuth}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                    >
                      Sign In / Register School
                    </button>
                  )
                ) : (
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block font-semibold">National Rank</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-400">
                      {userSchoolStats ? `#${userSchoolStats.schoolRank}` : 'Unranked'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Contribution Breakdown (Only for registered students) */}
            {!isGuest && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold mb-0.5">Your Contribution</span>
                  <span className="text-base sm:text-lg font-black text-emerald-400">
                    {userStats.xp.toLocaleString()} XP
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold mb-0.5">Contribution Share</span>
                  <span className="text-base sm:text-lg font-black text-amber-400">
                    {userSchoolStats ? `${userSchoolStats.contributionPercent}%` : '100%'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold mb-0.5">Total School XP</span>
                  <span className="text-base sm:text-lg font-black text-white">
                    {userSchoolStats ? userSchoolStats.totalSchoolXp.toLocaleString() : userStats.xp.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block font-semibold mb-0.5">Active Scholars</span>
                  <span className="text-base sm:text-lg font-black text-indigo-300">
                    {userSchoolStats ? userSchoolStats.studentCount : 1}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* School Leaderboard Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            {/* Table Head */}
            <div className="grid grid-cols-12 px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2 sm:col-span-1 text-center">Rank</div>
              <div className="col-span-6 sm:col-span-6">Senior High School</div>
              <div className="col-span-2 text-right">Students</div>
              <div className="col-span-2 sm:col-span-3 text-right">Combined XP</div>
            </div>

            {/* Rows or Empty State */}
            {loading ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-medium">Computing school challenge standings...</p>
              </div>
            ) : schoolList.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
                  <Building2 className="w-7 h-7 text-amber-400/60" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">No schools have ranked yet.</h3>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto mt-1">
                    Registered students earning XP will automatically put their Senior High School on the leaderboard!
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {schoolList.map((entry) => {
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

                  const isMySchool = entry.isCurrentSchool || (registeredSchool && entry.schoolName.toLowerCase() === registeredSchool.toLowerCase());

                  return (
                    <div
                      key={entry.schoolName}
                      className={`grid grid-cols-12 px-5 py-4 items-center transition ${
                        isMySchool
                          ? 'bg-amber-500/10 border-y border-amber-500/40'
                          : isTop3
                          ? 'bg-amber-950/5'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="col-span-2 sm:col-span-1 text-center">{rankBadge}</div>

                      <div className="col-span-6 sm:col-span-6 flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center font-black text-xs text-amber-300 shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="font-bold text-white text-sm sm:text-base truncate flex items-center gap-2">
                            <span className="truncate">{entry.schoolName}</span>
                            {isMySchool && (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                                Your School
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Ghana Senior High School Championship
                          </span>
                        </div>
                      </div>

                      <div className="col-span-2 text-right font-bold text-indigo-300 text-sm">
                        {entry.studentCount} {entry.studentCount === 1 ? 'student' : 'students'}
                      </div>

                      <div className="col-span-2 sm:col-span-3 text-right font-extrabold text-amber-400 text-sm sm:text-base">
                        {entry.totalXp.toLocaleString()} XP
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creator Credit & Branding */}
      <div className="pt-4 text-center text-xs text-slate-400">
        <p className="text-indigo-300 font-semibold mb-0.5">SHS Science Hub • Learn • Practice • Challenge • Achieve</p>
        <p>Created & Developed by <strong className="text-indigo-400 font-bold">Avatar</strong></p>
      </div>
    </div>
  );
};
