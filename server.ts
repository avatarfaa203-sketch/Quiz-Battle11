import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { multiplayerManager } from './src/server/multiplayer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Prevent 404 console error for favicon
app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ----------------------------------------------------
// 1. GEMINI AI EXPLANATION ENDPOINT
// ----------------------------------------------------
app.post('/api/ai-explain', async (req: Request, res: Response) => {
  try {
    const { question, correctAnswer, chosenAnswer, explanation, subject } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const hasValidKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 15;

    if (!hasValidKey) {
      return res.status(200).json({
        success: false,
        fallbackExplanation: explanation,
        message: 'Built-in curriculum explanation active.',
      });
    }

    const prompt = `You are a friendly, inspiring high-school academic tutor for "Quiz Battle".
A student just answered a ${subject} question.

Question: "${question}"
Correct Answer Option: ${correctAnswer}
Student's Chosen Option: ${chosenAnswer || 'No answer'}
Standard Textbook Explanation: "${explanation}"

Please provide a clear, concise educational breakdown in 3-4 bullet points or short paragraphs:
1. Core Concept: What is the underlying academic principle?
2. Step-by-Step Logic: Why is option ${correctAnswer} correct?
3. Pro Tip / Memory Hook: A fast trick or rule of thumb for exams.

Keep the language accessible, encouraging, and appropriate for high school students. Do not write filler intros or sign-offs.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const aiText = response.text || explanation;

    return res.json({
      success: true,
      explanation: aiText,
    });
  } catch {
    return res.status(200).json({
      success: false,
      fallbackExplanation: req.body.explanation,
      message: 'Failed to generate AI explanation. Built-in explanation available.',
    });
  }
});

// ----------------------------------------------------
// 2. ROOM MULTIPLAYER REST & SSE ENDPOINTS
// ----------------------------------------------------
app.post('/api/rooms/create', (req: Request, res: Response) => {
  const { hostName, playerId, subject, difficulty, questionCount, timePerQuestion } = req.body;
  if (!playerId) {
    return res.status(400).json({ success: false, message: 'Missing playerId' });
  }
  const result = multiplayerManager.createRoom(
    hostName || 'Host Warrior',
    playerId,
    subject || 'Mathematics',
    difficulty || 'medium',
    Number(questionCount) || 5,
    Number(timePerQuestion) || 15
  );
  return res.json(result);
});

app.post('/api/rooms/join', (req: Request, res: Response) => {
  const { code, playerName, playerId } = req.body;
  if (!code || !playerId) {
    return res.status(400).json({ success: false, message: 'Room code and player ID are required' });
  }
  const result = multiplayerManager.joinRoom(code, playerName || 'Challenger', playerId);
  if (!result.success) {
    return res.status(400).json(result);
  }
  return res.json(result);
});

app.get('/api/rooms/:code', (req: Request, res: Response) => {
  const room = multiplayerManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room code not found' });
  }
  return res.json({ success: true, room });
});

app.get('/api/rooms/:code/events', (req: Request, res: Response) => {
  const { code } = req.params;
  const playerId = (req.query.playerId as string) || 'guest';
  const subscribed = multiplayerManager.subscribeSse(code, playerId, res);
  if (!subscribed) {
    return res.status(404).json({ success: false, message: 'Room not found' });
  }
});

app.post('/api/rooms/:code/ready', (req: Request, res: Response) => {
  const { playerId } = req.body;
  const result = multiplayerManager.toggleReady(req.params.code, playerId);
  return res.json(result);
});

app.post('/api/rooms/:code/start', (req: Request, res: Response) => {
  const { playerId } = req.body;
  const result = multiplayerManager.startGame(req.params.code, playerId);
  return res.json(result);
});

app.post('/api/rooms/:code/answer', (req: Request, res: Response) => {
  const { playerId, questionIndex, choice } = req.body;
  const result = multiplayerManager.submitAnswer(req.params.code, playerId, Number(questionIndex), choice);
  return res.json(result);
});

app.post('/api/rooms/:code/rematch', (req: Request, res: Response) => {
  const { playerId } = req.body;
  const result = multiplayerManager.requestRematch(req.params.code, playerId);
  return res.json(result);
});

app.post('/api/rooms/:code/leave', (req: Request, res: Response) => {
  const { playerId } = req.body;
  const result = multiplayerManager.leaveRoom(req.params.code, playerId);
  return res.json(result);
});

// ----------------------------------------------------
// 3. LEADERBOARD DATA
// ----------------------------------------------------
const GLOBAL_LEADERBOARD_SEED = [
  { rank: 1, username: 'QuantumAce', xp: 8450, wins: 54, accuracy: 96, level: 18 },
  { rank: 2, username: 'BioGenesis', xp: 7120, wins: 46, accuracy: 92, level: 16 },
  { rank: 3, username: 'VectorSigma', xp: 6490, wins: 41, accuracy: 89, level: 14 },
  { rank: 4, username: 'CyberScribe', xp: 5820, wins: 38, accuracy: 88, level: 13 },
  { rank: 5, username: 'NewtonianForce', xp: 5210, wins: 33, accuracy: 87, level: 12 },
  { rank: 6, username: 'CosmicVoyager', xp: 4640, wins: 29, accuracy: 85, level: 11 },
  { rank: 7, username: 'GrammarKnight', xp: 3950, wins: 24, accuracy: 84, level: 9 },
  { rank: 8, username: 'PolymathPro', xp: 3410, wins: 21, accuracy: 82, level: 8 },
  { rank: 9, username: 'BinaryFalcon', xp: 2890, wins: 18, accuracy: 80, level: 7 },
  { rank: 10, username: 'AtomSplitter', xp: 2350, wins: 15, accuracy: 79, level: 6 },
];

const WEEKLY_LEADERBOARD_SEED = [
  { rank: 1, username: 'VectorSigma', xp: 1980, wins: 14, accuracy: 94, level: 14 },
  { rank: 2, username: 'QuantumAce', xp: 1740, wins: 11, accuracy: 93, level: 18 },
  { rank: 3, username: 'BinaryFalcon', xp: 1420, wins: 9, accuracy: 88, level: 7 },
  { rank: 4, username: 'CyberScribe', xp: 1210, wins: 8, accuracy: 86, level: 13 },
  { rank: 5, username: 'BioGenesis', xp: 1050, wins: 7, accuracy: 85, level: 16 },
  { rank: 6, username: 'CosmicVoyager', xp: 890, wins: 6, accuracy: 83, level: 11 },
  { rank: 7, username: 'PolymathPro', xp: 750, wins: 5, accuracy: 82, level: 8 },
  { rank: 8, username: 'GrammarKnight', xp: 620, wins: 4, accuracy: 80, level: 9 },
];

app.get('/api/leaderboards', (_req: Request, res: Response) => {
  return res.json({
    global: GLOBAL_LEADERBOARD_SEED,
    weekly: WEEKLY_LEADERBOARD_SEED,
  });
});

// ----------------------------------------------------
// 4. REAL-TIME WEBSOCKET MULTIPLAYER (DUAL TRANSPORT)
// ----------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      switch (data.type) {
        case 'create_room':
          multiplayerManager.createRoom(
            data.hostName,
            data.playerId,
            data.subject,
            data.difficulty,
            data.questionCount,
            data.timePerQuestion,
            ws
          );
          break;
        case 'join_room':
          multiplayerManager.joinRoom(data.code, data.playerName, data.playerId, ws);
          break;
        case 'toggle_ready':
          multiplayerManager.toggleReady(data.code, data.playerId);
          break;
        case 'start_game':
          multiplayerManager.startGame(data.code, data.playerId);
          break;
        case 'submit_answer':
          multiplayerManager.submitAnswer(data.code, data.playerId, data.questionIndex, data.choice);
          break;
        case 'request_rematch':
          multiplayerManager.requestRematch(data.code, data.playerId);
          break;
        case 'leave_room':
          multiplayerManager.leaveRoom(data.code, data.playerId);
          break;
      }
    } catch {
      // Ignore malformed payloads
    }
  });

  ws.on('close', () => {
    multiplayerManager.handleDisconnect(ws);
  });

  ws.on('error', () => {
    multiplayerManager.handleDisconnect(ws);
  });
});

// ----------------------------------------------------
// 5. VITE DEV MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Quiz Battle server running on http://0.0.0.0:${PORT} with WebSockets enabled`);
  });
}

startServer();
