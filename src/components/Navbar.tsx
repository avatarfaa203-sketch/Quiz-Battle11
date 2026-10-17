import React, { useState } from 'react';
import { 
  Swords, 
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
  ShieldAlert
} from 'lucide-react';
import { UserStats } from '../types';
import { calculateLevelFromXP } from '../utils/storage';
import { soundEffects } from '../utils/audio';

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
  const [muted, setMuted] = useState(soundEffects.isMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const levelInfo = calculateLevelFromXP(userStats.xp);

  const toggleSound = () => {
    const next = soundEffects.toggleMute();
    setMuted(next);
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Trophy },
    { id: 'play', label: 'Play', icon: Play },
    { id: 'practice', label: 'Practice', icon: BookOpen },
    { id: 'multiplayer', label: 'Challenge', icon: Users },
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  QUIZ BATTLE
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden sm:inline-block">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                Challenge. Answer. Conquer.
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
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
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

            {/* User Level Pill */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 hover:border-indigo-500/50 transition cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                {levelInfo.level}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[100px]">
                  {userStats.username}
                </div>
                <div className="text-[10px] text-indigo-400 font-semibold leading-tight">
                  {userStats.xp} XP
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
            <div className="py-2 px-3 mb-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Player Profile</div>
                <div className="font-bold text-sm text-slate-200">{userStats.username}</div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Level {levelInfo.level}
                </span>
                <div className="text-xs text-indigo-400 font-semibold">{userStats.xp} XP</div>
              </div>
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {item.label}
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
                Edit Account / Name
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
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'home' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </button>
        <button
          onClick={() => handleNavClick('play')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'play' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white -mt-2 shadow-lg shadow-indigo-500/40">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </div>
          <span>Play</span>
        </button>
        <button
          onClick={() => handleNavClick('practice')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'practice' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <BookOpen className="w-5 h-5 mb-0.5" />
          <span>Practice</span>
        </button>
        <button
          onClick={() => handleNavClick('leaderboard')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'leaderboard' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" />
          <span>Rank</span>
        </button>
        <button
          onClick={() => handleNavClick('profile')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-lg text-[10px] font-semibold transition ${
            currentView === 'profile' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </button>
      </div>
    </>
  );
};
