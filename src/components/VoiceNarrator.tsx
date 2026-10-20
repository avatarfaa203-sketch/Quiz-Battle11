import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Pause, Play, Square, Gauge, Sparkles } from 'lucide-react';

interface VoiceNarratorProps {
  text: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

export const VoiceNarrator: React.FC<VoiceNarratorProps> = ({
  text,
  label = 'Listen to Explanation',
  compact = false,
  className = '',
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState<number>(1.0);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize SpeechSynthesis and find optimal teacher voice
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);

      const findTeacherVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;

        // Preferred teacher voices: clear British English or standard English natural voices
        const preferred = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google UK English Female') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Serena') ||
              v.name.includes('Teacher'))
        );

        const standardEnglish = voices.find((v) => v.lang.startsWith('en-GB') || v.lang.startsWith('en-US') || v.lang.startsWith('en'));
        setSelectedVoice(preferred || standardEnglish || voices[0] || null);
      };

      findTeacherVoice();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = findTeacherVoice;
      }
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // When text changes, stop any existing narration
  useEffect(() => {
    stopNarration();
  }, [text]);

  const cleanTextForSpeech = (raw: string) => {
    // Strip markdown formatting symbols like **, ##, etc. for smooth reading
    return raw
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/Option ([A-D]):?/gi, 'Option $1.')
      .trim();
  };

  const startNarration = () => {
    if (!isSupported || !text) return;
    window.speechSynthesis.cancel();

    const cleaned = cleanTextForSpeech(text);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utteranceRef.current = utterance;

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
      setIsPlaying(false);
    };

    utterance.onresume = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const pauseNarration = () => {
    if (!isSupported) return;
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const resumeNarration = () => {
    if (!isSupported) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      startNarration();
    }
  };

  const stopNarration = () => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const toggleRate = () => {
    const rates = [0.8, 1.0, 1.25];
    const nextIdx = (rates.indexOf(rate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setRate(nextRate);
    if (isPlaying || isPaused) {
      stopNarration();
    }
  };

  if (!isSupported) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${
        compact ? 'text-xs' : 'text-xs sm:text-sm'
      } ${className}`}
    >
      {/* Primary Listen / Resume / Pause Button */}
      {!isPlaying && !isPaused ? (
        <button
          type="button"
          onClick={startNarration}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 font-bold transition shadow-sm cursor-pointer"
          title="Listen to teacher voice narration"
        >
          <Volume2 className="w-4 h-4 text-indigo-400" />
          <span>{label}</span>
        </button>
      ) : isPlaying ? (
        <div className="inline-flex items-center gap-1.5 bg-indigo-950/70 border border-indigo-500/50 rounded-xl px-2.5 py-1.5 shadow-md">
          {/* Animated voice wave */}
          <div className="flex items-center gap-0.5 px-1">
            <span className="w-1 h-3.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-4.5 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-3.5 bg-indigo-400 rounded-full animate-bounce"></span>
          </div>

          <span className="text-indigo-200 font-bold text-xs">Narrating</span>

          <button
            type="button"
            onClick={pauseNarration}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
            title="Pause narration"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={stopNarration}
            className="p-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-200 hover:text-rose-200 transition cursor-pointer"
            title="Stop narration"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5">
          <span className="text-amber-300 font-semibold text-xs">Paused</span>

          <button
            type="button"
            onClick={resumeNarration}
            className="p-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
            title="Resume narration"
          >
            <Play className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={stopNarration}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Stop narration"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Speed Rate Pill Button */}
      <button
        type="button"
        onClick={toggleRate}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 font-semibold transition cursor-pointer"
        title="Change voice narration speed"
      >
        <Gauge className="w-3 h-3 text-indigo-400" />
        <span>{rate}x</span>
      </button>

      {/* Voice Badge (Teacher style) */}
      {selectedVoice && (
        <span className="text-[10px] text-slate-400 hidden sm:inline-block font-medium">
          Teacher Voice
        </span>
      )}
    </div>
  );
};
