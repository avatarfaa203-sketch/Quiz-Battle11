import React, { useState } from 'react';
import { 
  GraduationCap, 
  Atom, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  Sparkles,
  ShieldCheck,
  Building2,
  Compass
} from 'lucide-react';
import { UserStats, ShsLevel } from '../types';
import { soundEffects } from '../utils/audio';
import { useAuth } from '../utils/AuthContext';

interface AuthScreenProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}

const AVATAR_OPTIONS = [
  { id: 'avatar_1', label: 'Scholar', gradient: 'from-blue-600 to-indigo-600' },
  { id: 'avatar_2', label: 'Sage', gradient: 'from-purple-600 to-pink-600' },
  { id: 'avatar_3', label: 'Chemist', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'avatar_4', label: 'Physicist', gradient: 'from-amber-500 to-red-600' },
  { id: 'avatar_5', label: 'Biologist', gradient: 'from-violet-600 to-cyan-600' },
];

const SHS_LEVEL_OPTIONS: { id: ShsLevel; label: string; desc: string }[] = [
  { id: 'SHS 1', label: 'SHS 1', desc: 'First Year' },
  { id: 'SHS 2', label: 'SHS 2', desc: 'Second Year' },
  { id: 'SHS 3', label: 'SHS 3', desc: 'Final / WASSCE' },
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  userStats,
  onStatsUpdated,
}) => {
  const { login, register, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [usernameInput, setUsernameInput] = useState('');
  const [schoolNameInput, setSchoolNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar_1');
  const [selectedShsLevel, setSelectedShsLevel] = useState<ShsLevel>('SHS 2');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);
    soundEffects.playClick();

    const res = await login(emailInput.trim(), passwordInput);
    setLoading(false);

    if (res.success) {
      soundEffects.playVictory();
      setSuccessMessage('Welcome back to SHS Science Hub!');
    } else {
      soundEffects.playWrong();
      setErrorMessage(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (usernameInput.trim().length < 2) {
      setErrorMessage('Username must be at least 2 characters.');
      return;
    }
    if (!schoolNameInput.trim() || schoolNameInput.trim().length < 3 || !/[a-zA-Z]{2,}/.test(schoolNameInput.trim())) {
      setErrorMessage('Please enter a valid Senior High School name (e.g. Achimota School, Prempeh College).');
      return;
    }
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setErrorMessage('Please enter a valid school or personal email.');
      return;
    }
    if (passwordInput.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (!selectedShsLevel) {
      setErrorMessage('Please select your current SHS Level (SHS 1, SHS 2, or SHS 3).');
      return;
    }

    setLoading(true);
    soundEffects.playClick();

    const res = await register(
      usernameInput.trim(),
      emailInput.trim(),
      passwordInput,
      selectedAvatar,
      selectedShsLevel,
      schoolNameInput.trim()
    );
    setLoading(false);

    if (res.success) {
      soundEffects.playVictory();
      setSuccessMessage('Student account created! Welcome to SHS Science Hub.');
    } else {
      soundEffects.playWrong();
      setErrorMessage(res.message || 'Registration failed.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailInput.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }
    if (passwordInput.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    soundEffects.playClick();

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.trim(),
          newPassword: passwordInput,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.success) {
        soundEffects.playVictory();
        setSuccessMessage(data.message || 'Password reset successfully!');
        setTimeout(() => {
          setMode('login');
          setSuccessMessage(null);
        }, 1200);
      } else {
        soundEffects.playWrong();
        setErrorMessage(data.message || 'Password reset failed.');
      }
    } catch {
      setLoading(false);
      setErrorMessage('Network error during password reset.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute top-0 right-1/4 -mt-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-1/4 -mb-24 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Brand Header */}
      <header className="relative z-10 max-w-7xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 text-white">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                SHS SCIENCE HUB
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                GHANA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Learn • Practice • Challenge • Achieve
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs font-semibold text-indigo-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Compulsory Student Authentication</span>
        </div>
      </header>

      {/* Main Centered Sign-In / Sign-Up Card */}
      <main className="relative z-10 w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {/* Card Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {mode === 'login'
                  ? 'Sign In to Hub'
                  : mode === 'register'
                  ? 'Create Student Account'
                  : 'Reset Password'}
              </h2>
              <p className="text-xs text-indigo-300 font-medium mt-0.5">
                {mode === 'login'
                  ? 'Sign in to access your quizzes, battle arena & stats'
                  : mode === 'register'
                  ? 'Join thousands of Ghanaian SHS students'
                  : 'Enter your email to set a new password'}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs (Log In vs Sign Up) */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-800 border border-slate-700/60 mb-5">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Student Sign Up
              </button>
            </div>
          )}

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ================= 1. LOGIN FORM ================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="e.g. kwame@school.edu.gh or kwame99"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Learning Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* ================= 2. REGISTER FORM ================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Student Name / Moniker
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    maxLength={20}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="e.g. Ama Mensah or AceScholar"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Senior High School Name</span>
                  <span className="text-[10px] text-amber-400 font-semibold lowercase tracking-normal">Compulsory for School Challenge</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={schoolNameInput}
                    onChange={(e) => setSchoolNameInput(e.target.value)}
                    maxLength={60}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="e.g. Achimota School, Prempeh College, Wesley Girls"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="student@school.edu.gh"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Create Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {/* SHS Level Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Current SHS Level (Curriculum Calibration)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SHS_LEVEL_OPTIONS.map((lvl) => (
                    <button
                      type="button"
                      key={lvl.id}
                      onClick={() => {
                        soundEffects.playClick();
                        setSelectedShsLevel(lvl.id);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                        selectedShsLevel === lvl.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="font-extrabold text-xs">{lvl.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{lvl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Student Avatar
                </label>
                <div className="flex items-center justify-between gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      type="button"
                      key={av.id}
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${av.gradient} flex items-center justify-center font-bold text-white text-xs border-2 transition cursor-pointer ${
                        selectedAvatar === av.id
                          ? 'border-white scale-110 shadow-lg shadow-indigo-500/40'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      {av.label.substring(0, 2)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Creating Account...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Account & Start Learning</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                >
                  Log in here
                </button>
              </div>
            </form>
          )}

          {/* ================= 3. FORGOT PASSWORD ================= */}
          {mode === 'forgot' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="student@school.edu.gh"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  New Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    minLength={6}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                    placeholder="New password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="w-full py-2.5 text-xs text-slate-400 hover:text-white font-bold text-center cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Continue as Guest Button */}
          <div className="pt-4 border-t border-slate-700/60 mt-4 text-center">
            <div className="relative flex items-center justify-center mb-3">
              <div className="border-t border-slate-700/80 w-full"></div>
              <span className="bg-slate-900 px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest relative">
                Or Explore Freely
              </span>
              <div className="border-t border-slate-700/80 w-full"></div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                continueAsGuest();
              }}
              className="w-full py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 text-slate-200 hover:text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
            >
              <Compass className="w-4 h-4 text-indigo-400 group-hover:rotate-45 transition-transform" />
              <span>Continue as Guest</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              Practice curriculum topics and NSMQ without an account. Sign in anytime to save your progress!
            </p>
          </div>
        </div>
      </main>

      {/* Footer Branding & Accreditation */}
      <footer className="relative z-10 text-center py-4 text-xs text-slate-400">
        <p className="text-indigo-300 font-semibold mb-0.5">
          SHS Science Hub • Learn • Practice • Challenge • Achieve
        </p>
        <p>Created & Developed by <strong className="text-indigo-400 font-bold">Avatar</strong></p>
      </footer>
    </div>
  );
};
