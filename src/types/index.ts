export type ShsLevel = 'SHS 1' | 'SHS 2' | 'SHS 3';

export type Subject =
  | 'Core Mathematics'
  | 'Additional Mathematics'
  | 'Physics'
  | 'Chemistry'
  | 'Biology'
  | 'Mathematics' // Legacy compatibility
  | 'English'
  | 'Computing'
  | 'General Knowledge';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type NsmqRound = 'general' | 'speed' | 'problem' | 'true_false' | 'riddle';

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
  shsLevel?: ShsLevel;
  topic?: string;
  subtopic?: string;
  isNsmq?: boolean;
  nsmqRound?: NsmqRound;
  clues?: string[]; // Specifically for Round 5 riddles
}

export interface UserStats {
  id?: string;
  username: string;
  email?: string;
  avatar?: string;
  schoolName?: string;
  shsLevel?: ShsLevel;
  level: number;
  xp: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalCorrect: number;
  totalQuestions: number;
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate?: string; // YYYY-MM-DD
  multiplayerWins: number;
  multiplayerLosses: number;
  unlockedBadgeIds: string[];
  recentGames: GameHistoryItem[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string;
  schoolName?: string;
  shsLevel?: ShsLevel;
  createdAt: string;
  stats: UserStats;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  avatar?: string;
  schoolName?: string;
  xp: number;
  wins: number;
  accuracy: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface SchoolLeaderboardEntry {
  rank: number;
  schoolName: string;
  totalXp: number;
  studentCount: number;
  isCurrentSchool?: boolean;
}

export interface StudentSchoolStats {
  schoolName: string;
  schoolRank: number;
  totalSchoolXp: number;
  studentCount: number;
  userContributionXp: number;
  contributionPercent: number;
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
    rank?: number;
  }>;
}

export interface MultiplayerRoomState {
  code: string;
  hostId: string;
  subject: Subject;
  topic?: string;
  difficulty: Difficulty;
  questionCount: number;
  timePerQuestion: number;
  maxPlayers: number;
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

