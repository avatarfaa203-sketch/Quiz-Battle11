import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, Award, ArrowRight } from 'lucide-react';
import { Badge } from '../types';
import { soundEffects } from '../utils/audio';

interface BadgeCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  badges: Badge[];
  leveledUp?: boolean;
  newLevel?: number;
}

export const BadgeCelebrationModal: React.FC<BadgeCelebrationModalProps> = ({
  isOpen,
  onClose,
  badges,
  leveledUp,
  newLevel,
}) => {
  useEffect(() => {
    if (isOpen) {
      if (leveledUp) {
        soundEffects.playLevelUp();
      } else {
        soundEffects.playVictory();
      }

      // Fire celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#eab308'],
      });
    }
  }, [isOpen, leveledUp]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-[#0b0f19] border border-indigo-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-indigo-900/40 text-center text-slate-100">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-400 via-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
          {leveledUp ? <Trophy className="w-8 h-8 text-amber-200" /> : <Award className="w-8 h-8 text-white" />}
        </div>

        {leveledUp && (
          <div className="mb-4">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-extrabold uppercase tracking-widest mb-1.5">
              Rank Up Achieved!
            </span>
            <h2 className="text-2xl font-black text-white">
              Promoted to Level {newLevel}!
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Your academic battle prowess has unlocked higher prestige and rankings.
            </p>
          </div>
        )}

        {badges.length > 0 && (
          <div className="space-y-3 my-4">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
              {badges.length === 1 ? 'New Badge Unlocked' : 'Badges Earned'}
            </span>
            <div className="space-y-2">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-2xl bg-slate-800/80 border border-indigo-500/30 flex items-center gap-3 text-left shadow-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{b.name}</h4>
                    <p className="text-xs text-slate-300 leading-tight mt-0.5">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          Claim & Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
