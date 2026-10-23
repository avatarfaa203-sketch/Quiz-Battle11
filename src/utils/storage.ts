import { ALL_BADGES } from '../data/badges';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { Badge, Difficulty, GameHistoryItem, Question, Subject, UserStats } from '../types';

const STATS_KEY = 'quiz_battle_user_stats';
const QUESTIONS_KEY = 'quiz_battle_custom_questions';

export function getRankTitle(level: number): string {
  if (level <= 1) return 'Novice Challenger';
  if (level <= 3) return 'Quiz Cadet';
  if (level <= 6) return 'Knowledge Seeker';
  if (level <= 9) return 'Scholar Warrior';
  if (level <= 14) return 'Quiz Gladiator';
  if (level <= 19) return 'Grand Strategist';
  return 'Trivia Conqueror';
}

export function calculateLevelFromXP(totalXp: number): {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
  rankTitle: string;
} {
  let level = 1;
  let remaining = totalXp;
  let threshold = 250; // XP needed to complete level 1

  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = level * 250; // Next level requires more XP
  }

  const progressPercent = Math.min(100, Math.round((remaining / threshold) * 100));

  return {
    level,
    currentLevelXp: remaining,
    xpNeededForNext: threshold,
    progressPercent,
    rankTitle: getRankTitle(level)
  };
}

const TOKEN_KEY = 'quiz_battle_auth_token';

export function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

const GUEST_FLAG_KEY = 'shs_hub_is_guest';
const GUEST_STATS_KEY = 'shs_hub_guest_stats';

export const INITIAL_GUEST_STATS: UserStats = {
  username: 'Guest Scholar',
  avatar: 'avatar_1',
  schoolName: 'Guest Mode (Unregistered)',
  shsLevel: 'SHS 2',
  level: 1,
  xp: 0,
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  totalCorrect: 0,
  totalQuestions: 0,
  currentStreak: 0,
  bestStreak: 0,
  multiplayerWins: 0,
  multiplayerLosses: 0,
  unlockedBadgeIds: [],
  recentGames: [],
};

export function isGuestModeActive(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(GUEST_FLAG_KEY) === 'true';
}

export function setGuestModeActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    sessionStorage.setItem(GUEST_FLAG_KEY, 'true');
    if (!sessionStorage.getItem(GUEST_STATS_KEY)) {
      sessionStorage.setItem(GUEST_STATS_KEY, JSON.stringify(INITIAL_GUEST_STATS));
    }
  } else {
    sessionStorage.removeItem(GUEST_FLAG_KEY);
    sessionStorage.removeItem(GUEST_STATS_KEY);
  }
}

export function loadGuestStats(): UserStats {
  if (typeof window === 'undefined') return INITIAL_GUEST_STATS;
  try {
    const raw = sessionStorage.getItem(GUEST_STATS_KEY);
    if (!raw) {
      sessionStorage.setItem(GUEST_STATS_KEY, JSON.stringify(INITIAL_GUEST_STATS));
      return { ...INITIAL_GUEST_STATS };
    }
    const parsed = JSON.parse(raw);
    const xp = typeof parsed.xp === 'number' ? parsed.xp : 0;
    const { level } = calculateLevelFromXP(xp);
    return {
      ...INITIAL_GUEST_STATS,
      ...parsed,
      xp,
      level,
    };
  } catch {
    return { ...INITIAL_GUEST_STATS };
  }
}

export function saveGuestStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    const { level } = calculateLevelFromXP(stats.xp);
    stats.level = level;
    sessionStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

const DEFAULT_USER_STATS: UserStats = {
  username: 'ApexQuizzer',
  avatar: 'avatar_1',
  shsLevel: 'SHS 2',
  level: 1,
  xp: 120,
  gamesPlayed: 1,
  wins: 1,
  losses: 0,
  totalCorrect: 5,
  totalQuestions: 5,
  currentStreak: 1,
  bestStreak: 1,
  lastPlayedDate: new Date().toISOString().split('T')[0],
  multiplayerWins: 0,
  multiplayerLosses: 0,
  unlockedBadgeIds: ['quiz-starter'],
  recentGames: [
    {
      id: 'init-1',
      date: new Date().toLocaleDateString(),
      subject: 'Core Mathematics',
      difficulty: 'easy',
      score: 5,
      totalQuestions: 5,
      xpEarned: 120,
      mode: 'battle'
    }
  ]
};

export function loadUserStats(): UserStats {
  if (typeof window === 'undefined') return DEFAULT_USER_STATS;
  if (isGuestModeActive()) {
    return loadGuestStats();
  }
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      saveUserStats(DEFAULT_USER_STATS);
      return DEFAULT_USER_STATS;
    }
    const parsed = JSON.parse(raw);
    const xp = typeof parsed.xp === 'number' ? parsed.xp : DEFAULT_USER_STATS.xp;
    const { level } = calculateLevelFromXP(xp);
    return {
      ...DEFAULT_USER_STATS,
      ...parsed,
      shsLevel: parsed.shsLevel || 'SHS 2',
      xp,
      level,
      multiplayerWins: typeof parsed.multiplayerWins === 'number' ? parsed.multiplayerWins : 0,
      multiplayerLosses: typeof parsed.multiplayerLosses === 'number' ? parsed.multiplayerLosses : 0,
      currentStreak: typeof parsed.currentStreak === 'number' ? parsed.currentStreak : 1,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 1,
      unlockedBadgeIds: Array.isArray(parsed.unlockedBadgeIds) ? parsed.unlockedBadgeIds : ['quiz-starter'],
      recentGames: Array.isArray(parsed.recentGames) ? parsed.recentGames : DEFAULT_USER_STATS.recentGames,
    };
  } catch {
    return DEFAULT_USER_STATS;
  }
}

export function updateShsLevel(newLevel: 'SHS 1' | 'SHS 2' | 'SHS 3'): UserStats {
  const stats = loadUserStats();
  stats.shsLevel = newLevel;
  saveUserStats(stats);
  return stats;
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  if (isGuestModeActive()) {
    saveGuestStats(stats);
    return;
  }
  try {
    const { level } = calculateLevelFromXP(stats.xp);
    stats.level = level;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Gracefully handle quota or sandboxed private storage
  }
}

export function updateUsername(newUsername: string): UserStats {
  const stats = loadUserStats();
  stats.username = newUsername.trim() || 'Player';
  saveUserStats(stats);
  return stats;
}

export function updateSchoolName(newSchoolName: string): UserStats {
  const stats = loadUserStats();
  stats.schoolName = newSchoolName.trim();
  saveUserStats(stats);
  return stats;
}

export interface QuizCompletionResult {
  stats: UserStats;
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: Badge[];
}

export function recordQuizCompletion(params: {
  subject: Subject;
  difficulty: Difficulty;
  correctAnswers: number;
  totalQuestions: number;
  fastAnswersCount: number;
  mode: 'battle' | 'practice' | 'multiplayer';
  isMultiplayerWin?: boolean;
}): QuizCompletionResult {
  const stats = loadUserStats();
  const oldLevel = calculateLevelFromXP(stats.xp).level;

  // Base completion XP
  let xpEarned = 40;

  // Per correct answer based on difficulty
  const xpPerCorrect = params.difficulty === 'hard' ? 45 : params.difficulty === 'medium' ? 30 : 20;
  xpEarned += params.correctAnswers * xpPerCorrect;

  // Speed bonus
  xpEarned += params.fastAnswersCount * 10;

  // Win bonus
  const isWin = params.mode === 'multiplayer' 
    ? Boolean(params.isMultiplayerWin)
    : (params.correctAnswers / params.totalQuestions) >= 0.7;

  if (isWin) {
    xpEarned += 50;
  }

  // Update stats
  stats.xp += xpEarned;
  stats.gamesPlayed += 1;
  stats.totalCorrect += params.correctAnswers;
  stats.totalQuestions += params.totalQuestions;

  if (isWin) {
    stats.wins += 1;
    if (params.mode === 'multiplayer') {
      stats.multiplayerWins = (stats.multiplayerWins || 0) + 1;
    }
  } else if (params.mode === 'battle' || params.mode === 'multiplayer') {
    stats.losses += 1;
    if (params.mode === 'multiplayer') {
      stats.multiplayerLosses = (stats.multiplayerLosses || 0) + 1;
    }
  }

  // Calendar Day Daily Streak Logic:
  // Completing at least one quiz in a calendar day counts toward the streak.
  // Consecutive days increase the streak. Missing a day resets it.
  // Multiple quizzes on the same day never artificially increment the streak.
  const todayStr = new Date().toISOString().split('T')[0];
  const lastDate = stats.lastPlayedDate;

  if (!lastDate) {
    stats.currentStreak = 1;
  } else if (lastDate === todayStr) {
    // Already played today, streak remains unchanged
  } else {
    const lastTime = new Date(lastDate + 'T00:00:00Z').getTime();
    const todayTime = new Date(todayStr + 'T00:00:00Z').getTime();
    const dayDiff = Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      stats.currentStreak = (stats.currentStreak || 0) + 1;
    } else {
      stats.currentStreak = 1; // Missed a day
    }
  }

  stats.lastPlayedDate = todayStr;
  if (stats.currentStreak > (stats.bestStreak || 0)) {
    stats.bestStreak = stats.currentStreak;
  }

  // Add history
  const historyItem: GameHistoryItem = {
    id: 'game-' + Date.now(),
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    subject: params.subject,
    difficulty: params.difficulty,
    score: params.correctAnswers,
    totalQuestions: params.totalQuestions,
    xpEarned,
    mode: params.mode
  };
  stats.recentGames.unshift(historyItem);
  if (stats.recentGames.length > 20) {
    stats.recentGames = stats.recentGames.slice(0, 20);
  }

  // Check Badge Unlocks
  const newlyUnlocked: Badge[] = [];
  const currentUnlocked = new Set(stats.unlockedBadgeIds);

  const checkBadge = (id: string, condition: boolean) => {
    if (!currentUnlocked.has(id) && condition) {
      currentUnlocked.add(id);
      const b = ALL_BADGES.find(item => item.id === id);
      if (b) newlyUnlocked.push(b);
    }
  };

  checkBadge('quiz-starter', stats.gamesPlayed >= 1);
  checkBadge('first-victory', stats.wins >= 1);
  checkBadge('ten-wins', stats.wins >= 10);
  checkBadge('perfect-score', params.totalQuestions >= 5 && params.correctAnswers === params.totalQuestions);
  checkBadge('speed-demon', params.fastAnswersCount >= 1);
  checkBadge('streak-master', (stats.bestStreak || 0) >= 5);

  const newLevelData = calculateLevelFromXP(stats.xp);
  checkBadge('scholars-ascent', newLevelData.level >= 5);

  // New achievements
  checkBadge('ten-quizzes', stats.gamesPlayed >= 10);
  checkBadge('hundred-questions', stats.totalQuestions >= 100);
  checkBadge('ten-correct', stats.totalCorrect >= 10);
  checkBadge('hundred-correct', stats.totalCorrect >= 100);
  checkBadge('seven-day-streak', (stats.currentStreak || 0) >= 7 || (stats.bestStreak || 0) >= 7);
  checkBadge('first-multiplayer-win', (stats.multiplayerWins || 0) >= 1);
  checkBadge('ten-multiplayer-wins', (stats.multiplayerWins || 0) >= 10);
  checkBadge('xp-1000', stats.xp >= 1000);
  checkBadge('xp-5000', stats.xp >= 5000);

  // Subject specific
  if (params.subject === 'Mathematics' || params.subject === 'Additional Mathematics') {
    if (params.correctAnswers >= 4) {
      checkBadge('maths-master', true);
    }
  }
  if (params.subject === 'Physics' || params.subject === 'Chemistry' || params.subject === 'Biology') {
    if (params.correctAnswers >= 4) {
      checkBadge('science-master', true);
    }
  }
  if (params.subject === 'Computing' && params.difficulty === 'hard' && params.correctAnswers >= 3) {
    checkBadge('computing-wizard', true);
  }

  stats.unlockedBadgeIds = Array.from(currentUnlocked);
  stats.level = newLevelData.level;
  saveUserStats(stats);

  // If user has active token, also sync to server in background
  const token = getStoredAuthToken();
  if (token) {
    fetch('/api/quiz/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: params.subject,
        difficulty: params.difficulty,
        correctAnswers: params.correctAnswers,
        totalQuestions: params.totalQuestions,
        fastAnswersCount: params.fastAnswersCount,
        mode: params.mode,
        isMultiplayerWin: params.isMultiplayerWin,
        todayStr,
      }),
    }).catch(() => {});
  }

    return {
      stats,
      xpEarned,
      newLevel: newLevelData.level,
      leveledUp: newLevelData.level > oldLevel,
      newBadges: newlyUnlocked
    };
  }

  export interface DailyChallengeResult {
    stats: UserStats;
    xpEarned: number;
    bonusXp: number;
    totalXpEarned: number;
    newLevel: number;
    leveledUp: boolean;
    newBadges: Badge[];
    alreadyCompletedToday: boolean;
  }

  export function recordDailyChallengeCompletion(params: {
    correctAnswers: number;
    totalQuestions: number;
    fastAnswersCount: number;
    todayStr?: string;
  }): DailyChallengeResult {
    const stats = loadUserStats();
    const todayStr = params.todayStr || new Date().toISOString().split('T')[0];

    // Anti-farming check
    if (stats.lastDailyChallengeDate === todayStr) {
      return {
        stats,
        xpEarned: 0,
        bonusXp: 0,
        totalXpEarned: 0,
        newLevel: stats.level,
        leveledUp: false,
        newBadges: [],
        alreadyCompletedToday: true,
      };
    }

    const oldLevel = stats.level;
    const correct = Math.max(0, Math.min(5, params.correctAnswers));
    const fast = Math.max(0, Math.min(5, params.fastAnswersCount));
    const baseQuestionXp = correct * 25;
    const speedXp = fast * 10;
    const bonusXp = 50; // Daily Challenge completion bonus
    const totalXpEarned = baseQuestionXp + speedXp + bonusXp;

    stats.xp += totalXpEarned;
    stats.gamesPlayed += 1;
    stats.totalCorrect += correct;
    stats.totalQuestions += 5;
    if (correct >= 4) {
      stats.wins += 1;
    }

    // Update streak logic
    const lastDate = stats.lastPlayedDate;
    if (!lastDate) {
      stats.currentStreak = 1;
    } else if (lastDate === todayStr) {
      // already played today
    } else {
      const lastTime = new Date(lastDate + 'T00:00:00Z').getTime();
      const todayTime = new Date(todayStr + 'T00:00:00Z').getTime();
      const dayDiff = Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24));
      if (dayDiff === 1) {
        stats.currentStreak = (stats.currentStreak || 0) + 1;
      } else {
        stats.currentStreak = 1;
      }
    }

    stats.lastPlayedDate = todayStr;
    stats.lastDailyChallengeDate = todayStr;
    if (stats.currentStreak > (stats.bestStreak || 0)) {
      stats.bestStreak = stats.currentStreak;
    }

    // Check badges
    const newlyUnlocked: Badge[] = [];
    const currentUnlocked = new Set(stats.unlockedBadgeIds || []);
    const checkBadge = (id: string, condition: boolean) => {
      if (!currentUnlocked.has(id) && condition) {
        currentUnlocked.add(id);
        const b = ALL_BADGES.find((item) => item.id === id);
        if (b) newlyUnlocked.push(b);
      }
    };

    checkBadge('quiz-starter', stats.gamesPlayed >= 1);
    checkBadge('first-victory', stats.wins >= 1);
    checkBadge('speed-demon', fast >= 1);
    checkBadge('streak-master', (stats.bestStreak || 0) >= 5);
    checkBadge('seven-day-streak', (stats.currentStreak || 0) >= 7 || (stats.bestStreak || 0) >= 7);
    if (correct === 5) {
      checkBadge('perfect-score', true);
    }

    const newLevelData = calculateLevelFromXP(stats.xp);
    stats.level = newLevelData.level;
    stats.unlockedBadgeIds = Array.from(currentUnlocked);

    stats.recentGames.unshift({
      id: 'daily-' + Date.now(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      subject: 'General Knowledge',
      difficulty: 'medium',
      score: correct,
      totalQuestions: 5,
      xpEarned: totalXpEarned,
      mode: 'practice',
    });
    if (stats.recentGames.length > 20) {
      stats.recentGames = stats.recentGames.slice(0, 20);
    }

    saveUserStats(stats);

    // If authenticated registered student, sync to server
    const token = getStoredAuthToken();
    if (token && !isGuestModeActive()) {
      fetch('/api/daily-challenge/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          correctAnswers: correct,
          fastAnswersCount: fast,
          todayStr,
        }),
      }).catch(() => {});
    }

    return {
      stats,
      xpEarned: baseQuestionXp + speedXp,
      bonusXp,
      totalXpEarned,
      newLevel: newLevelData.level,
      leveledUp: newLevelData.level > oldLevel,
      newBadges: newlyUnlocked,
      alreadyCompletedToday: false,
    };
  }

// Questions Storage (Admin & In-game)
export function loadAllQuestions(): Question[] {
  if (typeof window === 'undefined') return DEFAULT_QUESTIONS;
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    if (!raw) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
      return DEFAULT_QUESTIONS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
      return DEFAULT_QUESTIONS;
    }

    // Merge any new default questions (e.g. curriculum, logarithms, NSMQ) into parsed
    const existingIdSet = new Set(parsed.map((q: Question) => q.id));
    let hasNew = false;
    const merged = [...parsed];
    for (const dq of DEFAULT_QUESTIONS) {
      if (!existingIdSet.has(dq.id)) {
        merged.unshift(dq);
        hasNew = true;
      }
    }
    if (hasNew) {
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(merged));
    }
    return merged;
  } catch {
    return DEFAULT_QUESTIONS;
  }
}

export function saveAllQuestions(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch {
    // Gracefully handle storage restrictions
  }
}

export function resetQuestionsToDefault(): Question[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(DEFAULT_QUESTIONS));
  }
  return DEFAULT_QUESTIONS;
}

export function filterQuestions(subject?: Subject, difficulty?: Difficulty): Question[] {
  const all = loadAllQuestions();
  return all.filter(q => {
    if (subject && q.subject !== subject) return false;
    if (difficulty && q.difficulty !== difficulty) return false;
    return true;
  });
}
