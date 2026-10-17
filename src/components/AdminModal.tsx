import React, { useState } from 'react';
import { X, ShieldAlert, ArrowRight } from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === 'admin123' || passcode.trim() === 'admin') {
      soundEffects.playVictory();
      setPasscode('');
      setError(false);
      onSuccess();
      onClose();
    } else {
      soundEffects.playWrong();
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 text-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-white">Curriculum Admin Access</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Protected area for managing the 80+ senior high school question bank.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="Enter passcode (default: admin123)"
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-800 border text-center font-mono text-sm text-white outline-none focus:border-indigo-500 ${
                error ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-700'
              }`}
              autoFocus
            />
            {error && (
              <p className="text-xs text-rose-400 mt-1 font-semibold">
                Invalid passcode. Hint: Use <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">admin123</code>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              Unlock <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
