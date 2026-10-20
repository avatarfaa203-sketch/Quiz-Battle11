import React, { useState } from 'react';
import { 
  X, 
  User, 
  Sparkles, 
  Check, 
  Shield, 
  Mail, 
  Lock, 
  LogOut, 
  ArrowRight, 
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Building2
} from 'lucide-react';
import { UserStats, ShsLevel } from '../types';
import { updateUsername, updateShsLevel } from '../utils/storage';
import { soundEffects } from '../utils/audio';
import { useAuth } from '../utils/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  { id: 'SHS 1', label: 'SHS 1', desc: 'First Year Foundation' },
  { id: 'SHS 2', label: 'SHS 2', desc: 'Second Year Core & Electives' },
  { id: 'SHS 3', label: 'SHS 3', desc: 'Final Year / WASSCE Prep' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  userStats,
  onStatsUpdated,
}) => {
  const { user, isAuthenticated, login, register, logout, updateProfile } = useAuth();

  const [mode, setMode] = useState<'profile' | 'login' | 'register' | 'forgot'>(
    isAuthenticated ? 'profile' : 'login'
  );

  // Form states
  const [usernameInput, setUsernameInput] = useState(user?.username || userStats.username);
  const [schoolNameInput, setSchoolNameInput] = useState(user?.schoolName || userStats.schoolName || '');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || userStats.avatar || 'avatar_1');
  const [selectedShsLevel, setSelectedShsLevel] = useState<ShsLevel>(
    user?.shsLevel || userStats.shsLevel || 'SHS 2'
  );
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

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
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 900);
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
      setErrorMessage('Please enter a valid Senior High School name (at least 3 characters).');
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
      setSuccessMessage('Account created! Curriculum aligned to ' + selectedShsLevel);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 900);
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
        }, 1500);
      } else {
        soundEffects.playWrong();
        setErrorMessage(data.message || 'Password reset failed.');
      }
    } catch {
      setLoading(false);
      setErrorMessage('Network error during password reset.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    soundEffects.playClick();

    if (isAuthenticated) {
      if (schoolNameInput.trim() && (schoolNameInput.trim().length < 3 || !/[a-zA-Z]{2,}/.test(schoolNameInput.trim()))) {
        setErrorMessage('Please enter a valid Senior High School name (at least 3 characters).');
        return;
      }
      setLoading(true);
      const res = await updateProfile({
        username: usernameInput.trim(),
        avatar: selectedAvatar,
        shsLevel: selectedShsLevel,
        schoolName: schoolNameInput.trim() || undefined,
      });
      setLoading(false);

      if (res.success) {
        setSuccessMessage('Profile saved and synced to cloud!');
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 800);
      } else {
        setErrorMessage(res.message || 'Failed to update profile.');
      }
    } else {
      const updatedUser = updateUsername(usernameInput.trim());
      const updatedLevel = updateShsLevel(selectedShsLevel);
      onStatsUpdated({ ...updatedUser, ...updatedLevel });
      setSuccessMessage('Student details saved locally!');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 800);
    }
  };

  const handleLogout = async () => {
    soundEffects.playClick();
    await logout();
    setMode('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xl font-black text-white">
                {isAuthenticated
                  ? 'Student Account & Settings'
                  : mode === 'login'
                  ? 'Sign In to SHS Science Hub'
                  : mode === 'register'
                  ? 'Create Student Account'
                  : 'Reset Password'}
              </h3>
            </div>
            <p className="text-xs text-indigo-300 font-medium">
              Learn • Practice • Challenge • Achieve
            </p>
          </div>
        </div>

        {/* Success or Error alerts */}
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

        {/* ================= 1. AUTHENTICATED PROFILE VIEW ================= */}
        {isAuthenticated ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email:
                </span>
                <span className="font-semibold text-white truncate max-w-[200px]">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Current Level:
                </span>
                <span className="font-bold text-indigo-300 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30">
                  {user?.shsLevel || userStats.shsLevel || 'SHS 2'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Cloud Progress:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active & Synced
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Student Name / Moniker
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                maxLength={20}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 outline-none text-white font-medium text-sm transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Senior High School</span>
                <span className="text-[10px] text-amber-400 font-semibold lowercase">School Challenge</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={schoolNameInput}
                  onChange={(e) => setSchoolNameInput(e.target.value)}
                  maxLength={60}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 outline-none text-white font-medium text-sm transition"
                  placeholder="e.g. Achimota School, Prempeh College"
                />
              </div>
            </div>

            {/* SHS Level Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Update SHS Level
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
                    <div className="text-[10px] text-slate-400 truncate">{lvl.desc.split(' ')[0]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Avatar
              </label>
              <div className="flex items-center justify-between gap-2">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    type="button"
                    key={av.id}
                    onClick={() => setSelectedAvatar(av.id)}
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${av.gradient} flex items-center justify-center font-bold text-white text-xs border-2 transition cursor-pointer ${
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

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleLogout}
                className="py-2.5 px-4 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Save Profile
              </button>
            </div>
          </form>
        ) : (
          /* ================= 2. GUEST / LOGIN / REGISTER / FORGOT VIEWS ================= */
          <div>
            {/* Tab switch between Login and Register */}
            {mode !== 'forgot' && (
              <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-800 border border-slate-700/60 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playClick();
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'login'
                      ? 'bg-indigo-600 text-white shadow'
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
                  }}
                  className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mode === 'register'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Student Sign Up
                </button>
              </div>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email or Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <ArrowRight className="w-4 h-4" /> {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            )}

            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Student Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      maxLength={20}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                      placeholder="e.g. MensahScience"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Senior High School Name</span>
                    <span className="text-[10px] text-rose-400 font-bold">* Required</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={schoolNameInput}
                      onChange={(e) => setSchoolNameInput(e.target.value)}
                      maxLength={60}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                      placeholder="e.g. Achimota School, Prempeh College"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                      placeholder="student@example.com"
                      required
                    />
                  </div>
                </div>

                {/* SHS Level Selection - Required */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                    SHS Level <span className="text-rose-400">*</span>
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
                            ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-lg shadow-indigo-600/20'
                            : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-extrabold text-xs">{lvl.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{lvl.desc}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Learning topics and practice quizzes will adapt to your {selectedShsLevel} curriculum.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Avatar
                  </label>
                  <div className="flex items-center justify-between gap-1.5">
                    {AVATAR_OPTIONS.map((av) => (
                      <button
                        type="button"
                        key={av.id}
                        onClick={() => setSelectedAvatar(av.id)}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${av.gradient} flex items-center justify-center font-bold text-white text-[11px] border-2 transition cursor-pointer ${
                          selectedAvatar === av.id ? 'border-white scale-105' : 'border-transparent opacity-60'
                        }`}
                      >
                        {av.label.substring(0, 2)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-300">
                  ✨ <strong>Safe migration:</strong> Your existing local XP ({userStats.xp} XP) and unlocked badges will be preserved in your cloud account!
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" /> {loading ? 'Creating...' : 'Register Student Account'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your registered student email address and choose a new password.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 outline-none text-white text-sm"
                      placeholder="you@school.edu.gh"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Resetting...' : 'Set New Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Professional Creator Credit in Modal Footer */}
        <div className="mt-5 pt-3.5 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            Created & Developed by <span className="text-indigo-400 font-semibold">Avatar</span>
          </p>
        </div>
      </div>
    </div>
  );
};
