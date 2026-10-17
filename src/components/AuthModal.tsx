import React, { useState } from 'react';
import { X, User, Sparkles, Check, Shield } from 'lucide-react';
import { UserStats } from '../types';
import { updateUsername } from '../utils/storage';
import { soundEffects } from '../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userStats,
  onStatsUpdated,
}) => {
  const [nameInput, setNameInput] = useState(userStats.username);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    soundEffects.playClick();
    const updated = updateUsername(nameInput.trim());
    onStatsUpdated(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Player Profile & Account</h3>
            <p className="text-xs text-slate-400">Set your battle moniker & sync records</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Battle Username
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white font-medium text-sm transition"
              placeholder="Enter your username..."
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Visible on global leaderboards and in multiplayer battle rooms.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                Player ID:
              </span>
              <span className="font-mono text-slate-400">QB-{userStats.username.substring(0, 3).toUpperCase()}-{userStats.level}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Account Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Active & Synced
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" /> Saved!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Save Moniker
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
