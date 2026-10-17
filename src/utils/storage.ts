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

const DEFAULT_USER_STATS: UserStats = {
  username: 'ApexQuizzer',
  level: 1,
  xp: 120,
  gamesPlayed: 1,
  wins: 1,
  losses: 0,
  totalCorrect: 5,
  totalQuestions: 5,
  currentStreak: 5,
  bestStreak: 5,
  unlockedBadgeIds: ['quiz-starter'],
  recentGames: [
    {
      id: 'init-1',
      date: new Date().toLocaleDateString(),
      subject: 'Mathematics',
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
      xp,
      level,
      unlockedBadgeIds: Array.isArray(parsed.unlockedBadgeIds) ? parsed.unlockedBadgeIds : ['quiz-starter'],
      recentGames: Array.isArray(parsed.recentGames) ? parsed.recentGames : DEFAULT_USER_STATS.recentGames,
    };
  } catch {
    return DEFAULT_USER_STATS;
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
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
  } else if (params.mode === 'battle' || params.mode === 'multiplayer') {
    stats.losses += 1;
  }

  // Streaks
  if (params.correctAnswers === params.totalQuestions) {
    stats.currentStreak += params.correctAnswers;
  } else {
    stats.currentStreak = params.correctAnswers;
  }
  if (stats.currentStreak > stats.bestStreak) {
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
  checkBadge('streak-master', stats.bestStreak >= 5);

  const newLevelData = calculateLevelFromXP(stats.xp);
  checkBadge('scholars-ascent', newLevelData.level >= 5);

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

  return {
    stats,
    xpEarned,
    newLevel: newLevelData.level,
    leveledUp: newLevelData.level > oldLevel,
    newBadges: newlyUnlocked
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
      return DEFAULT_QUESTIONS;
    }
    return parsed;
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
