import { Question, Subject } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

/**
 * 32-bit hash function for string (e.g. YYYY-MM-DD)
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 */
function createPrng(seed: number) {
  let s = seed + 0x6D2B79F5;
  return function () {
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    s += 0x6D2B79F5;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns today's ISO date string in YYYY-MM-DD
 */
export function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Formats a YYYY-MM-DD date string for friendly display
 */
export function formatDailyChallengeDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Deterministically generates exactly 5 Ghana SHS curriculum questions for a given date.
 * Guarantees that:
 * 1. Every user gets the exact same 5 questions on that date.
 * 2. Questions automatically rotate on the next day.
 * 3. No question is duplicated within the daily 5.
 * 4. Wide curriculum subject variety (Mathematics, Physics, Chemistry, Biology, Computing).
 */
export function getDailyChallengeQuestions(dateStr: string = getTodayDateStr()): Question[] {
  const seed = hashString(dateStr);
  const prng = createPrng(seed);

  // Preferred subjects to pick from for a balanced national SHS challenge
  const subjectBuckets: Subject[] = [
    'Core Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Additional Mathematics',
  ];

  const selectedQuestions: Question[] = [];
  const usedIds = new Set<string>();

  // 1. Try to pick 1 distinct question from each subject bucket
  for (const subj of subjectBuckets) {
    const candidates = DEFAULT_QUESTIONS.filter(
      (q) => (q.subject === subj || (subj === 'Core Mathematics' && q.subject === 'Mathematics')) && !usedIds.has(q.id)
    );

    if (candidates.length > 0) {
      const idx = Math.floor(prng() * candidates.length);
      const chosen = candidates[idx];
      selectedQuestions.push(chosen);
      usedIds.add(chosen.id);
    }
  }

  // 2. If fewer than 5 (due to subject filtering), fill remaining from general pool
  if (selectedQuestions.length < 5) {
    const remainingPool = DEFAULT_QUESTIONS.filter((q) => !usedIds.has(q.id));
    // Deterministic shuffle of remaining
    const shuffled = [...remainingPool].sort(() => prng() - 0.5);

    for (const q of shuffled) {
      if (selectedQuestions.length >= 5) break;
      selectedQuestions.push(q);
      usedIds.add(q.id);
    }
  }

  return selectedQuestions.slice(0, 5);
}

export const DAILY_CHALLENGE_BONUS_XP = 50; // Bonus awarded for completing all 5 questions
export const DAILY_CHALLENGE_QUESTION_COUNT = 5;
