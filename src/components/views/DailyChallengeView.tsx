import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Calendar, 
  Flame, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Home, 
  Trophy, 
  Timer, 
  Award, 
  Check, 
  Zap, 
  Lock, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Volume2 
} from 'lucide-react';
import { Question, UserStats } from '../../types';
import { 
  getDailyChallengeQuestions, 
  getTodayDateStr, 
  formatDailyChallengeDate, 
  DAILY_CHALLENGE_BONUS_XP, 
  DAILY_CHALLENGE_QUESTION_COUNT 
} from '../../utils/dailyChallenge';
import { recordDailyChallengeCompletion } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';
import { VoiceNarrator } from '../VoiceNarrator';
import { useAuth } from '../../utils/AuthContext';

interface DailyChallengeViewProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
  onGoToDashboard?: () => void;
  onCancel?: () => void;
  onOpenAuth?: () => void;
}

export const DailyChallengeView: React.FC<DailyChallengeViewProps> = ({
  userStats,
  onStatsUpdated,
  onGoToDashboard,
  onCancel,
  onOpenAuth,
}) => {
  const { isGuest, isAuthenticated } = useAuth();
  const todayStr = getTodayDateStr();
  const handleExit = onGoToDashboard || onCancel || (() => {});
  const formattedDate = formatDailyChallengeDate(todayStr);

  const [questions, setQuestions] = useState<Question[]>(() => getDailyChallengeQuestions(todayStr));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState(0);
  const [fastAnswersCount, setFastAnswersCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [timerActive, setTimerActive] = useState(true);
  const [quizFinished, setQuizFinished] = useState(false);
  const [alreadyCompletedBeforeStart] = useState<boolean>(() => userStats.lastDailyChallengeDate === todayStr);

  // Result state
  const [earnedResult, setEarnedResult] = useState<{
    xpEarned: number;
    bonusXp: number;
    totalXp: number;
    newStreak: number;
    alreadyCompleted: boolean;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Per-question timer
  useEffect(() => {
    if (!timerActive || hasAnswered || quizFinished) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeExpire();
          return 0;
        }
        if (prev <= 4) {
          soundEffects.playTick(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, hasAnswered, currentIndex, quizFinished]);

  const currentQ = questions[currentIndex] || questions[0];

  const handleTimeExpire = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    soundEffects.playWrong();
    setUserAnswers((prev) => [...prev, null]);
  };

  const handleSelectOption = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered) return;
    setSelectedOption(choice);
    setHasAnswered(true);

    const isCorrect = choice === currentQ.correctAnswer;
    if (isCorrect) {
      soundEffects.playCorrect();
      setScore((prev) => prev + 1);
      if (timeLeft >= 15) {
        setFastAnswersCount((prev) => prev + 1);
      }
    } else {
      soundEffects.playWrong();
    }

    setUserAnswers((prev) => [...prev, choice]);
  };

  const handleNextQuestion = () => {
    soundEffects.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      setTimeLeft(25);
      setTimerActive(true);
    } else {
      finishDailyChallenge();
    }
  };

  const finishDailyChallenge = () => {
    setQuizFinished(true);

    // Compute and record results
    const finalScore = score + (selectedOption === currentQ.correctAnswer && !userAnswers[currentIndex] ? 1 : 0);
    const completion = recordDailyChallengeCompletion({
      correctAnswers: finalScore,
      totalQuestions: 5,
      fastAnswersCount,
      todayStr,
    });

    onStatsUpdated(completion.stats);

    setEarnedResult({
      xpEarned: completion.xpEarned,
      bonusXp: completion.bonusXp,
      totalXp: completion.totalXpEarned,
      newStreak: completion.stats.currentStreak,
      alreadyCompleted: completion.alreadyCompletedToday,
    });

    if (finalScore >= 3) {
      soundEffects.playVictory();
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#6366f1', '#10b981', '#ec4899'],
      });
    }
  };

  // =========================================================================
  // VIEW 1: FINAL COMPLETION SUMMARY
  // =========================================================================
  if (quizFinished && earnedResult) {
    const accuracy = Math.round((score / 5) * 100);

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-950/30 via-slate-900 to-[#0b0f19] p-6 sm:p-8 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-xl shadow-amber-500/25">
            <Trophy className="w-9 h-9 text-slate-950" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/35 text-xs font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Challenge Complete • {formattedDate}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              {score === 5 
                ? 'Flawless Daily Mastery!' 
                : score >= 4 
                ? 'Outstanding Challenge!' 
                : score >= 3 
                ? 'Solid Academic Effort!' 
                : 'Good Training Session!'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
              5 national curriculum questions completed for {formattedDate}.
            </p>
          </div>

          {/* XP & Streak Rewards Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Final Score
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white">{score} / 5</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/70">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Accuracy
              </span>
              <div className={`text-2xl sm:text-3xl font-black ${accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {accuracy}%
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Total XP Earned
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Zap className="w-5 h-5 text-amber-400 fill-current" />
                +{earnedResult.totalXp}
              </div>
              <span className="text-[10px] text-amber-300/80 font-bold block mt-0.5">
                (incl. +{DAILY_CHALLENGE_BONUS_XP} bonus)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                Daily Streak
              </span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-300 flex items-center justify-center gap-1">
                <Flame className="w-5 h-5 text-orange-400 fill-current" />
                {earnedResult.newStreak} Days
              </div>
            </div>
          </div>

          {/* Guest Mode Warning / Conversion */}
          {isGuest && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                  Guest Mode (Session Progress)
                </span>
                <p className="text-xs text-slate-300 mt-0.5">
                  Your +{earnedResult.totalXp} XP and {earnedResult.newStreak}-day streak are only saved for this session. Create an account to permanently save your streak and compete on the leaderboard!
                </p>
              </div>
              {onOpenAuth && (
                <button
                  onClick={onOpenAuth}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer shrink-0"
                >
                  Sign In / Save Progress
                </button>
              )}
            </div>
          )}

          {/* Anti-Farming Notice if Re-played */}
          {earnedResult.alreadyCompleted && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Today's challenge was already recorded. XP is awarded once per calendar day to prevent farming.</span>
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleExit}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Detailed Question Review & Curriculum Explanations */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Today's 5 Questions & Teacher Explanations
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{formattedDate}</span>
          </div>

          <div className="space-y-4 pt-2">
            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = userAns === q.correctAnswer;
              return (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border text-sm space-y-2 ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-white">
                      #{idx + 1}. {q.question}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        isCorrect
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isCorrect ? 'Correct' : 'Missed'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong className="text-slate-400">Your Answer:</strong>{' '}
                      {userAns ? `Option ${userAns}` : 'Time Expired / None'}
                    </span>
                    <span>
                      <strong className="text-emerald-400">Correct Answer:</strong> Option {q.correctAnswer} -{' '}
                      {q[`option${q.correctAnswer}` as keyof Question]}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 mt-2 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <strong className="text-amber-300 font-semibold">Teacher Explanation:</strong>
                      <VoiceNarrator text={q.explanation} label="Listen" compact />
                    </div>
                    <p className="pt-0.5 leading-relaxed">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE QUESTION SOLVING
  // =========================================================================
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Banner Navigation & Daily Streak */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition cursor-pointer"
        >
          <Home className="w-4 h-4 text-emerald-400" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Streak: {userStats.currentStreak || 0} Days</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-300 text-xs font-bold">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{formattedDate}</span>
            <span className="sm:hidden">Daily</span>
          </div>
        </div>
      </div>

      {/* Already Completed Notice (if playing for review/practice) */}
      {alreadyCompletedBeforeStart && (
        <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>You have already completed today's challenge. Playing now is in practice review mode.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[10px] font-black uppercase">
            Practice
          </span>
        </div>
      )}

      {/* Question Card Box */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-7 shadow-2xl space-y-6">
        {/* Progress Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Daily Challenge
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
              Question {currentIndex + 1} of {DAILY_CHALLENGE_QUESTION_COUNT}
            </span>
          </div>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black ${
              timeLeft <= 5
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse'
                : 'bg-slate-800/90 border-slate-700 text-slate-200'
            }`}
          >
            <Timer className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-400' : 'text-amber-400'}`} />
            <span>{timeLeft}s</span>
          </div>
        </div>

        {/* 5-Step Segmented Progress Bar */}
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const isPast = i < currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isPast
                    ? 'bg-emerald-500'
                    : isCurrent
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 animate-pulse'
                    : 'bg-slate-800 border border-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        {/* Question Text & Subject Metadata */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="text-amber-400 font-extrabold">{currentQ.subject}</span>
            {currentQ.topic && (
              <>
                <span>•</span>
                <span className="text-indigo-300 truncate">{currentQ.topic}</span>
              </>
            )}
            <span>•</span>
            <span className="capitalize text-slate-400">{currentQ.difficulty}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
            {currentQ.question}
          </h2>
        </div>

        {/* 4 Multiple Choice Options */}
        <div className="grid grid-cols-1 gap-3 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((key) => {
            const optionText = currentQ[`option${key}` as keyof Question] as string;
            if (!optionText) return null;

            const isSelected = selectedOption === key;
            const isCorrectAnswer = currentQ.correctAnswer === key;

            let buttonStyle = 'bg-slate-800/80 hover:bg-slate-750 border-slate-700 text-slate-200 hover:border-slate-600';

            if (hasAnswered) {
              if (isCorrectAnswer) {
                buttonStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20';
              } else if (isSelected && !isCorrectAnswer) {
                buttonStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
              } else {
                buttonStyle = 'bg-slate-800/40 border-slate-800 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectOption(key)}
                disabled={hasAnswered}
                className={`p-4 rounded-2xl border text-left font-medium transition flex items-center justify-between cursor-pointer ${buttonStyle}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      hasAnswered && isCorrectAnswer
                        ? 'bg-emerald-500 text-slate-950'
                        : hasAnswered && isSelected && !isCorrectAnswer
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {key}
                  </div>
                  <span className="text-sm sm:text-base leading-snug">{optionText}</span>
                </div>

                {hasAnswered && isCorrectAnswer && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                )}
                {hasAnswered && isSelected && !isCorrectAnswer && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Immediate Explanation Box on Answer */}
        {hasAnswered && (
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mt-4 transition-all">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Curriculum Explanation
              </span>
              <VoiceNarrator text={currentQ.explanation} label="Listen to Explanation" compact />
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
              {currentQ.explanation}
            </p>
          </div>
        )}

        {/* Bottom Action Footer */}
        {hasAnswered && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
            <div className="text-xs text-slate-400 font-semibold">
              Current Score: <strong className="text-amber-400">{score}</strong> / {currentIndex + 1}
            </div>

            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'Finish & Claim XP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
