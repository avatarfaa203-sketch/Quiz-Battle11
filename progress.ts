import { UserStats, Badge, GameHistoryItem, Subject, Difficulty } from '../types';
import { ALL_BADGES } from '../data/badges';

export function calculateLevel(xp: number): {
  level: number;
  currentLevelXp: number;
  xpNeededForNext: number;
  progressPercent: number;
} {
  let level = 1;
  let remaining = Math.max(0, xp);
  let threshold = 250;

  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = level * 250;
  }

  const progressPercent = Math.min(100, Math.round((remaining / threshold) * 100));

  return {
    level,
    currentLevelXp: remaining,
    xpNeededForNext: threshold,
    progressPercent,
  };
}

/**
 * Validates and updates daily streak safely on the server.
 * Calendar day logic:
 * - If last played today: streak remains unchanged (no duplicate increase).
 * - If last played yesterday: streak increments by 1.
 * - If last played 2+ days ago: streak resets to 1.
 * - If never played before: streak sets to 1.
 */
export function updateDailyStreak(stats: UserStats, todayStr: string): { currentStreak: number; bestStreak: number; lastPlayedDate: string } {
  let currentStreak = stats.currentStreak || 0;
  let bestStreak = stats.bestStreak || 0;
  const lastDate = stats.lastPlayedDate;

  if (!lastDate) {
    currentStreak = 1;
  } else if (lastDate === todayStr) {
    // Already played today: do not increment artificially
  } else {
    // Check difference in calendar days
    const lastTime = new Date(lastDate + 'T00:00:00Z').getTime();
    const todayTime = new Date(todayStr + 'T00:00:00Z').getTime();
    const dayDiff = Math.round((todayTime - lastTime) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      currentStreak += 1;
    } else {
      currentStreak = 1; // missed at least one day, reset to 1
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return {
    currentStreak,
    bestStreak,
    lastPlayedDate: todayStr,
  };
}

/**
 * Server-side evaluation of achievements / badges.
 */
export function checkBadges(stats: UserStats, context?: {
  totalQuestions?: number;
  correctAnswers?: number;
  fastAnswersCount?: number;
  subject?: Subject;
  difficulty?: Difficulty;
  isMultiplayerWin?: boolean;
}): { newlyUnlocked: Badge[]; allBadgeIds: string[] } {
  const currentSet = new Set(stats.unlockedBadgeIds || []);
  const newlyUnlocked: Badge[] = [];

  const grant = (id: string, condition: boolean) => {
    if (!currentSet.has(id) && condition) {
      currentSet.add(id);
      const found = ALL_BADGES.find((b) => b.id === id);
      if (found) newlyUnlocked.push(found);
    }
  };

  // Basic progression
  grant('quiz-starter', stats.gamesPlayed >= 1);
  grant('first-victory', stats.wins >= 1);
  grant('ten-wins', stats.wins >= 10);
  grant('scholars-ascent', stats.level >= 5);

  // New requested achievements
  grant('ten-quizzes', stats.gamesPlayed >= 10);
  grant('hundred-questions', stats.totalQuestions >= 100);
  grant('ten-correct', stats.totalCorrect >= 10);
  grant('hundred-correct', stats.totalCorrect >= 100);
  grant('seven-day-streak', stats.currentStreak >= 7 || stats.bestStreak >= 7);
  grant('first-multiplayer-win', (stats.multiplayerWins || 0) >= 1);
  grant('ten-multiplayer-wins', (stats.multiplayerWins || 0) >= 10);
  grant('xp-1000', stats.xp >= 1000);
  grant('xp-5000', stats.xp >= 5000);

  // Context-specific skill badges
  if (context) {
    if (context.fastAnswersCount && context.fastAnswersCount >= 1) {
      grant('speed-demon', true);
    }
    if (context.totalQuestions && context.totalQuestions >= 5 && context.correctAnswers === context.totalQuestions) {
      grant('perfect-score', true);
    }
    if (context.subject === 'Mathematics' || context.subject === 'Additional Mathematics') {
      if ((context.correctAnswers || 0) >= 4) {
        grant('maths-master', true);
      }
    }
    if (context.subject === 'Physics' || context.subject === 'Chemistry' || context.subject === 'Biology') {
      if ((context.correctAnswers || 0) >= 4) {
        grant('science-master', true);
      }
    }
    if (context.subject === 'Computing' && context.difficulty === 'hard' && (context.correctAnswers || 0) >= 3) {
      grant('computing-wizard', true);
    }
  }

  return {
    newlyUnlocked,
    allBadgeIds: Array.from(currentSet),
  };
}

/**
 * Server-authoritative calculation of quiz completion.
 * Enforces caps so clients cannot inject millions of XP.
 */
export function computeQuizProgress(
  currentStats: UserStats,
  params: {
    subject: Subject;
    difficulty: Difficulty;
    correctAnswers: number;
    totalQuestions: number;
    fastAnswersCount: number;
    mode: 'battle' | 'practice' | 'multiplayer';
    isMultiplayerWin?: boolean;
    todayStr: string;
  }
): {
  updatedStats: UserStats;
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: Badge[];
} {
  const safeTotalQ = Math.max(1, Math.min(params.totalQuestions, 50));
  const safeCorrect = Math.max(0, Math.min(params.correctAnswers, safeTotalQ));
  const safeFast = Math.max(0, Math.min(params.fastAnswersCount, safeTotalQ));

  // Base completion XP
  let xpEarned = 40;

  // Difficulty tier XP
  const xpPerCorrect = params.difficulty === 'hard' ? 45 : params.difficulty === 'medium' ? 30 : 20;
  xpEarned += safeCorrect * xpPerCorrect;

  // Speed bonus
  xpEarned += safeFast * 10;

  // Win condition
  const isWin = params.mode === 'multiplayer'
    ? Boolean(params.isMultiplayerWin)
    : (safeCorrect / safeTotalQ) >= 0.7;

  if (isWin) {
    xpEarned += 50;
  }

  // Clone stats
  const nextStats: UserStats = {
    ...currentStats,
    xp: currentStats.xp + xpEarned,
    gamesPlayed: currentStats.gamesPlayed + 1,
    totalCorrect: currentStats.totalCorrect + safeCorrect,
    totalQuestions: currentStats.totalQuestions + safeTotalQ,
    wins: isWin ? currentStats.wins + 1 : currentStats.wins,
    losses: (!isWin && (params.mode === 'battle' || params.mode === 'multiplayer'))
      ? currentStats.losses + 1
      : currentStats.losses,
    multiplayerWins: (params.mode === 'multiplayer' && isWin)
      ? (currentStats.multiplayerWins || 0) + 1
      : (currentStats.multiplayerWins || 0),
    multiplayerLosses: (params.mode === 'multiplayer' && !isWin)
      ? (currentStats.multiplayerLosses || 0) + 1
      : (currentStats.multiplayerLosses || 0),
    recentGames: Array.isArray(currentStats.recentGames) ? [...currentStats.recentGames] : [],
  };

  // Daily Streak calculation
  const streakUpdate = updateDailyStreak(nextStats, params.todayStr);
  nextStats.currentStreak = streakUpdate.currentStreak;
  nextStats.bestStreak = streakUpdate.bestStreak;
  nextStats.lastPlayedDate = streakUpdate.lastPlayedDate;

  // Level calculation
  const oldLevel = currentStats.level || 1;
  const levelData = calculateLevel(nextStats.xp);
  nextStats.level = levelData.level;

  // Badges calculation
  const badgeResult = checkBadges(nextStats, {
    totalQuestions: safeTotalQ,
    correctAnswers: safeCorrect,
    fastAnswersCount: safeFast,
    subject: params.subject,
    difficulty: params.difficulty,
    isMultiplayerWin: params.isMultiplayerWin,
  });
  nextStats.unlockedBadgeIds = badgeResult.allBadgeIds;

  // Add to recent history
  const historyItem: GameHistoryItem = {
    id: 'game_' + Date.now(),
    date: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    subject: params.subject,
    difficulty: params.difficulty,
    score: safeCorrect,
    totalQuestions: safeTotalQ,
    xpEarned,
    mode: params.mode,
  };

  nextStats.recentGames.unshift(historyItem);
  if (nextStats.recentGames.length > 20) {
    nextStats.recentGames = nextStats.recentGames.slice(0, 20);
  }

  return {
    updatedStats: nextStats,
    xpEarned,
    newLevel: nextStats.level,
    leveledUp: nextStats.level > oldLevel,
    newBadges: badgeResult.newlyUnlocked,
  };
}
