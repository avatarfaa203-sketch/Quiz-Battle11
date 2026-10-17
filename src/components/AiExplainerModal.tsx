import React, { useState, useEffect } from 'react';
import { X, Sparkles, BookOpen, Brain, CheckCircle, RefreshCw } from 'lucide-react';
import { Question } from '../types';

interface AiExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question;
  chosenAnswer?: string | null;
}

export const AiExplainerModal: React.FC<AiExplainerModalProps> = ({
  isOpen,
  onClose,
  question,
  chosenAnswer,
}) => {
  const [loading, setLoading] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('');
  const [isAiGenerated, setIsAiGenerated] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAiExplanation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/ai-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question,
          correctAnswer: `${question.correctAnswer} (${question[`option${question.correctAnswer}` as keyof Question]})`,
          chosenAnswer: chosenAnswer ? `${chosenAnswer} (${question[`option${chosenAnswer}` as keyof Question]})` : null,
          explanation: question.explanation,
          subject: question.subject,
        }),
      });

      const data = await res.json();
      if (data.success && data.explanation) {
        setExplanationText(data.explanation);
        setIsAiGenerated(true);
      } else {
        setExplanationText(data.fallbackExplanation || question.explanation);
        setIsAiGenerated(false);
      }
    } catch {
      setExplanationText(question.explanation);
      setIsAiGenerated(false);
      setErrorMsg('Connected to offline curriculum explanation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAiExplanation();
    }
  }, [isOpen, question.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-indigo-500/30 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-indigo-950/50 text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">AI Tutor Deep Dive</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {question.subject}
                </span>
              </div>
              <p className="text-xs text-slate-400">Senior high school concept mastery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto py-5 space-y-4 flex-1">
          {/* Question Summary Pill */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
              Question Under Review
            </span>
            <p className="text-slate-200 font-medium">{question.question}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Correct: Option {question.correctAnswer} - {question[`option${question.correctAnswer}` as keyof Question]}
              </span>
              {chosenAnswer && chosenAnswer !== question.correctAnswer && (
                <span className="text-rose-400">
                  Your pick: Option {chosenAnswer}
                </span>
              )}
            </div>
          </div>

          {/* AI or Fallback Content */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <Brain className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Consulting AI Academic Tutor...</p>
                <p className="text-xs text-slate-400">Breaking down principles, proofs, and exam tips</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wide">
                    {isAiGenerated ? <Sparkles className="w-3.5 h-3.5 text-purple-400" /> : <BookOpen className="w-3.5 h-3.5 text-blue-400" />}
                    {isAiGenerated ? 'Gemini Concept Explanation' : 'Standard Curriculum Explanation'}
                  </span>
                  <button
                    onClick={fetchAiExplanation}
                    title="Regenerate explanation"
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 text-xs flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
                <div className="text-sm text-slate-200 whitespace-pre-line leading-relaxed font-normal">
                  {explanationText}
                </div>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-slate-400 italic text-center">
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition cursor-pointer"
          >
            Back to Quiz
          </button>
        </div>
      </div>
    </div>
  );
};
