import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Home, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  Award, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Difficulty, Question, Subject } from '../../types';
import { soundEffects } from '../../utils/audio';
import { VoiceNarrator } from '../VoiceNarrator';

interface ResultsViewProps {
  result: {
    subject: Subject;
    difficulty: Difficulty;
    score: number;
    totalQuestions: number;
    xpEarned: number;
    leveledUp: boolean;
    newLevel: number;
    newBadges: any[];
    questions: Question[];
    userAnswers: (string | null)[];
    mode: 'battle' | 'practice';
  };
  onPlayAgain: () => void;
  onTryAnotherSubject: () => void;
  onGoToDashboard: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  result,
  onPlayAgain,
  onTryAnotherSubject,
  onGoToDashboard,
}) => {
  const [showReview, setShowReview] = useState(false);

  const accuracy = Math.round((result.score / result.totalQuestions) * 100);
  const incorrectCount = result.totalQuestions - result.score;
  const isHighPerformance = accuracy >= 80;

  useEffect(() => {
    if (isHighPerformance) {
      soundEffects.playVictory();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'],
      });
    } else {
      soundEffects.playClick();
    }
  }, [isHighPerformance]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      {/* Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-b from-slate-900 via-[#0e1628] to-[#0b0f19] p-6 sm:p-10 text-center shadow-2xl space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
          <Trophy className="w-10 h-10 text-amber-300" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 inline-block mb-2">
            {result.subject} • {result.difficulty}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {accuracy === 100 
              ? 'Flawless Victory!' 
              : accuracy >= 80 
              ? 'Outstanding Battle!' 
              : accuracy >= 50 
              ? 'Good Effort!' 
              : 'Keep Training!'}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            {accuracy >= 80
              ? 'You demonstrated commanding academic mastery under senior high school criteria.'
              : 'Every battle sharpens your instincts. Review your answers below to reinforce the concepts.'}
          </p>
        </div>

        {/* Level Up Alert if Applicable */}
        {result.leveledUp && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2 max-w-sm mx-auto text-sm font-bold animate-pulse">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Rank Up! You have attained Level {result.newLevel}!
          </div>
        )}

        {/* Core Stats Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Final Score
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {result.score} / {result.totalQuestions}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Accuracy
            </span>
            <div className={`text-2xl sm:text-3xl font-black ${accuracy >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {accuracy}%
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Correct / Missed
            </span>
            <div className="text-2xl sm:text-3xl font-black flex items-center justify-center gap-2">
              <span className="text-emerald-400">{result.score}</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400">{incorrectCount}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block mb-1">
              XP Earned
            </span>
            <div className="text-2xl sm:text-3xl font-black text-indigo-300 flex items-center justify-center gap-1">
              <Zap className="w-6 h-6 text-amber-400 fill-current" />
              +{result.xpEarned}
            </div>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => {
              soundEffects.playClick();
              onPlayAgain();
            }}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              onTryAnotherSubject();
            }}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm sm:text-base border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Try Another Subject
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              onGoToDashboard();
            }}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm sm:text-base border border-slate-700 transition flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4 text-emerald-400" />
            Dashboard
          </button>
        </div>
      </div>

      {/* Answer Review Section */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <button
          onClick={() => setShowReview(!showReview)}
          className="w-full flex items-center justify-between text-left font-bold text-white text-base sm:text-lg cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            Review All {result.questions.length} Answers & Curriculum Explanations
          </span>
          {showReview ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showReview && (
          <div className="space-y-4 pt-3 border-t border-slate-800">
            {result.questions.map((q, idx) => {
              const userAns = result.userAnswers[idx];
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

                  <div className="text-xs text-slate-300 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 mt-2 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <strong className="text-indigo-400 font-semibold">Explanation:</strong>
                      <VoiceNarrator text={q.explanation} label="Listen" compact />
                    </div>
                    <p className="pt-0.5">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creator Credit & Branding */}
      <div className="pt-4 text-center text-xs text-slate-400">
        <p className="text-indigo-300 font-semibold mb-0.5">SHS Science Hub • Learn • Practice • Challenge • Achieve</p>
        <p>Created & Developed by <strong className="text-indigo-400 font-bold">Avatar</strong></p>
      </div>
    </div>
  );
};
