import React from 'react';
import { 
  Play, 
  BookOpen, 
  Trophy, 
  Users, 
  Zap, 
  Shield, 
  Sparkles, 
  ArrowRight, 
  BrainCircuit, 
  Target, 
  Flame,
  CheckCircle2,
  GraduationCap,
  Atom,
  Award
} from 'lucide-react';
import { SHS_SUBJECTS } from '../../data/curriculum';
import { soundEffects } from '../../utils/audio';

interface HomeViewProps {
  onNavigate: (view: string, subject?: string) => void;
  onOpenAuth: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const handleAction = (view: string, subject?: string) => {
    soundEffects.playClick();
    onNavigate(view, subject);
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-slate-900/90 via-[#0e1628]/80 to-[#0b0f19] p-6 sm:p-10 lg:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold tracking-wide">
            <Atom className="w-3.5 h-3.5 text-indigo-400" />
            Ghanaian Senior High School Academic Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            SHS <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">SCIENCE HUB</span>
          </h1>

          <p className="text-base sm:text-lg font-extrabold tracking-widest text-indigo-300 uppercase">
            Learn • Practice • Challenge • Achieve
          </p>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto font-normal leading-relaxed">
            Curriculum-aligned practice in Core Mathematics, Additional Mathematics, Physics, Chemistry, and Biology. Master topics from SHS 1 to SHS 3, prepare for NSMQ, challenge classmates 1v1, and conquer exams.
          </p>

          {/* Core Action Buttons */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => handleAction('practice')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/35 transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 fill-current" />
              Practice Topics (SHS 1 - 3)
            </button>

            <button
              onClick={() => handleAction('nsmq')}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-amber-500/25 transition hover:scale-[1.02] flex items-center gap-2 cursor-pointer"
            >
              <Flame className="w-4 h-4 fill-current text-slate-950" />
              NSMQ Practice Mode
            </button>

            <button
              onClick={() => handleAction('multiplayer')}
              className="px-6 py-3.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white font-bold text-sm sm:text-base border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-purple-400" />
              Challenge a Friend
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <button 
              onClick={() => handleAction('leaderboard')}
              className="hover:text-indigo-300 flex items-center gap-1.5 transition"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Leaderboard Rankings
            </button>
            <span>•</span>
            <button 
              onClick={onOpenAuth}
              className="hover:text-indigo-300 flex items-center gap-1.5 transition"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" /> Student Sign In / Register
            </button>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/30 transition group">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Subject → Topic Flow</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Deliberately pick your subject, explore topics mapped strictly to your SHS 1, SHS 2, or SHS 3 level, choose question counts, and practice with step-by-step solutions.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/30 transition group">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">NSMQ Practice Arena</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Original speed races, problem-solving, true/false statements, and riddles built specifically to prepare students for the academic rigor of Science and Maths competitions.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/30 transition group">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">1v1 Friend Challenge</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Create custom room codes and challenge classmates in real-time synchronized multiplayer academic matches with live scoring and XP.
          </p>
        </div>
      </section>

      {/* Curriculum Subject Arenas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Ghana SHS Curriculum Arenas</h2>
            <p className="text-xs sm:text-sm text-slate-400">Select any subject to choose specific curriculum topics and start practicing</p>
          </div>
          <button
            onClick={() => handleAction('practice')}
            className="text-xs sm:text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
          >
            Explore All Subjects <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {SHS_SUBJECTS.filter(s => s.isCoreScience).map((sub) => (
            <div
              key={sub.id}
              onClick={() => handleAction('practice', sub.id)}
              className={`p-4 rounded-2xl bg-gradient-to-br ${sub.bgGradient} border backdrop-blur-sm hover:scale-[1.02] transition cursor-pointer flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${sub.color}`}>
                    SHS 1 • 2 • 3
                  </span>
                  <Target className={`w-4 h-4 ${sub.color}`} />
                </div>
                <h3 className="text-base font-extrabold text-white mb-1">{sub.name}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{sub.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Curriculum Mapped</span>
                <span className="text-indigo-300 flex items-center gap-0.5">
                  Select <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Creator Credit Footer Card */}
      <section className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Curriculum Calibrated Content</h4>
            <p className="text-xs text-slate-400">
              Structured for Ghanaian Senior High School students preparing for WASSCE & NSMQ.
            </p>
            <p className="text-[11px] text-indigo-400 font-semibold pt-1">
              Created & Developed by <span className="text-white font-bold">Avatar</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => handleAction('dashboard')}
          className="whitespace-nowrap px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Open Student Dashboard
        </button>
      </section>
    </div>
  );
};
