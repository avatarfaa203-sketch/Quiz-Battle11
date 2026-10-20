import React, { useState } from 'react';
import { 
  Home, 
  Play, 
  BookOpen, 
  Trophy, 
  User, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Users,
  Menu,
  X,
  ShieldAlert,
  GraduationCap,
  Atom,
  Flame,
  Building2
} from 'lucide-react';
import { UserStats, ShsLevel } from '../types';
import { calculateLevelFromXP } from '../utils/storage';
import { soundEffects } from '../utils/audio';
import { useAuth } from '../utils/AuthContext';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userStats: UserStats;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  userStats,
  onOpenAuth,
  onOpenAdmin,
}) => {
  const { user, isAuthenticated, isGuest, exitGuestMode } = useAuth();
  const [muted, setMuted] = useState(soundEffects.isMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const levelInfo = calculateLevelFromXP(userStats.xp);
  const activeShsLevel: ShsLevel = user?.shsLevel || userStats.shsLevel || 'SHS 2';

  const toggleSound = () => {
    const next = soundEffects.toggleMute();
    setMuted(next);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Trophy },
    { id: 'practice', label: 'Curriculum Quiz', icon: BookOpen },
    { id: 'nsmq', label: 'NSMQ Practice', icon: Flame, badge: 'New' },
    { id: 'multiplayer', label: 'Multiplayer Arena', icon: Users },
    { id: 'school-challenge', label: 'School Challenge', icon: Building2, badge: 'Inter-School' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleNavClick = (viewId: string) => {
    soundEffects.playClick();
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#0b0f19]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <button 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left group transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform text-white">
              <Atom className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  SHS SCIENCE HUB
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-block">
                  GHANA
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium hidden md:block tracking-wide">
                Learn • Practice • Challenge • Achieve
              </p>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer relative ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Status, Sound & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              title={muted ? 'Unmute sounds' : 'Mute sounds'}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/60 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Guest Action: Obvious Sign In / Create Account Button */}
            {isGuest && (
              <button
                onClick={onOpenAuth}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition cursor-pointer"
                title="Create an account or sign in to save your progress permanently"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save Progress / </span>
                <span>Sign In</span>
              </button>
            )}

            {/* Student Level & Account Pill */}
            <button
              onClick={onOpenAuth}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition cursor-pointer ${
                isGuest 
                  ? 'bg-amber-500/10 border border-amber-500/40 hover:border-amber-400 text-amber-200' 
                  : 'bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner ${
                isGuest 
                  ? 'bg-gradient-to-tr from-amber-500 to-orange-600 text-slate-950 font-black' 
                  : 'bg-gradient-to-tr from-indigo-500 to-purple-500'
              }`}>
                {isGuest ? 'G' : user?.avatar ? user.username.substring(0, 2).toUpperCase() : levelInfo.level}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px] flex items-center gap-1">
                  <span>{isGuest ? 'Guest Scholar' : user ? user.username : userStats.username}</span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                    isGuest 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {isGuest ? 'Guest' : activeShsLevel}
                  </span>
                </div>
                <div className="text-[10px] text-indigo-400 font-semibold leading-tight flex items-center gap-1">
                  <span>{isGuest ? 'Temporary Session' : `Lvl ${levelInfo.level} • ${userStats.xp} XP`}</span>
                </div>
              </div>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0b0f19] px-4 pt-3 pb-6 space-y-1.5 shadow-2xl">
            <div className={`py-2.5 px-3.5 mb-2 rounded-2xl border flex items-center justify-between ${
              isGuest ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900 border border-slate-800'
            }`}>
              <div>
                <div className="text-xs text-slate-400">{isGuest ? 'Guest Session' : 'Student Profile'}</div>
                <div className="font-extrabold text-sm text-slate-200 flex items-center gap-1.5">
                  {isGuest ? 'Guest Scholar' : userStats.username}
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                    isGuest ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {isGuest ? 'Guest' : activeShsLevel}
                  </span>
                </div>
              </div>
              <div className="text-right">
                {isGuest ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition cursor-pointer"
                  >
                    Sign In
                  </button>
                ) : (
                  <>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Level {levelInfo.level}
                    </span>
                    <div className="text-xs text-indigo-400 font-semibold">{userStats.xp} XP</div>
                  </>
                )}
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Account Settings ({activeShsLevel})
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Mobile Bottom Quick-Action Dock */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 border-t border-slate-800/80 backdrop-blur-lg px-2 py-1.5 flex justify-around items-center">
        <button
          onClick={() => handleNavClick('home')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'home' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-4 h-4 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleNavClick('practice')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'practice' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          <span>Learn</span>
        </button>
        <button
          onClick={() => handleNavClick('nsmq')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'nsmq' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}
        >
          <Flame className="w-4 h-4 mb-0.5 text-amber-400" />
          <span>NSMQ</span>
        </button>
        <button
          onClick={() => handleNavClick('multiplayer')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'multiplayer' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>1v1</span>
        </button>
        <button
          onClick={() => handleNavClick('profile')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'profile' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          <span>Profile</span>
        </button>
      </div>
    </>
  );
};
