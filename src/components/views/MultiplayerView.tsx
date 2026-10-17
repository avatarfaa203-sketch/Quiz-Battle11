import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Users, 
  Copy, 
  Check, 
  Play, 
  Crown, 
  Swords, 
  Timer, 
  CheckCircle2, 
  Trophy, 
  RotateCcw, 
  Home, 
  Wifi, 
  AlertCircle 
} from 'lucide-react';
import { 
  Difficulty, 
  Subject, 
  UserStats, 
  SanitizedQuestion, 
  MultiplayerRoomState, 
  ReviewData, 
  MultiplayerFinalResults 
} from '../../types';
import { SUBJECTS } from '../../data/defaultQuestions';
import { soundEffects } from '../../utils/audio';
import { recordQuizCompletion } from '../../utils/storage';

interface MultiplayerViewProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
  onCancel: () => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({
  userStats,
  onStatsUpdated,
  onCancel,
}) => {
  // Tab-isolated persistent player ID
  const [playerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('qb_multiplayer_player_id');
      if (stored) return stored;
      const created = 'p_' + Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('qb_multiplayer_player_id', created);
      return created;
    }
    return 'p_guest';
  });

  // Setup options
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [subject, setSubject] = useState<Subject>('Mathematics');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [challengerName, setChallengerName] = useState('');

  // Room State
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // In-game battle state
  const [currentQuestion, setCurrentQuestion] = useState<SanitizedQuestion | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [finalResults, setFinalResults] = useState<MultiplayerFinalResults | null>(null);

  const showAnnouncement = (msg: string) => {
    setAnnouncement(msg);
    setTimeout(() => setAnnouncement(null), 4000);
  };

  // Synchronize room state from server
  const syncRoomData = (serverRoom: MultiplayerRoomState) => {
    setRoom(serverRoom);

    if (serverRoom.announcement) {
      showAnnouncement(serverRoom.announcement);
    }

    if (serverRoom.status === 'playing') {
      if (serverRoom.currentQuestion) {
        setCurrentQuestion(serverRoom.currentQuestion);
      }
      setTotalQuestions(serverRoom.totalQuestions || serverRoom.questionCount);
      
      setQuestionIndex((prevIdx) => {
        if (prevIdx !== serverRoom.currentQuestionIndex) {
          setSelectedOption(null);
          setIsAnswerLocked(false);
          setReviewData(null);
        }
        return serverRoom.currentQuestionIndex;
      });

      if (serverRoom.timeRemaining !== undefined) {
        setTimeLeft(serverRoom.timeRemaining);
      }

      const me = serverRoom.players.find((p) => p.id === playerId);
      if (me?.currentAnswer) {
        setIsAnswerLocked(true);
      }
    } else if (serverRoom.status === 'question_review') {
      if (serverRoom.reviewData) {
        setReviewData(serverRoom.reviewData);
      }
    } else if (serverRoom.status === 'finished') {
      if (serverRoom.finalResults) {
        setFinalResults(serverRoom.finalResults);

        // Award XP once per completed match
        const awardKey = `qb_awarded_${serverRoom.code}`;
        const alreadyAwarded = localStorage.getItem(awardKey);
        if (!alreadyAwarded) {
          localStorage.setItem(awardKey, 'true');
          const myStats = serverRoom.finalResults.finalScores.find((p) => p.id === playerId);
          if (myStats) {
            const isWinner = serverRoom.winnerId === playerId;
            const completion = recordQuizCompletion({
              subject: serverRoom.subject,
              difficulty: serverRoom.difficulty,
              correctAnswers: myStats.correctAnswers,
              totalQuestions: myStats.totalQuestions,
              fastAnswersCount: 1,
              mode: 'multiplayer',
              isMultiplayerWin: isWinner,
            });
            onStatsUpdated(completion.stats);
          }

          if (serverRoom.winnerId === playerId) {
            soundEffects.playVictory();
            confetti({
              particleCount: 100,
              spread: 80,
              origin: { y: 0.6 },
            });
          } else if (serverRoom.isDraw) {
            soundEffects.playVictory();
          } else {
            soundEffects.playWrong();
          }
        }
      }
    }
  };

  // Reconnect to active room if exists on mount
  useEffect(() => {
    const activeCode = sessionStorage.getItem('qb_active_room_code');
    if (activeCode) {
      fetch(`/api/rooms/${activeCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.room) {
            syncRoomData(data.room);
          } else {
            sessionStorage.removeItem('qb_active_room_code');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('qb_active_room_code');
        });
    }
  }, []);

  // Real-time synchronization loop (Polling + SSE fallback)
  useEffect(() => {
    if (!room?.code) return;

    // Fast polling every 700ms guarantees realtime sync across any browser/proxy
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${room.code}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            syncRoomData(data.room);
          }
        }
      } catch {
        // ignore network glitches
      }
    }, 700);

    // Also connect to Server-Sent Events for instantaneous server pushes
    let sse: EventSource | null = null;
    try {
      sse = new EventSource(`/api/rooms/${room.code}/events?playerId=${playerId}`);
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.room) {
            syncRoomData(data.room);
          }
        } catch {
          // ignore
        }
      };
    } catch {
      // Polling continues as reliable primary fallback
    }

    return () => {
      clearInterval(interval);
      if (sse) sse.close();
    };
  }, [room?.code, playerId]);

  // Client timer tick
  useEffect(() => {
    if (room?.status !== 'playing') return;

    const tick = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        if (prev <= 4) soundEffects.playTick(true);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [room?.status, questionIndex]);

  // ================= ACTION HANDLERS (REST) =================
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    soundEffects.playClick();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostName: userStats.username,
          playerId,
          subject,
          difficulty,
          questionCount,
          timePerQuestion,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        sessionStorage.setItem('qb_active_room_code', data.room.code);
        soundEffects.playClick();
      } else {
        setErrorMsg(data.message || 'Failed to create room. Please try again.');
        soundEffects.playWrong();
      }
    } catch {
      setErrorMsg('Network error connecting to battle server.');
      soundEffects.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length < 4) return;

    soundEffects.playClick();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerName: challengerName.trim() || userStats.username,
          playerId,
        }),
      });

      const data = await res.json();
      if (data.success && data.room) {
        setRoom(data.room);
        sessionStorage.setItem('qb_active_room_code', data.room.code);
        soundEffects.playClick();
      } else {
        setErrorMsg(data.message || 'Could not join room. Check the code.');
        soundEffects.playWrong();
      }
    } catch {
      setErrorMsg('Network error joining room.');
      soundEffects.playWrong();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!room) return;
    soundEffects.playClick();

    try {
      const res = await fetch(`/api/rooms/${room.code}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        syncRoomData(data.room);
      }
    } catch {
      // Handled by next poll
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    soundEffects.playClick();

    try {
      const res = await fetch(`/api/rooms/${room.code}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        syncRoomData(data.room);
        soundEffects.playVictory();
      } else if (data.message) {
        setErrorMsg(data.message);
      }
    } catch {
      // Handled by polling
    }
  };

  const handleAnswerOption = async (choice: string) => {
    if (isAnswerLocked || !room || !currentQuestion) return;
    setSelectedOption(choice);
    setIsAnswerLocked(true);
    soundEffects.playClick();

    try {
      const res = await fetch(`/api/rooms/${room.code}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          questionIndex,
          choice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if ((data.scoreEarned || 0) > 0) {
          soundEffects.playCorrect();
        } else {
          soundEffects.playWrong();
        }
      }
    } catch {
      // Synchronized on next poll
    }
  };

  const handleRequestRematch = async () => {
    if (!room) return;
    soundEffects.playClick();

    try {
      const res = await fetch(`/api/rooms/${room.code}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        syncRoomData(data.room);
      }
    } catch {
      // Handled by polling
    }
  };

  const handleLeaveRoom = async () => {
    soundEffects.playClick();
    if (room) {
      try {
        await fetch(`/api/rooms/${room.code}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
      } catch {
        // ignore
      }
    }
    sessionStorage.removeItem('qb_active_room_code');
    setRoom(null);
    setFinalResults(null);
    setCurrentQuestion(null);
    onCancel();
  };

  const handleCopyCode = () => {
    if (!room) return;
    soundEffects.playClick();
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ================= PHASE 4: FINAL RESULTS =================
  if (finalResults && room) {
    const isWinner = finalResults.winnerId === playerId;
    const isLoser = !finalResults.isDraw && !isWinner;
    const myStats = finalResults.finalScores.find((p) => p.id === playerId);
    const opponentStats = finalResults.finalScores.find((p) => p.id !== playerId);

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            {isWinner ? <Trophy className="w-10 h-10 text-amber-300" /> : <Swords className="w-10 h-10 text-white" />}
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              1v1 Battle Completed • {room.subject}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white mt-2">
              {isWinner ? 'You Won!' : isLoser ? 'You Lost' : "It's a Draw!"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {isWinner
                ? 'Superior precision and velocity claimed the battle.'
                : isLoser
                ? 'A valiant effort. Regroup and challenge again.'
                : 'Evenly matched gladiators.'}
            </p>
          </div>

          {/* Player Comparison Card */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
            <div className={`p-4 rounded-xl border text-center ${isWinner ? 'bg-indigo-950/40 border-indigo-500/50' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-xs text-slate-400 font-bold block mb-1">
                {myStats?.name || userStats.username} (You)
              </span>
              <div className="text-3xl font-black text-white">{myStats?.score || 0} pts</div>
              <div className="text-xs text-emerald-400 font-semibold mt-1">
                {myStats?.correctAnswers || 0} / {totalQuestions} Correct ({myStats?.accuracy || 0}%)
              </div>
              <div className="text-xs text-amber-400 font-bold mt-2">
                +{myStats?.xpEarned || 50} XP Earned
              </div>
            </div>

            <div className={`p-4 rounded-xl border text-center ${finalResults.winnerId === opponentStats?.id ? 'bg-purple-950/40 border-purple-500/50' : 'bg-slate-900 border-slate-800'}`}>
              <span className="text-xs text-slate-400 font-bold block mb-1">
                {opponentStats?.name || 'Opponent'}
              </span>
              <div className="text-3xl font-black text-white">{opponentStats?.score || 0} pts</div>
              <div className="text-xs text-slate-300 font-semibold mt-1">
                {opponentStats?.correctAnswers || 0} / {totalQuestions} Correct ({opponentStats?.accuracy || 0}%)
              </div>
              <div className="text-xs text-slate-400 font-bold mt-2">
                +{opponentStats?.xpEarned || 50} XP
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRequestRematch}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Rematch
            </button>

            <button
              onClick={() => {
                sessionStorage.removeItem('qb_active_room_code');
                setRoom(null);
                setFinalResults(null);
                setReviewData(null);
              }}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition cursor-pointer"
            >
              Challenge Another Friend
            </button>

            <button
              onClick={handleLeaveRoom}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700 transition cursor-pointer"
            >
              <Home className="w-4 h-4 text-emerald-400" /> Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= PHASE 3: REAL-TIME BATTLE ARENA =================
  if (room && (room.status === 'playing' || room.status === 'question_review') && currentQuestion) {
    const me = room.players.find((p) => p.id === playerId);
    const opponent = room.players.find((p) => p.id !== playerId);

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Battle Live Header (Scoreboard) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl flex items-center justify-between">
          {/* Current Player */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-extrabold text-white text-sm">
              {(me?.name || userStats.username).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">{me?.name || userStats.username} (You)</div>
              <div className="font-extrabold text-white text-base">{me?.score || 0} pts</div>
            </div>
          </div>

          {/* Center: Timer & Question Counter */}
          <div className="text-center">
            <div className={`px-3 py-1 rounded-full font-mono font-bold text-sm border inline-flex items-center gap-1 ${
              timeLeft <= 4 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-slate-800 text-indigo-300 border-slate-700'
            }`}>
              <Timer className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">
              Q{questionIndex + 1} of {totalQuestions}
            </div>
          </div>

          {/* Opponent Player */}
          <div className="flex items-center gap-3 text-right">
            <div>
              <div className="text-xs text-slate-400 font-semibold">{opponent?.name || 'Opponent'}</div>
              <div className="font-extrabold text-white text-base">{opponent?.score || 0} pts</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center font-extrabold text-white text-sm">
              {(opponent?.name || 'OP').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Question Prompt Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-slate-900 via-[#0e1628] to-slate-900 border border-slate-800 shadow-xl space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                {currentQuestion.subject} • {currentQuestion.difficulty}
              </span>
              {isAnswerLocked && (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Answer Locked
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-relaxed">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Answer Choice Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
              const text = currentQuestion[`option${optKey}` as keyof SanitizedQuestion];
              const isSelected = selectedOption === optKey;
              const isReview = room.status === 'question_review';
              const isCorrectReview = isReview && reviewData?.correctAnswer === optKey;

              let style = 'bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-indigo-500/50 hover:bg-slate-800';

              if (isReview) {
                if (isCorrectReview) {
                  style = 'bg-emerald-950/60 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/50';
                } else if (isSelected && !isCorrectReview) {
                  style = 'bg-rose-950/60 border-rose-500 text-rose-100 ring-2 ring-rose-500/50';
                } else {
                  style = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                }
              } else if (isAnswerLocked) {
                if (isSelected) {
                  style = 'bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-2 ring-indigo-500/50';
                } else {
                  style = 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60';
                }
              }

              return (
                <button
                  key={optKey}
                  disabled={isAnswerLocked || isReview}
                  onClick={() => handleAnswerOption(optKey)}
                  className={`p-4 rounded-2xl text-left border font-medium text-sm sm:text-base transition-all flex items-start gap-3 cursor-pointer disabled:cursor-default ${style}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {optKey}
                  </div>
                  <div className="flex-1 pt-0.5 leading-snug">{text}</div>
                </button>
              );
            })}
          </div>

          {/* Question Review Snippet when both players finish */}
          {room.status === 'question_review' && reviewData && (
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-indigo-300">
                <span>Correct Option: {reviewData.correctAnswer}</span>
                <span className="text-slate-400">Next question starting soon...</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {reviewData.explanation}
              </p>
            </div>
          )}

          {/* Waiting for opponent indicator */}
          {isAnswerLocked && room.status === 'playing' && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Answer locked in. Waiting for opponent or timer...
              </span>
              <span className="font-mono text-indigo-400">{timeLeft}s left</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= PHASE 2: GAME LOBBY =================
  if (room && room.status === 'lobby') {
    const isHost = room.hostId === playerId;
    const opponent = room.players.find((p) => p.id !== playerId);
    const myPlayer = room.players.find((p) => p.id === playerId);
    const allReady = room.players.length === 2 && room.players.every((p) => p.ready);

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {announcement && (
          <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs text-center font-bold animate-in fade-in">
            {announcement}
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Multiplayer 1v1 Battle Lobby
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
              Room Code: <span className="font-mono text-indigo-400 tracking-wider">{room.code}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Give this 6-character code to your friend to join.
            </p>
          </div>

          {/* Copy Button */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Code Copied!' : 'Copy Room Code'}
            </button>
          </div>

          {/* Match Settings Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-semibold text-slate-300">
            <div>Subject: <strong className="text-white block">{room.subject}</strong></div>
            <div>Difficulty: <strong className="text-white block capitalize">{room.difficulty}</strong></div>
            <div>Questions: <strong className="text-white block">{room.questionCount}</strong></div>
            <div>Timer: <strong className="text-white block">{room.timePerQuestion}s/question</strong></div>
          </div>

          {/* Player Roster Grid */}
          <div className="space-y-3 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contenders ({room.players.length} / 2)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Host Card */}
              {room.players.filter((p) => p.isHost).map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-slate-800/90 border border-indigo-500/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-sm">{p.name}</span>
                      {p.id === playerId && <span className="text-[10px] text-indigo-400">(You)</span>}
                    </div>
                    <span className={`text-xs font-bold mt-1 inline-block ${p.ready ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {p.ready ? '✓ Ready' : '• Not Ready'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Opponent Card */}
              {opponent ? (
                <div className="p-4 rounded-2xl bg-slate-800/90 border border-purple-500/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white text-sm">{opponent.name}</span>
                      {opponent.id === playerId && <span className="text-[10px] text-indigo-400">(You)</span>}
                    </div>
                    <span className={`text-xs font-bold mt-1 inline-block ${opponent.ready ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {opponent.ready ? '✓ Ready' : '• Not Ready'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-400 text-center">
                  <span className="animate-pulse">Waiting for opponent to enter code...</span>
                </div>
              )}
            </div>
          </div>

          {/* Lobby Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleLeaveRoom}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Leave Room
            </button>

            <button
              onClick={handleToggleReady}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                myPlayer?.ready
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {myPlayer?.ready ? '✓ You Are Ready' : 'Click to Ready Up'}
            </button>

            {isHost && (
              <button
                disabled={!allReady}
                onClick={handleStartGame}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                {allReady ? 'Start Battle Now' : 'Waiting for Ready...'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= PHASE 1: CREATE / JOIN SELECTION =================
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
          <Wifi className="w-3.5 h-3.5" /> Battle Server Online
        </div>
        <h1 className="text-3xl font-black text-white">Challenge A Friend</h1>
        <p className="text-sm text-slate-400">
          Compete head-to-head in synchronized real-time academic battles.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          onClick={() => {
            soundEffects.playClick();
            setTab('create');
            setErrorMsg(null);
          }}
          className={`py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            tab === 'create'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Create Room (Host)
        </button>
        <button
          onClick={() => {
            soundEffects.playClick();
            setTab('join');
            setErrorMsg(null);
          }}
          className={`py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
            tab === 'join'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Join Room
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-medium text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {tab === 'create' ? (
        <form onSubmit={handleCreateRoom} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Select Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value as Subject)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:border-indigo-500"
            >
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs outline-none focus:border-indigo-500 capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs outline-none focus:border-indigo-500"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Time Limit
              </label>
              <select
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs outline-none focus:border-indigo-500"
              >
                <option value={10}>10s</option>
                <option value={15}>15s (Default)</option>
                <option value={20}>20s</option>
                <option value={30}>30s</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Creating Room...' : 'Create Room & Get 6-Char Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoinRoom} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="e.g. AB7X2K"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-center font-mono font-bold text-xl tracking-widest text-indigo-300 uppercase outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Challenger Name (Optional)
            </label>
            <input
              type="text"
              value={challengerName}
              onChange={(e) => setChallengerName(e.target.value)}
              placeholder={`Default: ${userStats.username}`}
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-white outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || joinCodeInput.trim().length < 4}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Connecting to Room...' : 'Join Room'}
          </button>
        </form>
      )}

      <div className="text-center">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};
