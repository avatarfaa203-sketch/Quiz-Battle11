import { WebSocket } from 'ws';
import type { Response } from 'express';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';
import { 
  Question, 
  Subject, 
  Difficulty, 
  MultiplayerRoomState, 
  SanitizedQuestion, 
  ReviewData, 
  MultiplayerFinalResults 
} from '../types';

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  currentAnswer?: {
    choice: string;
    isCorrect: boolean;
    responseTimeMs: number;
    scoreEarned: number;
  } | null;
  history: Array<{
    questionIndex: number;
    choice: string;
    isCorrect: boolean;
    responseTimeMs: number;
    scoreEarned: number;
  }>;
  connected: boolean;
  ws?: WebSocket | null;
}

interface SseClient {
  id: string;
  res: Response;
}

interface ServerRoom extends Omit<MultiplayerRoomState, 'players'> {
  players: PlayerState[];
  questions: Question[];
  topic: string;
  maxPlayers: number;
  currentReviewData?: ReviewData | null;
  currentFinalResults?: MultiplayerFinalResults | null;
  questionTimer?: NodeJS.Timeout | null;
  reviewTimer?: NodeJS.Timeout | null;
  disconnectTimer?: Record<string, NodeJS.Timeout>;
  sseClients: SseClient[];
}

export class MultiplayerManager {
  private rooms: Map<string, ServerRoom> = new Map();

  constructor() {
    // Clean inactive rooms older than 2 hours
    setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms.entries()) {
        if (now - room.createdAt > 2 * 60 * 60 * 1000) {
          this.cleanupRoom(code);
        }
      }
    }, 10 * 60 * 1000);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public sanitizeQuestion(q: Question): SanitizedQuestion {
    return {
      id: q.id,
      subject: q.subject,
      difficulty: q.difficulty,
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
    };
  }

  public sanitizeRoomState(room: ServerRoom): MultiplayerRoomState {
    const currentQ = room.questions[room.currentQuestionIndex];
    const timeRemaining = room.status === 'playing'
      ? Math.max(0, room.timePerQuestion - Math.floor((Date.now() - room.questionStartTime) / 1000))
      : 0;

    return {
      code: room.code,
      hostId: room.hostId,
      subject: room.subject,
      topic: room.topic || 'All Topics',
      difficulty: room.difficulty,
      questionCount: room.questionCount,
      timePerQuestion: room.timePerQuestion,
      maxPlayers: 4,
      status: room.status,
      createdAt: room.createdAt,
      currentQuestionIndex: room.currentQuestionIndex,
      questionStartTime: room.questionStartTime,
      winnerId: room.winnerId,
      isDraw: room.isDraw,
      xpAwarded: room.xpAwarded,
      rematchVotes: room.rematchVotes,
      announcement: room.announcement || null,
      totalQuestions: room.questions.length,
      timeRemaining,
      currentQuestion: room.status === 'playing' && currentQ ? this.sanitizeQuestion(currentQ) : null,
      reviewData: room.status === 'question_review' ? (room.currentReviewData || null) : null,
      finalResults: room.status === 'finished' ? (room.currentFinalResults || null) : null,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        ready: p.ready,
        score: p.score,
        correctAnswers: p.correctAnswers,
        totalAnswered: p.totalAnswered,
        currentAnswer:
          room.status === 'question_review' || room.status === 'finished'
            ? p.currentAnswer
            : p.currentAnswer
            ? { ...p.currentAnswer, choice: 'locked' }
            : null,
        connected: p.connected,
      })),
    };
  }

  public broadcast(room: ServerRoom, payload: any) {
    const msg = JSON.stringify(payload);

    // 1. WebSocket delivery
    for (const player of room.players) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        try {
          player.ws.send(msg);
        } catch {
          // ignore send errors
        }
      }
    }

    // 2. Server-Sent Events delivery
    for (let i = room.sseClients.length - 1; i >= 0; i--) {
      const client = room.sseClients[i];
      try {
        client.res.write(`data: ${msg}\n\n`);
      } catch {
        room.sseClients.splice(i, 1);
      }
    }
  }

  private selectQuestions(subject: Subject, difficulty: Difficulty, count: number, topic?: string): Question[] {
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    const pool = DEFAULT_QUESTIONS.filter((q) => q.subject === subject);

    if (topic && topic !== 'All Topics' && topic !== 'all') {
      const normTopic = topic.toLowerCase().trim();
      const topicMatches = pool.filter((q) => {
        if (!q.topic) return false;
        const qTopic = q.topic.toLowerCase().trim();
        return qTopic === normTopic || qTopic.includes(normTopic) || normTopic.includes(qTopic);
      });

      if (topicMatches.length > 0) {
        const exact = topicMatches.filter((q) => q.difficulty === difficulty);
        const others = topicMatches.filter((q) => q.difficulty !== difficulty);
        const combined = [...shuffle(exact), ...shuffle(others)];
        if (combined.length >= count) {
          return combined.slice(0, count);
        }
        const usedIds = new Set(combined.map((q) => q.id));
        const remainingNeeded = count - combined.length;
        const fallback = shuffle(pool.filter((q) => !usedIds.has(q.id))).slice(0, remainingNeeded);
        return [...combined, ...fallback];
      }
    }

    const exact = pool.filter((q) => q.difficulty === difficulty);
    const others = pool.filter((q) => q.difficulty !== difficulty);
    const combined = [...shuffle(exact), ...shuffle(others)];
    let selected = combined.slice(0, Math.min(count, combined.length));

    if (selected.length < count) {
      const remainingNeeded = count - selected.length;
      const selectedIds = new Set(selected.map((q) => q.id));
      const additional = shuffle(DEFAULT_QUESTIONS.filter((q) => !selectedIds.has(q.id))).slice(0, remainingNeeded);
      selected = [...selected, ...additional];
    }

    return selected;
  }

  // --------------------------------------------------------------------------
  // CREATE ROOM
  // --------------------------------------------------------------------------
  public createRoom(
    hostName: string,
    playerId: string,
    subject: Subject,
    difficulty: Difficulty,
    questionCount: number,
    timePerQuestion: number,
    topic?: string,
    ws?: WebSocket | null
  ): { success: boolean; room: MultiplayerRoomState; code: string } {
    let code = this.generateCode();
    while (this.rooms.has(code)) {
      code = this.generateCode();
    }

    const hostPlayer: PlayerState = {
      id: playerId,
      name: hostName.trim() || 'Host Warrior',
      isHost: true,
      ready: true, // Host is ready by default
      score: 0,
      correctAnswers: 0,
      totalAnswered: 0,
      currentAnswer: null,
      history: [],
      connected: true,
      ws: ws || null,
    };

    const selectedTopic = topic?.trim() || 'All Topics';
    const questions = this.selectQuestions(subject, difficulty, questionCount, selectedTopic);

    const room: ServerRoom = {
      code,
      hostId: playerId,
      subject,
      topic: selectedTopic,
      difficulty,
      questionCount,
      timePerQuestion: [10, 15, 20, 30].includes(timePerQuestion) ? timePerQuestion : 15,
      maxPlayers: 4,
      status: 'lobby',
      createdAt: Date.now(),
      players: [hostPlayer],
      questions,
      currentQuestionIndex: 0,
      questionStartTime: 0,
      winnerId: null,
      isDraw: false,
      xpAwarded: {},
      rematchVotes: [],
      disconnectTimer: {},
      sseClients: [],
      announcement: null,
      currentReviewData: null,
      currentFinalResults: null,
    };

    this.rooms.set(code, room);

    const sanitized = this.sanitizeRoomState(room);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'room_created', room: sanitized, playerId }));
    }

    return { success: true, room: sanitized, code };
  }

  // --------------------------------------------------------------------------
  // JOIN ROOM
  // --------------------------------------------------------------------------
  public joinRoom(
    code: string,
    playerName: string,
    playerId: string,
    ws?: WebSocket | null
  ): { success: boolean; room?: MultiplayerRoomState; message?: string } {
    const formattedCode = code.trim().toUpperCase();
    const room = this.rooms.get(formattedCode);

    if (!room) {
      return { success: false, message: 'Room code not found. Check the 6-character code.' };
    }

    // Check if player is reconnecting
    const existingPlayer = room.players.find((p) => p.id === playerId);
    if (existingPlayer) {
      if (ws) existingPlayer.ws = ws;
      existingPlayer.connected = true;
      if (playerName.trim()) existingPlayer.name = playerName.trim();
      
      const sanitized = this.sanitizeRoomState(room);
      this.broadcast(room, {
        type: 'room_updated',
        room: sanitized,
        announcement: `${existingPlayer.name} rejoined!`,
      });
      return { success: true, room: sanitized };
    }

    if (room.status !== 'lobby') {
      return { success: false, message: 'Battle is already in progress or completed.' };
    }

    if (room.players.length >= 4) {
      return { success: false, message: 'Room is already full (maximum 4 players reached).' };
    }

    const newPlayer: PlayerState = {
      id: playerId,
      name: playerName.trim() || `Player ${room.players.length + 1}`,
      isHost: false,
      ready: false,
      score: 0,
      correctAnswers: 0,
      totalAnswered: 0,
      currentAnswer: null,
      history: [],
      connected: true,
      ws: ws || null,
    };

    room.players.push(newPlayer);
    room.announcement = `${newPlayer.name} joined the battle lobby!`;

    const sanitized = this.sanitizeRoomState(room);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'room_joined', room: sanitized, playerId }));
    }

    this.broadcast(room, {
      type: 'room_updated',
      room: sanitized,
      announcement: `${newPlayer.name} joined the battle lobby!`,
    });

    return { success: true, room: sanitized };
  }

  // --------------------------------------------------------------------------
  // TOGGLE READY
  // --------------------------------------------------------------------------
  public toggleReady(
    code: string,
    playerId: string
  ): { success: boolean; room?: MultiplayerRoomState; message?: string } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return { success: false, message: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, message: 'Game not in lobby' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found in room' };

    player.ready = !player.ready;
    const sanitized = this.sanitizeRoomState(room);

    this.broadcast(room, {
      type: 'room_updated',
      room: sanitized,
    });

    return { success: true, room: sanitized };
  }

  // --------------------------------------------------------------------------
  // START GAME
  // --------------------------------------------------------------------------
  public startGame(
    code: string,
    playerId: string
  ): { success: boolean; room?: MultiplayerRoomState; message?: string } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return { success: false, message: 'Room not found' };
    if (room.status !== 'lobby') return { success: false, message: 'Battle already started' };

    if (room.hostId !== playerId) {
      return { success: false, message: 'Only the host can start the battle.' };
    }

    if (room.players.length < 2) {
      return { success: false, message: 'Waiting for other players to join (minimum 2 players required).' };
    }

    const allReady = room.players.every((p) => p.ready);
    if (!allReady) {
      return { success: false, message: 'All players must be Ready before starting.' };
    }

    // Initialize game
    room.status = 'playing';
    room.currentQuestionIndex = 0;
    room.questionStartTime = Date.now();
    room.announcement = 'Battle commenced!';
    room.currentReviewData = null;
    room.currentFinalResults = null;

    for (const p of room.players) {
      p.score = 0;
      p.correctAnswers = 0;
      p.totalAnswered = 0;
      p.currentAnswer = null;
      p.history = [];
    }

    const currentQ = room.questions[0];
    const sanitized = this.sanitizeRoomState(room);

    this.broadcast(room, {
      type: 'game_started',
      room: sanitized,
      questionIndex: 0,
      totalQuestions: room.questions.length,
      timePerQuestion: room.timePerQuestion,
      question: this.sanitizeQuestion(currentQ),
    });

    this.startQuestionTimer(room);

    return { success: true, room: sanitized };
  }

  private startQuestionTimer(room: ServerRoom) {
    if (room.questionTimer) clearTimeout(room.questionTimer);

    room.questionTimer = setTimeout(() => {
      this.handleQuestionTimeout(room);
    }, (room.timePerQuestion + 0.5) * 1000);
  }

  private handleQuestionTimeout(room: ServerRoom) {
    if (room.status !== 'playing') return;

    const currentQ = room.questions[room.currentQuestionIndex];

    for (const player of room.players) {
      if (!player.currentAnswer) {
        player.currentAnswer = {
          choice: 'TIME_EXPIRED',
          isCorrect: false,
          responseTimeMs: room.timePerQuestion * 1000,
          scoreEarned: 0,
        };
        player.totalAnswered += 1;
        player.history.push({
          questionIndex: room.currentQuestionIndex,
          choice: 'TIME_EXPIRED',
          isCorrect: false,
          responseTimeMs: room.timePerQuestion * 1000,
          scoreEarned: 0,
        });
      }
    }

    this.completeQuestion(room, currentQ);
  }

  // --------------------------------------------------------------------------
  // SUBMIT ANSWER
  // --------------------------------------------------------------------------
  public submitAnswer(
    code: string,
    playerId: string,
    questionIndex: number,
    choice: string
  ): { success: boolean; scoreEarned?: number; totalScore?: number; message?: string } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room || room.status !== 'playing') {
      return { success: false, message: 'Game is not in active question answering state' };
    }

    if (questionIndex !== room.currentQuestionIndex) {
      return { success: false, message: 'Invalid question index' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, message: 'Player not found in room' };
    if (player.currentAnswer) return { success: false, message: 'Answer already submitted for this question' };

    const currentQ = room.questions[room.currentQuestionIndex];
    const now = Date.now();
    const responseTimeMs = Math.min(room.timePerQuestion * 1000, Math.max(100, now - room.questionStartTime));
    const timeRemainingSec = Math.max(0, room.timePerQuestion - responseTimeMs / 1000);

    const isCorrect = choice === currentQ.correctAnswer;
    const basePoints = isCorrect ? 100 : 0;
    const speedBonus = isCorrect ? Math.round((timeRemainingSec / room.timePerQuestion) * 50) : 0;
    const scoreEarned = basePoints + speedBonus;

    player.score += scoreEarned;
    if (isCorrect) player.correctAnswers += 1;
    player.totalAnswered += 1;

    player.currentAnswer = {
      choice,
      isCorrect,
      responseTimeMs,
      scoreEarned,
    };

    player.history.push({
      questionIndex,
      choice,
      isCorrect,
      responseTimeMs,
      scoreEarned,
    });

    if (player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(
        JSON.stringify({
          type: 'answer_confirmed',
          questionIndex,
          scoreEarned,
          totalScore: player.score,
        })
      );
    }

    // Broadcast update that player answered (without exposing their choice)
    this.broadcast(room, {
      type: 'player_answered',
      playerId,
      score: player.score,
      room: this.sanitizeRoomState(room),
    });

    // Check if both players answered
    const connectedPlayers = room.players.filter((p) => p.connected);
    const allAnswered = connectedPlayers.length > 0 && connectedPlayers.every((p) => Boolean(p.currentAnswer));

    if (allAnswered) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      this.completeQuestion(room, currentQ);
    }

    return { success: true, scoreEarned, totalScore: player.score };
  }

  private completeQuestion(room: ServerRoom, currentQ: Question) {
    room.status = 'question_review';

    const reviewData: ReviewData = {
      correctAnswer: currentQ.correctAnswer,
      explanation: currentQ.explanation,
      playerResults: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        choice: p.currentAnswer?.choice || 'NONE',
        isCorrect: p.currentAnswer?.isCorrect || false,
        scoreEarned: p.currentAnswer?.scoreEarned || 0,
        totalScore: p.score,
      })),
    };

    room.currentReviewData = reviewData;
    const sanitized = this.sanitizeRoomState(room);

    this.broadcast(room, {
      type: 'question_completed',
      questionIndex: room.currentQuestionIndex,
      correctAnswer: currentQ.correctAnswer,
      explanation: currentQ.explanation,
      playerResults: reviewData.playerResults,
      room: sanitized,
    });

    if (room.reviewTimer) clearTimeout(room.reviewTimer);
    room.reviewTimer = setTimeout(() => {
      this.advanceToNextQuestionOrFinish(room);
    }, 3200);
  }

  private advanceToNextQuestionOrFinish(room: ServerRoom) {
    if (room.currentQuestionIndex + 1 < room.questions.length) {
      room.currentQuestionIndex += 1;
      room.status = 'playing';
      room.questionStartTime = Date.now();
      room.currentReviewData = null;

      for (const p of room.players) {
        p.currentAnswer = null;
      }

      const nextQ = room.questions[room.currentQuestionIndex];
      const sanitized = this.sanitizeRoomState(room);

      this.broadcast(room, {
        type: 'next_question',
        questionIndex: room.currentQuestionIndex,
        totalQuestions: room.questions.length,
        timePerQuestion: room.timePerQuestion,
        question: this.sanitizeQuestion(nextQ),
        room: sanitized,
      });

      this.startQuestionTimer(room);
    } else {
      this.finishGame(room);
    }
  }

  private finishGame(room: ServerRoom) {
    room.status = 'finished';

    // Sort players by score descending, then correct answers, then name
    const sorted = [...room.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      return a.name.localeCompare(b.name);
    });

    let winnerId: string | null = null;
    let isDraw = false;

    if (sorted.length > 0) {
      if (sorted.length > 1 && sorted[0].score === sorted[1].score) {
        isDraw = true;
        winnerId = null;
      } else {
        winnerId = sorted[0].id;
        isDraw = false;
      }
    }

    // Assign placement ranks (1st, 2nd, 3rd, 4th) with tie support
    const ranks = new Map<string, number>();
    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].score < sorted[i - 1].score) {
        currentRank = i + 1;
      }
      ranks.set(sorted[i].id, currentRank);
    }

    room.winnerId = winnerId;
    room.isDraw = isDraw;

    room.xpAwarded = {};
    for (const player of room.players) {
      const rank = ranks.get(player.id) || 1;
      let xp = 50; // base battle completion
      if (rank === 1) {
        xp += isDraw ? 70 : 100; // 1st place bonus
      } else if (rank === 2) {
        xp += 60; // 2nd place
      } else if (rank === 3) {
        xp += 40; // 3rd place
      } else {
        xp += 25; // 4th place
      }
      xp += player.correctAnswers * 15; // answer accuracy bonus
      room.xpAwarded[player.id] = xp;
    }

    const finalResults: MultiplayerFinalResults = {
      winnerId,
      isDraw,
      finalScores: sorted.map((p) => ({
        id: p.id,
        name: p.name,
        rank: ranks.get(p.id) || 1,
        score: p.score,
        correctAnswers: p.correctAnswers,
        totalQuestions: room.questions.length,
        accuracy: Math.round((p.correctAnswers / Math.max(1, room.questions.length)) * 100),
        xpEarned: room.xpAwarded[p.id],
      })),
    };

    room.currentFinalResults = finalResults;
    const sanitized = this.sanitizeRoomState(room);

    this.broadcast(room, {
      type: 'game_finished',
      room: sanitized,
      winnerId,
      isDraw,
      finalScores: finalResults.finalScores,
    });
  }

  // --------------------------------------------------------------------------
  // REMATCH
  // --------------------------------------------------------------------------
  public requestRematch(code: string, playerId: string): { success: boolean; room?: MultiplayerRoomState } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room || room.status !== 'finished') return { success: false };

    if (!room.rematchVotes.includes(playerId)) {
      room.rematchVotes.push(playerId);
    }

    const player = room.players.find((p) => p.id === playerId);

    if (room.rematchVotes.length >= Math.min(2, room.players.length)) {
      room.status = 'lobby';
      room.currentQuestionIndex = 0;
      room.winnerId = null;
      room.isDraw = false;
      room.rematchVotes = [];
      room.questions = this.selectQuestions(room.subject, room.difficulty, room.questionCount, room.topic);
      room.currentReviewData = null;
      room.currentFinalResults = null;
      room.announcement = 'Rematch accepted! Ready up in the lobby.';

      for (const p of room.players) {
        p.ready = false;
        p.score = 0;
        p.correctAnswers = 0;
        p.totalAnswered = 0;
        p.currentAnswer = null;
        p.history = [];
      }

      const sanitized = this.sanitizeRoomState(room);
      this.broadcast(room, {
        type: 'rematch_accepted',
        room: sanitized,
      });
      return { success: true, room: sanitized };
    } else {
      const sanitized = this.sanitizeRoomState(room);
      this.broadcast(room, {
        type: 'rematch_requested',
        requesterId: playerId,
        requesterName: player?.name || 'Player',
        room: sanitized,
      });
      return { success: true, room: sanitized };
    }
  }

  // --------------------------------------------------------------------------
  // LEAVE ROOM
  // --------------------------------------------------------------------------
  public leaveRoom(code: string, playerId: string): { success: boolean } {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return { success: false };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false };

    if (room.status === 'lobby') {
      room.players = room.players.filter((p) => p.id !== playerId);
      if (room.players.length === 0) {
        this.cleanupRoom(code);
        return { success: true };
      }
      if (player.isHost && room.players[0]) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
      }
      const sanitized = this.sanitizeRoomState(room);
      this.broadcast(room, {
        type: 'room_updated',
        room: sanitized,
        announcement: `${player.name} left the room.`,
      });
    } else if (room.status === 'playing' || room.status === 'question_review') {
      player.connected = false;
      const activeRemaining = room.players.filter((p) => p.connected);
      if (activeRemaining.length <= 1) {
        if (activeRemaining.length === 1) {
          room.winnerId = activeRemaining[0].id;
        }
        this.finishGame(room);
      } else {
        const sanitized = this.sanitizeRoomState(room);
        this.broadcast(room, {
          type: 'room_updated',
          room: sanitized,
          announcement: `${player.name} left the battle.`,
        });
        const allAnswered = activeRemaining.every((p) => Boolean(p.currentAnswer));
        if (allAnswered && room.status === 'playing') {
          if (room.questionTimer) clearTimeout(room.questionTimer);
          const currentQ = room.questions[room.currentQuestionIndex];
          this.completeQuestion(room, currentQ);
        }
      }
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // SSE REALTIME SUBSCRIPTIONS
  // --------------------------------------------------------------------------
  public subscribeSse(code: string, playerId: string, res: Response): boolean {
    const room = this.rooms.get(code.trim().toUpperCase());
    if (!room) return false;

    // Send headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client: SseClient = { id: playerId, res };
    room.sseClients.push(client);

    // Send immediate current state
    const currentMsg = JSON.stringify({
      type: 'room_updated',
      room: this.sanitizeRoomState(room),
    });
    res.write(`data: ${currentMsg}\n\n`);

    res.on('close', () => {
      room.sseClients = room.sseClients.filter((c) => c !== client);
    });

    return true;
  }

  // --------------------------------------------------------------------------
  // GET ROOM
  // --------------------------------------------------------------------------
  public getRoom(code: string): MultiplayerRoomState | null {
    const room = this.rooms.get(code.trim().toUpperCase());
    return room ? this.sanitizeRoomState(room) : null;
  }

  public handleDisconnect(ws: WebSocket): void {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.ws === ws);
      if (player) {
        player.connected = false;
        player.ws = null;

        if (room.status === 'lobby') {
          room.players = room.players.filter((p) => p.id !== player.id);
          if (room.players.length === 0) {
            this.cleanupRoom(room.code);
            return;
          }
          if (player.isHost && room.players[0]) {
            room.players[0].isHost = true;
            room.hostId = room.players[0].id;
          }
          this.broadcast(room, {
            type: 'room_updated',
            room: this.sanitizeRoomState(room),
            announcement: `${player.name} disconnected.`,
          });
        }
        break;
      }
    }
  }

  private cleanupRoom(code: string) {
    const room = this.rooms.get(code);
    if (room) {
      if (room.questionTimer) clearTimeout(room.questionTimer);
      if (room.reviewTimer) clearTimeout(room.reviewTimer);
      if (room.disconnectTimer) {
        for (const t of Object.values(room.disconnectTimer)) {
          clearTimeout(t);
        }
      }
      for (const client of room.sseClients) {
        try {
          client.res.end();
        } catch {
          // ignore
        }
      }
      this.rooms.delete(code);
    }
  }
}

export const multiplayerManager = new MultiplayerManager();
