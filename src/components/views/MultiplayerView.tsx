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
  MultiplayerFinalResults,
  MultiplayerMode,
  MultiplayerTeam 
} from '../../types';
import { SUBJECTS } from '../../data/defaultQuestions';
import { getCurriculumTopics } from '../../data/curriculum';
import { soundEffects } from '../../utils/audio';
import { recordQuizCompletion, getStoredAuthToken } from '../../utils/storage';

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
  const [gameMode, setGameMode] = useState<MultiplayerMode>('ffa');
  const [subject, setSubject] = useState<Subject>('Core Mathematics');
  const [topic, setTopic] = useState<string>('All Topics (Mixed)');
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
            const myPlayerObj = serverRoom.players.find((p) => p.id === playerId);
            const myTeam = myPlayerObj?.team;
            const isWinner = serverRoom.gameMode === '2v2'
              ? Boolean(serverRoom.finalResults.winningTeam && serverRoom.finalResults.winningTeam === myTeam)
              : serverRoom.winnerId === playerId;

            const isDraw = serverRoom.gameMode === '2v2'
              ? serverRoom.finalResults.winningTeam === 'draw'
              : Boolean(serverRoom.isDraw);

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

            // Synchronize multiplayer win/loss to server account
            const token = getStoredAuthToken();
            if (token) {
              fetch('/api/multiplayer/record', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  roomCode: serverRoom.code,
                  isWinner,
                  isDraw,
                  correctAnswers: myStats.correctAnswers,
                  totalQuestions: myStats.totalQuestions,
                  xpEarned: myStats.xpEarned,
                  subject: serverRoom.subject,
                  difficulty: serverRoom.difficulty,
                }),
              }).catch(() => {});
            }

            if (isWinner) {
              soundEffects.playVictory();
              confetti({
                particleCount: 100,
                spread: 80,
                origin: { y: 0.6 },
              });
            } else if (isDraw) {
              soundEffects.playVictory();
            } else {
              soundEffects.playWrong();
            }
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
          gameMode,
          subject,
          topic: topic === 'All Topics (Mixed)' ? 'All Topics' : topic,
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

  const handleSwitchTeam = async () => {
    if (!room || room.gameMode !== '2v2') return;
    soundEffects.playClick();
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/rooms/${room.code}/switch-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        syncRoomData(data.room);
      } else if (data.message) {
        setErrorMsg(data.message);
      }
    } catch {
      // Handled by polling
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
    const is2v2 = room.gameMode === '2v2';
    const myPlayerObj = room.players.find((p) => p.id === playerId);
    const myTeam = myPlayerObj?.team;
    const sortedScores = [...finalResults.finalScores].sort((a, b) => (a.rank || 1) - (b.rank || 1));
    const myStats = sortedScores.find((p) => p.id === playerId);
    const myRank = myStats?.rank || 1;

    // Team Battle calculations
    const teamScores = finalResults.teamScores;
    const teamAScore = teamScores?.teamA ?? 0;
    const teamBScore = teamScores?.teamB ?? 0;
    const winningTeam = finalResults.winningTeam;
    const isTeamWinner = is2v2 && winningTeam && winningTeam === myTeam;
    const isTeamDraw = is2v2 && winningTeam === 'draw';

    const isWinner = is2v2 ? isTeamWinner : finalResults.winnerId === playerId;
    const isTiedFirst = is2v2 ? isTeamDraw : (finalResults.isDraw && myRank === 1);

    const rankTitles: Record<number, string> = {
      1: isTiedFirst ? 'Tied for 1st Place!' : isWinner ? '1st Place Champion!' : '1st Place!',
      2: '2nd Place Runner-Up!',
      3: '3rd Place Podium!',
      4: '4th Place Finisher!',
    };

    const rankColors: Record<number, { border: string; bg: string; badge: string; text: string; medal: string }> = {
      1: { border: 'border-amber-500/60 shadow-amber-500/10', bg: 'bg-amber-950/30', badge: 'bg-amber-500 text-slate-950 font-black', text: 'text-amber-400', medal: '🥇 1st Place' },
      2: { border: 'border-slate-400/60 shadow-slate-400/10', bg: 'bg-slate-800/40', badge: 'bg-slate-300 text-slate-950 font-black', text: 'text-slate-200', medal: '🥈 2nd Place' },
      3: { border: 'border-amber-700/60 shadow-amber-700/10', bg: 'bg-amber-950/20', badge: 'bg-amber-700 text-white font-black', text: 'text-amber-500', medal: '🥉 3rd Place' },
      4: { border: 'border-slate-700 shadow-slate-700/10', bg: 'bg-slate-900/40', badge: 'bg-slate-700 text-slate-300 font-black', text: 'text-slate-400', medal: '🎖️ 4th Place' },
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30">
            {isWinner || isTeamWinner ? <Trophy className="w-10 h-10 text-amber-300" /> : <Swords className="w-10 h-10 text-white" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {is2v2 ? '2v2 Team Battle Completed' : 'Battle Completed'} • {room.subject}
              </span>
              {room.topic && room.topic !== 'All Topics' && room.topic !== 'All Topics (Mixed)' && (
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {room.topic}
                </span>
              )}
            </div>

            {is2v2 ? (
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {isTeamDraw ? 'Epic Team Draw!' : isTeamWinner ? `Team ${myTeam} Victory! 🏆` : `Team ${winningTeam} Won the Battle`}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {isTeamDraw
                    ? 'Both Team A and Team B finished with equal combined points!'
                    : isTeamWinner
                    ? `Outstanding teamwork! You and your teammate scored higher and claimed victory.`
                    : `Team ${winningTeam} edged out the contest. Challenge them to a rematch!`}
                </p>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {rankTitles[myRank] || 'Battle Completed!'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {myRank === 1
                    ? 'Mastery, speed, and precision secured the victory!'
                    : myRank === 2
                    ? 'Strong performance! A very close academic contest.'
                    : 'Great battle! Review the questions and challenge your peers again.'}
                </p>
              </div>
            )}
          </div>

          {/* 2v2 Combined Team Scoreboard */}
          {is2v2 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 text-left">
                Final Team Scores
              </div>
              <div className="grid grid-cols-2 gap-3 items-center">
                {/* Team A Card */}
                <div className={`p-4 rounded-xl border text-center relative ${
                  winningTeam === 'A'
                    ? 'bg-blue-950/50 border-blue-500 ring-2 ring-blue-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  {winningTeam === 'A' && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500 text-white shadow">
                      Winning Team
                    </span>
                  )}
                  <div className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">
                    Team A {myTeam === 'A' && '(Your Team)'}
                  </div>
                  <div className="text-3xl font-black text-white mt-1">
                    {teamAScore} <span className="text-xs text-slate-400 font-medium">pts</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {room.players.filter((p) => p.team === 'A').map((p) => p.name).join(' & ')}
                  </div>
                </div>

                {/* Team B Card */}
                <div className={`p-4 rounded-xl border text-center relative ${
                  winningTeam === 'B'
                    ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/50'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  {winningTeam === 'B' && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow">
                      Winning Team
                    </span>
                  )}
                  <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wider">
                    Team B {myTeam === 'B' && '(Your Team)'}
                  </div>
                  <div className="text-3xl font-black text-white mt-1">
                    {teamBScore} <span className="text-xs text-slate-400 font-medium">pts</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {room.players.filter((p) => p.team === 'B').map((p) => p.name).join(' & ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Individual Standings (Occupied Positions: 1st, 2nd, 3rd, 4th) */}
          <div className="space-y-2.5 text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
              <span>Individual Standings ({sortedScores.length} Players)</span>
              {is2v2 && <span className="text-indigo-400">Team bonuses included</span>}
            </div>

            <div className="space-y-2.5">
              {sortedScores.map((scoreItem, idx) => {
                const rank = scoreItem.rank || (idx + 1);
                const isMe = scoreItem.id === playerId;
                const styling = rankColors[rank] || rankColors[4];
                const playerObj = room.players.find((p) => p.id === scoreItem.id);
                const pTeam = playerObj?.team;

                return (
                  <div
                    key={scoreItem.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg ${styling.bg} ${styling.border} ${
                      isMe ? 'ring-2 ring-indigo-500/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 shadow ${styling.badge}`}>
                        #{rank}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-base truncate">{scoreItem.name}</span>
                          {isMe && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                              You
                            </span>
                          )}
                          {is2v2 && pTeam && (
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              pTeam === 'A'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}>
                              Team {pTeam}
                            </span>
                          )}
                          <span className={`text-[11px] font-bold ${styling.text}`}>
                            {styling.medal}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-semibold mt-0.5">
                          {scoreItem.correctAnswers} / {scoreItem.totalQuestions} Correct ({scoreItem.accuracy}%)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                      <div className="text-left sm:text-right">
                        <div className="text-2xl font-black text-white">{scoreItem.score} pts</div>
                        <div className="text-xs font-bold text-amber-400">+{scoreItem.xpEarned} XP</div>
                      </div>
                    </div>
                  </div>
                );
              })}
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
    const playerColors = [
      { avatar: 'bg-blue-600', ring: 'ring-blue-500/50', border: 'border-blue-500/30' },
      { avatar: 'bg-purple-600', ring: 'ring-purple-500/50', border: 'border-purple-500/30' },
      { avatar: 'bg-emerald-600', ring: 'ring-emerald-500/50', border: 'border-emerald-500/30' },
      { avatar: 'bg-amber-600', ring: 'ring-amber-500/50', border: 'border-amber-500/30' },
    ];

    const is2v2 = room.gameMode === '2v2';
    const teamAScore = room.players.filter((p) => p.team === 'A').reduce((acc, p) => acc + (p.score || 0), 0);
    const teamBScore = room.players.filter((p) => p.team === 'B').reduce((acc, p) => acc + (p.score || 0), 0);

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        {/* Battle Live Header (Scoreboard for 2 to 4 Players) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
                {room.subject} {room.topic && room.topic !== 'All Topics' && room.topic !== 'All Topics (Mixed)' ? `• ${room.topic}` : ''}
              </span>
              <span className="text-xs text-slate-400 font-semibold capitalize">
                {room.difficulty} • {is2v2 ? '2v2 Team Battle Arena' : `${room.players.length} Contenders Arena`}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[11px] font-bold text-slate-400">
                  Question {questionIndex + 1} of {totalQuestions}
                </div>
              </div>
              <div className={`px-3 py-1.5 rounded-xl font-mono font-bold text-sm border inline-flex items-center gap-1.5 shadow-md ${
                timeLeft <= 4 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-slate-800 text-indigo-300 border-slate-700'
              }`}>
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* 2v2 Live Team A vs Team B Scoreboard */}
          {is2v2 && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-3 items-center">
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                me?.team === 'A' ? 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/50' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="font-extrabold text-blue-300 text-xs sm:text-sm">TEAM A</span>
                  {me?.team === 'A' && <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-bold">You</span>}
                </div>
                <div className="text-right">
                  <span className="text-lg sm:text-xl font-black text-white">{teamAScore} pts</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                me?.team === 'B' ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/50' : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="font-extrabold text-amber-300 text-xs sm:text-sm">TEAM B</span>
                  {me?.team === 'B' && <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">You</span>}
                </div>
                <div className="text-right">
                  <span className="text-lg sm:text-xl font-black text-white">{teamBScore} pts</span>
                </div>
              </div>
            </div>
          )}

          {/* Player Cards (2, 3, or 4 Players) */}
          <div className={`grid gap-2.5 ${
            room.players.length === 2 ? 'grid-cols-2' : room.players.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
          }`}>
            {room.players.map((p, idx) => {
              const isMe = p.id === playerId;
              const hasAnswered = Boolean(p.currentAnswer);
              const color = is2v2
                ? p.team === 'A'
                  ? { avatar: 'bg-blue-600', ring: 'ring-blue-500/50', border: 'border-blue-500/40' }
                  : { avatar: 'bg-amber-600', ring: 'ring-amber-500/50', border: 'border-amber-500/40' }
                : playerColors[idx % playerColors.length];

              return (
                <div
                  key={p.id}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    isMe
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/40'
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl ${color.avatar} flex items-center justify-center font-extrabold text-white text-xs shrink-0 shadow`}>
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate">{p.name}</span>
                      {p.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                      {is2v2 && p.team && (
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                          p.team === 'A' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {p.team}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] mt-0.5">
                      <span className="font-extrabold text-indigo-300">{p.score} pts</span>
                      {hasAnswered ? (
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Locked
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium">Thinking</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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

          {/* Question Review Snippet when all players finish */}
          {room.status === 'question_review' && reviewData && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between font-bold text-indigo-300">
                <span>Correct Option: <strong className="text-emerald-400">{reviewData.correctAnswer}</strong></span>
                <span className="text-slate-400">Next question starting soon...</span>
              </div>
              <p className="text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                {reviewData.explanation}
              </p>
              {/* Player results roster */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {reviewData.playerResults.map((pr) => (
                  <div key={pr.id} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1 min-w-0">
                      {is2v2 && pr.team && (
                        <span className={`text-[9px] font-black px-1 rounded ${
                          pr.team === 'A' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {pr.team}
                        </span>
                      )}
                      <span className="font-semibold text-slate-300 truncate text-[11px]">{pr.name}</span>
                    </div>
                    <span className={`font-bold text-[11px] shrink-0 ${pr.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {pr.choice} {pr.isCorrect ? `(+${pr.scoreEarned})` : '(+0)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting for other players indicator */}
          {isAnswerLocked && room.status === 'playing' && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Answer locked in. Waiting for other players or timer...
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
    const myPlayer = room.players.find((p) => p.id === playerId);
    const is2v2 = room.gameMode === '2v2';
    const teamAPlayers = room.players.filter((p) => p.team === 'A');
    const teamBPlayers = room.players.filter((p) => p.team === 'B');
    const isRoomFull = is2v2 ? room.players.length >= 4 : room.players.length >= (room.maxPlayers || 4);
    const readyCount = room.players.filter((p) => p.ready).length;

    const canStart = is2v2
      ? room.players.length === 4 && teamAPlayers.length === 2 && teamBPlayers.length === 2 && room.players.every((p) => p.ready)
      : room.players.length >= 2 && room.players.every((p) => p.ready);

    const playerColors = [
      { border: 'border-blue-500/40', bg: 'bg-blue-950/30', avatar: 'bg-blue-600', text: 'text-blue-400' },
      { border: 'border-purple-500/40', bg: 'bg-purple-950/30', avatar: 'bg-purple-600', text: 'text-purple-400' },
      { border: 'border-emerald-500/40', bg: 'bg-emerald-950/30', avatar: 'bg-emerald-600', text: 'text-emerald-400' },
      { border: 'border-amber-500/40', bg: 'bg-amber-950/30', avatar: 'bg-amber-600', text: 'text-amber-400' },
    ];

    const myTeam = myPlayer?.team;
    const canSwitch = is2v2 && ((myTeam === 'A' && teamBPlayers.length < 2) || (myTeam === 'B' && teamAPlayers.length < 2));

    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        {announcement && (
          <div className="p-3 rounded-xl bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs text-center font-bold animate-in fade-in">
            {announcement}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs text-center font-bold animate-in fade-in flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-lg">
            <Users className="w-8 h-8" />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {is2v2 ? '2v2 Team Battle Lobby (Exactly 4 Players)' : room.gameMode === '1v1' ? '1v1 Duel Lobby (2 Players)' : 'Free-for-All Lobby (2–4 Players)'}
              </span>
              {isRoomFull && (
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                  Room Full ({room.players.length}/{room.maxPlayers || 4} Players)
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Room Code: <span className="font-mono text-indigo-400 tracking-wider">{room.code}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {is2v2
                ? 'Share this 6-character code with 3 friends for a 2v2 Team Battle.'
                : 'Share this 6-character code with friends to join the battle.'}
            </p>

            {/* Prominent Team Badge for 2v2 */}
            {is2v2 && myTeam && (
              <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-slate-950 shadow-md">
                <span className="text-xs text-slate-400 font-semibold">Your Assignment:</span>
                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-md ${
                  myTeam === 'A' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  Team {myTeam}
                </span>
                {canSwitch && (
                  <button
                    onClick={handleSwitchTeam}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer ml-1"
                  >
                    Switch to Team {myTeam === 'A' ? 'B' : 'A'}
                  </button>
                )}
              </div>
            )}
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
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-semibold text-slate-300 text-left">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Subject</span>
              <strong className="text-white block truncate">{room.subject}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Topic</span>
              <strong className="text-indigo-300 block truncate">{room.topic || 'All Topics'}</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Difficulty & Length</span>
              <strong className="text-white block capitalize">{room.difficulty} • {room.questionCount} Qs</strong>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Mode & Capacity</span>
              <strong className="text-white block">
                {is2v2 ? '2v2 Teams' : room.gameMode === '1v1' ? '1v1 Duel' : 'Free-for-All'} • {room.players.length}/{room.maxPlayers || 4}
              </strong>
            </div>
          </div>

          {/* Player Roster Grid */}
          {is2v2 ? (
            /* 2v2 TEAM VIEW: TEAM A VS TEAM B */
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Team Assignments (Exactly 4 Players Required)
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {readyCount} of 4 Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* TEAM A COLUMN */}
                <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-black text-blue-300">TEAM A</span>
                      {myTeam === 'A' && <span className="text-[10px] bg-blue-500/30 text-blue-200 px-1.5 py-0.2 rounded font-bold">You</span>}
                    </div>
                    <span className="text-xs text-blue-300/80 font-bold">{teamAPlayers.length} / 2 Players</span>
                  </div>

                  <div className="space-y-2">
                    {[0, 1].map((slotIdx) => {
                      const player = teamAPlayers[slotIdx];
                      if (player) {
                        return (
                          <div
                            key={player.id}
                            className={`p-3 rounded-xl border flex items-center justify-between bg-blue-950/40 border-blue-500/40 ${
                              player.id === playerId ? 'ring-2 ring-blue-500/60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {player.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  {player.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                                  <span className="font-bold text-white text-xs truncate">{player.name}</span>
                                  {player.id === playerId && <span className="text-[10px] text-blue-300 font-bold">(You)</span>}
                                </div>
                                <span className="text-[10px] text-blue-300/70">Team A Player {slotIdx + 1}</span>
                              </div>
                            </div>

                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              player.ready ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {player.ready ? '✓ Ready' : '• Not Ready'}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={`empty_a_${slotIdx}`} className="p-3 rounded-xl border border-dashed border-blue-500/30 bg-blue-950/10 text-xs text-blue-300/50 flex items-center justify-between">
                          <span>Waiting for teammate...</span>
                          <span className="text-[10px] uppercase font-bold text-blue-400/40">Open Slot</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TEAM B COLUMN */}
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-sm font-black text-amber-300">TEAM B</span>
                      {myTeam === 'B' && <span className="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.2 rounded font-bold">You</span>}
                    </div>
                    <span className="text-xs text-amber-300/80 font-bold">{teamBPlayers.length} / 2 Players</span>
                  </div>

                  <div className="space-y-2">
                    {[0, 1].map((slotIdx) => {
                      const player = teamBPlayers[slotIdx];
                      if (player) {
                        return (
                          <div
                            key={player.id}
                            className={`p-3 rounded-xl border flex items-center justify-between bg-amber-950/40 border-amber-500/40 ${
                              player.id === playerId ? 'ring-2 ring-amber-500/60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                                {player.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  {player.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                                  <span className="font-bold text-white text-xs truncate">{player.name}</span>
                                  {player.id === playerId && <span className="text-[10px] text-amber-300 font-bold">(You)</span>}
                                </div>
                                <span className="text-[10px] text-amber-300/70">Team B Player {slotIdx + 1}</span>
                              </div>
                            </div>

                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                              player.ready ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {player.ready ? '✓ Ready' : '• Not Ready'}
                            </span>
                          </div>
                        );
                      }
                      return (
                        <div key={`empty_b_${slotIdx}`} className="p-3 rounded-xl border border-dashed border-amber-500/30 bg-amber-950/10 text-xs text-amber-300/50 flex items-center justify-between">
                          <span>Waiting for opponent...</span>
                          <span className="text-[10px] uppercase font-bold text-amber-400/40">Open Slot</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STANDARD 1v1 / FFA VIEW */
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Contenders ({room.players.length} / {room.maxPlayers || 4} Players)
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  {readyCount} of {room.players.length} Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Array.from({ length: room.maxPlayers || 4 }).map((_, slotIdx) => {
                  const player = room.players[slotIdx];
                  const color = playerColors[slotIdx % playerColors.length];
                  const slotLabel = `Player ${slotIdx + 1}${slotIdx === 0 ? ' (Host)' : ''}`;

                  if (player) {
                    return (
                      <div
                        key={player.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${color.bg} ${color.border} ${
                          player.id === playerId ? 'ring-2 ring-indigo-500/50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-xl ${color.avatar} flex items-center justify-center font-black text-white text-xs shrink-0 shadow`}>
                            {player.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {player.isHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span className="font-bold text-white text-sm truncate">{player.name}</span>
                              {player.id === playerId && <span className="text-[10px] text-indigo-400 font-bold shrink-0">(You)</span>}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              {slotLabel}
                            </span>
                          </div>
                        </div>

                        <span className={`text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                          player.ready
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {player.ready ? '✓ Ready' : '• Not Ready'}
                        </span>
                      </div>
                    );
                  }

                  // Empty Slot
                  return (
                    <div
                      key={`empty_slot_${slotIdx}`}
                      className="p-3.5 rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-500"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center font-bold text-slate-500 text-xs">
                          P{slotIdx + 1}
                        </div>
                        <div>
                          <span className="font-semibold block text-slate-400">{slotLabel}</span>
                          <span className="text-[11px] text-slate-500">
                            {slotIdx === 1 ? 'Waiting for opponent...' : 'Open slot'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Empty</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Lobby Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={handleLeaveRoom}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Leave Room
            </button>

            {canSwitch && (
              <button
                onClick={handleSwitchTeam}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-indigo-500/40 hover:bg-indigo-950/40 text-indigo-300 text-xs font-bold transition cursor-pointer"
              >
                Switch to Team {myTeam === 'A' ? 'B' : 'A'}
              </button>
            )}

            <button
              onClick={handleToggleReady}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                myPlayer?.ready
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {myPlayer?.ready ? '✓ You Are Ready' : 'Click to Ready Up'}
            </button>

            {isHost && (
              <button
                disabled={!canStart}
                onClick={handleStartGame}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                {is2v2
                  ? room.players.length < 4
                    ? `Waiting for 4 Players (${room.players.length}/4)...`
                    : teamAPlayers.length !== 2 || teamBPlayers.length !== 2
                    ? 'Balancing Teams (Need 2 on A, 2 on B)...'
                    : !canStart
                    ? `Waiting for All Players Ready (${readyCount}/4)`
                    : 'Start 2v2 Team Battle (Team A vs Team B)'
                  : room.players.length < 2
                  ? 'Waiting for Players (Min 2)...'
                  : !canStart
                  ? `Waiting for Ready (${readyCount}/${room.players.length})`
                  : `Start Battle Now (${room.players.length} Players)`}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= PHASE 1: CREATE / JOIN SELECTION =================
  const availableTopics = ['All Topics (Mixed)', ...getCurriculumTopics(subject)];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider">
          <Wifi className="w-3.5 h-3.5" /> Battle Server Online • 2–4 Players
        </div>
        <h1 className="text-3xl font-black text-white">Challenge Friends</h1>
        <p className="text-sm text-slate-400">
          Compete in synchronized real-time academic battles (2 to 4 players).
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
          {/* Battle Mode Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              1. Choose Battle Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setGameMode('1v1');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  gameMode === '1v1'
                    ? 'bg-blue-600/30 border-blue-500 text-white shadow-md ring-1 ring-blue-500 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-extrabold text-sm">1v1</div>
                <div className="text-[10px] text-slate-400 mt-0.5">2 Players</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setGameMode('ffa');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  gameMode === 'ffa'
                    ? 'bg-purple-600/30 border-purple-500 text-white shadow-md ring-1 ring-purple-500 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-extrabold text-sm">Free-for-All</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Up to 4 Players</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEffects.playClick();
                  setGameMode('2v2');
                }}
                className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                  gameMode === '2v2'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500 font-black'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="font-extrabold text-sm flex items-center justify-center gap-1">
                  <span>2v2 Battle</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-slate-950 font-black">NEW</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Team A vs Team B</div>
              </button>
            </div>
          </div>

          {/* Subject Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              2. Choose Subject
            </label>
            <select
              value={subject}
              onChange={(e) => {
                const newSub = e.target.value as Subject;
                setSubject(newSub);
                setTopic('All Topics (Mixed)');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:border-indigo-500"
            >
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic Selection */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              3. Choose Topic
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-sm outline-none focus:border-indigo-500"
            >
              {availableTopics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Select a curriculum topic (e.g. Logarithms, Kinematics, Organic Chemistry) or all topics.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                4. Difficulty
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
                5. Questions
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-medium text-xs outline-none focus:border-indigo-500"
              >
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                6. Timer
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
            {loading
              ? 'Creating Room...'
              : `Create ${gameMode === '1v1' ? '1v1 Duel' : gameMode === '2v2' ? '2v2 Team Battle' : 'Free-for-All'} Room & Get Code`}
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

      <div className="text-center space-y-2">
        <button
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
        >
          Back to Dashboard
        </button>
        <p className="text-[11px] text-slate-500">
          SHS Science Hub • Created & Developed by <strong className="text-indigo-400 font-semibold">Avatar</strong>
        </p>
      </div>
    </div>
  );
};
