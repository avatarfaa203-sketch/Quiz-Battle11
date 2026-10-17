export type Subject =
  | 'Mathematics'
  | 'Additional Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'English'
  | 'Computing'
  | 'General Knowledge';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  subject: Subject;
  difficulty: Difficulty;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

export interface UserStats {
  username: string;
  level: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalCorrect: number;
  totalQuestions: number;
  currentStreak: number;
  bestStreak: number;
  unlockedBadgeIds: string[];
  recentGames: GameHistoryItem[];
}

export interface GameHistoryItem {
  id: string;
  date: string;
  subject: Subject;
  difficulty: Difficulty;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  mode: 'battle' | 'practice' | 'multiplayer';
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'subject' | 'skill';
  requirement: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  xp: number;
  wins: number;
  accuracy: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface MultiplayerPlayer {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  currentAnswer?: {
    choice: string;
    isCorrect: boolean;
    responseTimeMs: number;
    scoreEarned: number;
  } | null;
  connected: boolean;
}

export interface SanitizedQuestion {
  id: string;
  subject: Subject;
  difficulty: Difficulty;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface ReviewData {
  correctAnswer: string;
  explanation: string;
  playerResults: Array<{
    id: string;
    name: string;
    choice: string;
    isCorrect: boolean;
    scoreEarned: number;
    totalScore: number;
  }>;
}

export interface MultiplayerFinalResults {
  winnerId: string | null;
  isDraw: boolean;
  finalScores: Array<{
    id: string;
    name: string;
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    accuracy: number;
    xpEarned: number;
  }>;
}

export interface MultiplayerRoomState {
  code: string;
  hostId: string;
  subject: Subject;
  difficulty: Difficulty;
  questionCount: number;
  timePerQuestion: number;
  status: 'lobby' | 'playing' | 'question_review' | 'finished';
  createdAt: number;
  players: MultiplayerPlayer[];
  currentQuestionIndex: number;
  questionStartTime: number;
  winnerId: string | null;
  isDraw: boolean;
  xpAwarded: Record<string, number>;
  rematchVotes: string[];
  currentQuestion?: SanitizedQuestion | null;
  reviewData?: ReviewData | null;
  finalResults?: MultiplayerFinalResults | null;
  announcement?: string | null;
  timeRemaining?: number;
  totalQuestions?: number;
}

