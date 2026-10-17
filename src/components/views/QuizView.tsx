import React, { useState, useEffect, useRef } from 'react';
import { 
  Timer, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BrainCircuit, 
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Volume2,
  ChevronRight
} from 'lucide-react';
import { Difficulty, Question, Subject, UserStats } from '../../types';
import { SUBJECTS } from '../../data/defaultQuestions';
import { loadAllQuestions, recordQuizCompletion } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';
import { AiExplainerModal } from '../AiExplainerModal';

interface QuizViewProps {
  mode: 'battle' | 'practice';
  initialSubject?: Subject | null;
  userStats: UserStats;
  onFinishQuiz: (result: {
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
  }) => void;
  onCancel: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  mode,
  initialSubject,
  userStats,
  onFinishQuiz,
  onCancel,
}) => {
  // Setup phase vs Active game phase
  const [inSetup, setInSetup] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject>(initialSubject || 'Mathematics');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Active Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState(0);
  const [fastAnswersCount, setFastAnswersCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(false);

  // AI Modal
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start the quiz
  const handleStartQuiz = () => {
    soundEffects.playClick();
    const all = loadAllQuestions();
    
    // Filter matching subject
    let pool = all.filter((q) => q.subject === selectedSubject);
    if (pool.length === 0) pool = all;

    // Prioritize difficulty, then shuffle
    const exactDiff = pool.filter((q) => q.difficulty === selectedDifficulty);
    const otherDiff = pool.filter((q) => q.difficulty !== selectedDifficulty);

    // Shuffle helper
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const combined = [...shuffle(exactDiff), ...shuffle(otherDiff)];
    let selected = combined.slice(0, Math.min(questionCount, combined.length));
    
    // If user requested more questions than this single subject has, pull from other subjects
    if (selected.length < questionCount) {
      const remainingNeeded = questionCount - selected.length;
      const selectedIds = new Set(selected.map((q) => q.id));
      const additional = shuffle(all.filter((q) => !selectedIds.has(q.id))).slice(0, remainingNeeded);
      selected = [...selected, ...additional];
    }

    setQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers([]);
    setScore(0);
    setFastAnswersCount(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setInSetup(false);
    resetTimer();
  };

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mode === 'battle') {
      setTimeLeft(15);
      setTimerActive(true);
    }
  };

  // Timer countdown hook for battle mode
  useEffect(() => {
    if (!inSetup && mode === 'battle' && timerActive && !hasAnswered) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          if (prev <= 4) {
            soundEffects.playTick(true);
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [inSetup, mode, timerActive, hasAnswered, currentIndex]);

  // Handle timer expiration cleanly outside of setTimeLeft updater
  useEffect(() => {
    if (!inSetup && mode === 'battle' && timeLeft === 0 && !hasAnswered) {
      soundEffects.playWrong();
      setHasAnswered(true);
      setSelectedOption(null);
      setUserAnswers((prev) => [...prev, null]);
    }
  }, [timeLeft, inSetup, mode, hasAnswered]);

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);

    const currentQ = questions[currentIndex];
    const isCorrect = opt === currentQ.correctAnswer;

    setSelectedOption(opt);
    setHasAnswered(true);
    setUserAnswers((prev) => [...prev, opt]);

    if (isCorrect) {
      soundEffects.playCorrect();
      setScore((prev) => prev + 1);
      if (mode === 'battle' && timeLeft >= 12) {
        setFastAnswersCount((prev) => prev + 1);
      }
    } else {
      soundEffects.playWrong();
    }
  };

  const handleNextQuestion = () => {
    soundEffects.playClick();
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setHasAnswered(false);
      resetTimer();
    } else {
      // Finished Quiz!
      const totalQ = questions.length;
      const finalScore = score;

      const completion = recordQuizCompletion({
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        correctAnswers: finalScore,
        totalQuestions: totalQ,
        fastAnswersCount,
        mode,
      });

      onFinishQuiz({
        subject: selectedSubject,
        difficulty: selectedDifficulty,
        score: finalScore,
        totalQuestions: totalQ,
        xpEarned: completion.xpEarned,
        leveledUp: completion.leveledUp,
        newLevel: completion.newLevel,
        newBadges: completion.newBadges,
        questions,
        userAnswers,
        mode,
      });
    }
  };

  // ================= 1. SETUP / CATEGORY SELECTION SCREEN =================
  if (inSetup) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold uppercase tracking-wider">
            {mode === 'battle' ? 'Ranked Battle Config' : 'Practice Config'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white">
            {mode === 'battle' ? 'Initiate Quick Battle' : 'Practice Arena'}
          </h1>
          <p className="text-sm text-slate-400">
            {mode === 'battle' 
              ? 'Select your subject, difficulty level, and question volume to start the 15-second timed challenge.' 
              : 'Untimed relaxed arena with step-by-step curriculum explanations and Gemini AI coaching.'}
          </p>
        </div>

        {/* Step 1: Subject Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Step 1: Choose Subject
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUBJECTS.map((sub) => {
              const isSelected = selectedSubject === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedSubject(sub.id);
                  }}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${sub.color}`}>
                    Senior HS
                  </div>
                  <div className="font-extrabold text-sm sm:text-base leading-tight mb-1">
                    {sub.name}
                  </div>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    {sub.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Difficulty Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Step 2: Choose Difficulty
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'easy', label: 'Easy', multiplier: '1.0x XP', desc: 'Core fundamentals & definitions' },
              { id: 'medium', label: 'Medium', multiplier: '1.5x XP', desc: 'Multi-step problem solving' },
              { id: 'hard', label: 'Hard', multiplier: '2.0x XP', desc: 'Rigorous analytical proofs & deep application' },
            ].map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              return (
                <button
                  key={diff.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedDifficulty(diff.id as Difficulty);
                  }}
                  className={`p-4 rounded-2xl text-left border transition cursor-pointer ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm sm:text-base capitalize">{diff.label}</span>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {diff.multiplier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 hidden sm:block">{diff.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Question Count */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
            Step 3: Question Count
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[5, 10, 20].map((num) => {
              const isSelected = questionCount === num;
              return (
                <button
                  key={num}
                  onClick={() => {
                    soundEffects.playClick();
                    setQuestionCount(num);
                  }}
                  className={`p-3.5 rounded-2xl text-center border font-bold text-sm sm:text-base transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {num} Questions
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Action */}
        <div className="pt-4 flex items-center justify-between gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-3.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-sm transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStartQuiz}
            className="flex-1 max-w-sm py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 transition hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
          >
            Start {mode === 'battle' ? 'Battle' : 'Practice'} <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. ACTIVE QUIZ QUESTION SCREEN =================
  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);
  const isTimeExpiring = timeLeft <= 5 && mode === 'battle';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Header: Progress, Question Number, and Timer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {currentQ.subject}
            </span>
            <span className="text-xs font-bold uppercase text-slate-400">
              • {currentQ.difficulty}
            </span>
          </div>

          {/* Countdown Timer (Battle Mode) */}
          {mode === 'battle' ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-bold text-sm border transition-colors ${
                isTimeExpiring
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Timer className={`w-4 h-4 ${isTimeExpiring ? 'text-rose-400' : 'text-indigo-400'}`} />
              <span>{timeLeft}s</span>
            </div>
          ) : (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Practice Arena (Untimed)
            </span>
          )}
        </div>

        {/* Progress Bar & Question Count */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1.5">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>Score: <span className="text-emerald-400">{score}</span> / {currentIndex + (hasAnswered ? 1 : 0)}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-[#0e1628] to-slate-900 border border-indigo-500/20 shadow-2xl space-y-6">
        <div>
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">
            Question #{currentIndex + 1}
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed">
            {currentQ.question}
          </h2>
        </div>

        {/* 4 Answer Choice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
            const optionText = currentQ[`option${optKey}` as keyof Question];
            const isSelected = selectedOption === optKey;
            const isCorrect = currentQ.correctAnswer === optKey;

            let btnStyle = 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800';

            if (hasAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/50 shadow-lg shadow-emerald-900/30';
              } else if (isSelected && !isCorrect) {
                btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-100 ring-2 ring-rose-500/50 shadow-lg shadow-rose-900/30';
              } else {
                btnStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={optKey}
                disabled={hasAnswered}
                onClick={() => handleSelectOption(optKey)}
                className={`p-4 rounded-2xl text-left border font-medium text-sm sm:text-base transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${btnStyle}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    hasAnswered && isCorrect
                      ? 'bg-emerald-500 text-slate-950'
                      : hasAnswered && isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {optKey}
                </div>
                <div className="flex-1 pt-0.5 leading-snug">
                  {optionText}
                </div>
                {hasAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 self-center" />
                )}
                {hasAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-400 shrink-0 self-center" />
                )}
              </button>
            );
          })}
        </div>

        {/* Post-Answer Feedback & Explanation Panel */}
        {hasAnswered && (
          <div className="pt-4 space-y-4 border-t border-slate-800/80 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Status indicator */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              selectedOption === currentQ.correctAnswer
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
            }`}>
              {selectedOption === currentQ.correctAnswer ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="text-sm">
                <span className="font-bold block">
                  {selectedOption === currentQ.correctAnswer 
                    ? 'Correct Answer!' 
                    : selectedOption === null 
                    ? 'Time Expired!' 
                    : 'Incorrect Choice'}
                </span>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            </div>

            {/* Actions: AI Explainer & Next Question */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setAiModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition hover:scale-[1.02] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Explain With AI (Gemini Tutor)
              </button>

              <button
                onClick={handleNextQuestion}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-indigo-600/30 transition hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
              >
                {currentIndex + 1 < questions.length ? (
                  <>Next Question <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>View Final Results <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* AI Tutor Explanation Modal */}
      <AiExplainerModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        question={currentQ}
        chosenAnswer={selectedOption}
      />
    </div>
  );
};
