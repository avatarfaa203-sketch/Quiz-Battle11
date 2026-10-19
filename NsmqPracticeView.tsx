import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Timer, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  HelpCircle, 
  Zap, 
  Dna, 
  FlaskConical, 
  Calculator, 
  Layers, 
  AlertTriangle,
  Lightbulb,
  Award
} from 'lucide-react';
import { Difficulty, Question, ShsLevel, Subject, UserStats } from '../../types';
import { loadAllQuestions, recordQuizCompletion } from '../../utils/storage';
import { soundEffects } from '../../utils/audio';

interface NsmqPracticeViewProps {
  userStats: UserStats;
  onFinishQuiz: (result: any) => void;
  onCancel: () => void;
}

type NsmqSubjectFilter = 'Mixed' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology';
type NsmqRoundFilter = 'all' | 'general' | 'speed' | 'problem' | 'true_false' | 'riddle';

export const NsmqPracticeView: React.FC<NsmqPracticeViewProps> = ({
  userStats,
  onFinishQuiz,
  onCancel,
}) => {
  // Setup State
  const [inSetup, setInSetup] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<NsmqSubjectFilter>('Mixed');
  const [selectedLevel, setSelectedLevel] = useState<ShsLevel | 'All'>(userStats.shsLevel || 'SHS 2');
  const [selectedRound, setSelectedRound] = useState<NsmqRoundFilter>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Active Quiz State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [score, setScore] = useState(0);
  const [fastAnswersCount, setFastAnswersCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [cluesRevealed, setCluesRevealed] = useState(1);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStartPractice = () => {
    soundEffects.playClick();
    const all = loadAllQuestions();

    // Filter by NSMQ or appropriate science/math questions
    let pool = all.filter((q) => {
      // Filter by subject
      if (selectedSubject !== 'Mixed') {
        if (selectedSubject === 'Mathematics') {
          if (q.subject !== 'Core Mathematics' && q.subject !== 'Mathematics' && q.subject !== 'Additional Mathematics') return false;
        } else if (q.subject !== selectedSubject) {
          return false;
        }
      } else {
        // Only STEM subjects for NSMQ
        const stem = ['Core Mathematics', 'Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology'];
        if (!stem.includes(q.subject)) return false;
      }

      // Filter by Level
      if (selectedLevel !== 'All' && q.shsLevel && q.shsLevel !== selectedLevel) {
        return false;
      }

      // Filter by Round
      if (selectedRound !== 'all') {
        if (q.nsmqRound && q.nsmqRound !== selectedRound) return false;
      }

      // Filter by Difficulty
      if (selectedDifficulty !== 'mixed' && q.difficulty !== selectedDifficulty) {
        return false;
      }

      return true;
    });

    if (pool.length === 0) {
      // Fallback to all science/math questions
      pool = all.filter((q) => ['Core Mathematics', 'Mathematics', 'Additional Mathematics', 'Physics', 'Chemistry', 'Biology'].includes(q.subject));
    }

    // Shuffle and pick
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));

    setQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers([]);
    setScore(0);
    setFastAnswersCount(0);
    setSelectedOption(null);
    setHasAnswered(false);
    setInSetup(false);
    setCluesRevealed(1);
    startQuestionTimer(selected[0]);
  };

  const startQuestionTimer = (q?: Question) => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Speed round gets 15 seconds; Problem round gets 45s; others get 25s
    const seconds = q?.nsmqRound === 'speed' ? 15 : q?.nsmqRound === 'problem' ? 45 : 25;
    setTimeLeft(seconds);
    setTimerActive(true);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeOut = () => {
    if (hasAnswered) return;
    soundEffects.playWrong();
    setHasAnswered(true);
    setSelectedOption(null);
    setUserAnswers((prev) => [...prev, null]);
  };

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (hasAnswered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);

    setSelectedOption(opt);
    setHasAnswered(true);

    const currentQ = questions[currentIndex];
    const isCorrect = opt === currentQ.correctAnswer;

    if (isCorrect) {
      soundEffects.playCorrect();
      setScore((s) => s + 1);
      if (timeLeft >= 15) {
        setFastAnswersCount((f) => f + 1);
      }
    } else {
      soundEffects.playWrong();
    }

    setUserAnswers((prev) => [...prev, opt]);
  };

  const handleNext = () => {
    soundEffects.playClick();
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSelectedOption(null);
      setHasAnswered(false);
      setCluesRevealed(1);
      startQuestionTimer(questions[nextIdx]);
    } else {
      // Finished NSMQ Quiz!
      completeQuiz();
    }
  };

  const completeQuiz = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);

    const completion = recordQuizCompletion({
      subject: selectedSubject === 'Mixed' ? 'Mathematics' : (selectedSubject as Subject),
      difficulty: selectedDifficulty === 'mixed' ? 'hard' : selectedDifficulty,
      correctAnswers: score,
      totalQuestions: questions.length,
      fastAnswersCount,
      mode: 'practice'
    });

    onFinishQuiz({
      subject: (selectedSubject === 'Mixed' ? 'Core Mathematics' : selectedSubject) as Subject,
      difficulty: selectedDifficulty === 'mixed' ? 'hard' : selectedDifficulty,
      score,
      totalQuestions: questions.length,
      xpEarned: completion.xpEarned + 50, // Bonus for NSMQ practice!
      leveledUp: completion.leveledUp,
      newLevel: completion.newLevel,
      newBadges: completion.newBadges,
      questions,
      userAnswers,
      mode: 'practice',
    });
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const currentQ = questions[currentIndex];

  // ================= 1. SETUP VIEW =================
  if (inSetup) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 pb-16">
        {/* Unofficial Disclaimer & Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/40 via-slate-900 to-[#0b0f19] p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Independent Practice Arena
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                NSMQ Practice Mode
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Experience high-caliber science and mathematics training modeled after the National Science & Maths Quiz format. Practice speed races, analytical problems, true/false rounds, and riddles.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Independent Educational Resource:</strong> SHS Science Hub is an independent study tool. All practice questions are original works created for academic preparation.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          {/* 1. Subject */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Choose Subject Area
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { id: 'Mixed', label: 'All-Round Mixed', icon: Layers, color: 'text-purple-400' },
                { id: 'Mathematics', label: 'Mathematics', icon: Calculator, color: 'text-blue-400' },
                { id: 'Physics', label: 'Physics', icon: Zap, color: 'text-amber-400' },
                { id: 'Chemistry', label: 'Chemistry', icon: FlaskConical, color: 'text-emerald-400' },
                { id: 'Biology', label: 'Biology', icon: Dna, color: 'text-green-400' },
              ].map((subj) => {
                const Icon = subj.icon;
                const isSelected = selectedSubject === subj.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setSelectedSubject(subj.id as NsmqSubjectFilter);
                    }}
                    className={`p-3 rounded-2xl border text-center transition cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${subj.color}`} />
                    <span className="text-xs font-bold truncate max-w-full">{subj.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Format / Round */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              2. Choose Practice Format / Round
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'all', title: 'All Rounds Mixed', desc: 'Balanced tournament blend' },
                { id: 'general', title: 'Round 1: General Science', desc: 'Core theory & principles' },
                { id: 'speed', title: 'Round 2: Speed Race', desc: '15-second rapid mental reflexes' },
                { id: 'problem', title: 'Round 3: Problem of the Day', desc: 'In-depth multi-step math/physics' },
                { id: 'true_false', title: 'Round 4: True or False', desc: 'Conceptual accuracy testing' },
                { id: 'riddle', title: 'Round 5: Riddle Challenge', desc: '"Who Am I?" progressive clues' },
              ].map((rnd) => {
                const isSelected = selectedRound === rnd.id;
                return (
                  <button
                    key={rnd.id}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setSelectedRound(rnd.id as NsmqRoundFilter);
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow'
                        : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="text-xs font-extrabold">{rnd.title}</span>
                    <span className="text-[10px] text-slate-400">{rnd.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. SHS Curriculum Level Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              3. Curriculum Level Filter
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {(['All', 'SHS 1', 'SHS 2', 'SHS 3'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedLevel(lvl);
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                    selectedLevel === lvl
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {lvl === 'All' ? 'All SHS Levels' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Question Count */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              4. Number of Questions
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[5, 10, 15].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setQuestionCount(cnt);
                  }}
                  className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                    questionCount === cnt
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow'
                      : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800">
            <button
              onClick={onCancel}
              className="py-3 px-5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Back to Dashboard
            </button>

            <button
              onClick={handleStartPractice}
              className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 fill-current" />
              Begin NSMQ Practice Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. ACTIVE QUIZ VIEW =================
  if (!currentQ) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <p className="text-slate-300">No practice questions matched your criteria.</p>
        <button
          onClick={() => setInSetup(true)}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold"
        >
          Adjust Filters
        </button>
      </div>
    );
  }

  const isRiddle = currentQ.nsmqRound === 'riddle' && currentQ.clues && currentQ.clues.length > 0;
  const isSpeed = currentQ.nsmqRound === 'speed';

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* Top Header Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                NSMQ Practice
              </span>
              {currentQ.nsmqRound && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-bold uppercase">
                  {currentQ.nsmqRound.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Question {currentIndex + 1} of {questions.length} • {currentQ.subject}
            </p>
          </div>
        </div>

        {/* Timer Pill */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border font-mono font-bold text-sm ${
          timeLeft <= 5
            ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 animate-pulse'
            : isSpeed
            ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
            : 'bg-slate-800 border-slate-700 text-slate-200'
        }`}>
          <Timer className="w-4 h-4" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {/* Question Main Panel */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">{currentQ.topic || 'General Science & Math'}</span>
            <span className="font-bold text-amber-400">{currentQ.difficulty.toUpperCase()}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
            {currentQ.question}
          </h2>

          {/* Special Clues Reveal for Riddles */}
          {isRiddle && (
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  Riddle Clues
                </span>
                {cluesRevealed < currentQ.clues!.length && (
                  <button
                    type="button"
                    onClick={() => setCluesRevealed((c) => Math.min(c + 1, currentQ.clues!.length))}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold"
                  >
                    Reveal Next Clue ({cluesRevealed}/{currentQ.clues!.length})
                  </button>
                )}
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                {currentQ.clues!.slice(0, cluesRevealed).map((clue, idx) => (
                  <div key={idx} className="p-2 rounded-xl bg-slate-900/60 border border-amber-500/20">
                    {clue}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
            const optKey = `option${letter}` as keyof Question;
            const text = currentQ[optKey] as string;
            if (!text) return null;

            const isSelected = selectedOption === letter;
            const isCorrect = letter === currentQ.correctAnswer;

            let btnStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-800';

            if (hasAnswered) {
              if (isCorrect) {
                btnStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/20';
              } else if (isSelected) {
                btnStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 shadow-md shadow-rose-500/20';
              } else {
                btnStyle = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
              }
            }

            return (
              <button
                key={letter}
                disabled={hasAnswered}
                onClick={() => handleSelectOption(letter)}
                className={`p-4 rounded-2xl border text-left font-medium transition cursor-pointer flex items-center gap-3 ${btnStyle}`}
              >
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  hasAnswered && isCorrect
                    ? 'bg-emerald-500 text-slate-950'
                    : hasAnswered && isSelected
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {letter}
                </span>
                <span className="text-sm font-semibold flex-1 leading-snug">{text}</span>
              </button>
            );
          })}
        </div>

        {/* Post Answer Feedback & Mathematical / Scientific Explanation */}
        {hasAnswered && (
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              {selectedOption === currentQ.correctAnswer ? (
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Correct Answer! Excellent scientific reasoning.
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-sm">
                  <XCircle className="w-5 h-5" />
                  Incorrect. The correct answer is ({currentQ.correctAnswer}).
                </div>
              )}
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60">
              <strong className="text-amber-300 block mb-1">Scientific Explanation:</strong>
              {currentQ.explanation}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleNext}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {currentIndex + 1 < questions.length ? (
                  <>
                    Next Question <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Complete Practice & View Score <Trophy className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
