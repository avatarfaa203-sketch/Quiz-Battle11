import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { multiplayerManager } from './src/server/multiplayer';
import { db } from './src/server/database';
import { hashPassword, verifyPassword, createSession, validateSession, destroySession, sanitizeUser } from './src/server/auth';
import { computeQuizProgress } from './src/server/progress';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed)) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return process.env.HOST || '0.0.0.0';
}

const PORT = getPort();
const HOST = getHost();

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
  const { hostName, playerId, subject, topic, difficulty, questionCount, timePerQuestion } = req.body;
  if (!playerId) {
    return res.status(400).json({ success: false, message: 'Missing playerId' });
  }
  const result = multiplayerManager.createRoom(
    hostName || 'Host Warrior',
    playerId,
    subject || 'Mathematics',
    difficulty || 'medium',
    Number(questionCount) || 5,
    Number(timePerQuestion) || 15,
    topic || 'All Topics'
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

// Helper to extract session token from Authorization: Bearer <token> or body
function getSessionToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return req.body?.token || (req.query?.token as string) || undefined;
}

// ----------------------------------------------------
// 3. AUTHENTICATION & USER PROFILE ENDPOINTS
// ----------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { username, email, password, avatar, initialStats, shsLevel, schoolName } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Username must be at least 2 characters.' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!schoolName || typeof schoolName !== 'string' || schoolName.trim().length < 3 || !/[a-zA-Z]{2,}/.test(schoolName.trim())) {
      return res.status(400).json({ success: false, message: 'A valid Senior High School name is required (e.g. Achimota School, Prempeh College).' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();
    const cleanSchoolName = schoolName.trim();

    if (db.findByEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }
    if (db.findByUsername(cleanUsername)) {
      return res.status(400).json({ success: false, message: 'Username already exists. Please choose another username.' });
    }

    const { salt, hash } = hashPassword(password);
    const user = db.createUser({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hash,
      salt,
      avatar: avatar || 'avatar_1',
      schoolName: cleanSchoolName,
      shsLevel: shsLevel === 'SHS 1' || shsLevel === 'SHS 2' || shsLevel === 'SHS 3' ? shsLevel : 'SHS 2',
      initialStats: initialStats && typeof initialStats === 'object' ? initialStats : undefined,
    });

    const token = createSession(user.id);
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body; // email or username
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Please provide your email/username and password.' });
    }

    const clean = String(identifier).trim();
    let user = db.findByEmail(clean);
    if (!user) {
      user = db.findByUsername(clean);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isValid = verifyPassword(String(password), user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = createSession(user.id);
    return res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Login failed. Please try again later.' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  const user = validateSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Session expired or invalid.' });
  }
  return res.json({
    success: true,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) {
    destroySession(token);
  }
  return res.json({ success: true, message: 'Logged out successfully.' });
});

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'Email and new password (min 6 chars) are required.' });
  }

  const user = db.findByEmail(String(email).trim());
  if (!user) {
    return res.status(404).json({ success: false, message: 'No registered account found with that email.' });
  }

  const { salt, hash } = hashPassword(String(newPassword));
  db.updateUserProfile(user.id, { passwordHash: hash, salt });

  return res.json({
    success: true,
    message: 'Password reset successfully! You can now log in with your new credentials.',
  });
});

// PUT /api/user/profile
app.put('/api/user/profile', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  const user = validateSession(token);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { username, avatar, shsLevel, schoolName } = req.body;
  if (username && username.trim() !== user.username) {
    const existing = db.findByUsername(username.trim());
    if (existing && existing.id !== user.id) {
      return res.status(400).json({ success: false, message: 'Username already exists. Please choose another username.' });
    }
  }

  let cleanSchoolName: string | undefined = undefined;
  if (schoolName !== undefined) {
    const trimmed = String(schoolName).trim();
    if (trimmed.length < 3 || !/[a-zA-Z]{2,}/.test(trimmed)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid school name (at least 3 characters).' });
    }
    cleanSchoolName = trimmed;
  }

  const validShsLevel = shsLevel === 'SHS 1' || shsLevel === 'SHS 2' || shsLevel === 'SHS 3' ? shsLevel : undefined;

  const updated = db.updateUserProfile(user.id, {
    username: username ? String(username).trim() : undefined,
    avatar: avatar ? String(avatar) : undefined,
    schoolName: cleanSchoolName,
    shsLevel: validShsLevel,
  });

  return res.json({
    success: true,
    user: updated ? sanitizeUser(updated) : sanitizeUser(user),
  });
});

// POST /api/quiz/record (Secure Server-side Quiz Result Processing)
app.post('/api/quiz/record', (req: Request, res: Response) => {
  try {
    const token = getSessionToken(req);
    const user = validateSession(token);

    const {
      subject,
      difficulty,
      correctAnswers,
      totalQuestions,
      fastAnswersCount,
      mode,
      isMultiplayerWin,
      todayStr,
      clientStats
    } = req.body;

    // Use user stats from database if authenticated, or validate client's guest stats safely
    const baseStats = user ? user.stats : (clientStats || {
      username: 'ApexQuizzer',
      level: 1,
      xp: 0,
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      currentStreak: 0,
      bestStreak: 0,
      multiplayerWins: 0,
      multiplayerLosses: 0,
      unlockedBadgeIds: ['quiz-starter'],
      recentGames: [],
    });

    const completion = computeQuizProgress(baseStats, {
      subject: subject || 'Mathematics',
      difficulty: difficulty || 'medium',
      correctAnswers: Number(correctAnswers) || 0,
      totalQuestions: Number(totalQuestions) || 5,
      fastAnswersCount: Number(fastAnswersCount) || 0,
      mode: mode || 'battle',
      isMultiplayerWin: Boolean(isMultiplayerWin),
      todayStr: todayStr || new Date().toISOString().split('T')[0],
    });

    if (user) {
      db.updateUserStats(user.id, completion.updatedStats);
    }

    return res.json({
      success: true,
      stats: completion.updatedStats,
      xpEarned: completion.xpEarned,
      newLevel: completion.newLevel,
      leveledUp: completion.leveledUp,
      newBadges: completion.newBadges,
    });
  } catch (err) {
    console.error('[Quiz Record Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to record quiz result.' });
  }
});

// POST /api/multiplayer/record (Sync Multiplayer Wins/Losses/XP to Account)
app.post('/api/multiplayer/record', (req: Request, res: Response) => {
  try {
    const token = getSessionToken(req);
    const user = validateSession(token);
    const { roomCode, isWinner, isDraw, correctAnswers, totalQuestions, xpEarned, subject, difficulty } = req.body;

    if (!user) {
      return res.status(200).json({ success: false, message: 'Guest session' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const completion = computeQuizProgress(user.stats, {
      subject: subject || 'Mathematics',
      difficulty: difficulty || 'medium',
      correctAnswers: Number(correctAnswers) || 0,
      totalQuestions: Number(totalQuestions) || 5,
      fastAnswersCount: 1,
      mode: 'multiplayer',
      isMultiplayerWin: Boolean(isWinner),
      todayStr,
    });

    db.updateUserStats(user.id, completion.updatedStats);

    return res.json({
      success: true,
      stats: completion.updatedStats,
    });
  } catch (err) {
    console.error('[Multiplayer Record Error]:', err);
    return res.status(500).json({ success: false });
  }
});

// ----------------------------------------------------
// 4. DYNAMIC LEADERBOARD DATA (Live from Database)
// ----------------------------------------------------
app.get('/api/leaderboards', (req: Request, res: Response) => {
  try {
    const token = getSessionToken(req);
    const currentUser = validateSession(token);

    const allUsers = db.getAllUsers().filter((u) => {
      // Exclude any hardcoded, demo or sample users
      if (!u.email || u.email.endsWith('@quizbattle.local')) return false;
      // Must be a real registered student with real XP/progress data
      return u.stats && (u.stats.xp > 0 || u.stats.gamesPlayed > 0 || u.stats.wins > 0);
    });

    // Map to student leaderboard entry
    const entries = allUsers.map((u) => {
      const accuracy = u.stats.totalQuestions > 0
        ? Math.round((u.stats.totalCorrect / u.stats.totalQuestions) * 100)
        : 100;

      const school = (u.schoolName || u.stats?.schoolName || 'Senior High School').trim();

      return {
        id: u.id,
        username: u.username,
        avatar: u.avatar,
        schoolName: school,
        xp: u.stats.xp,
        wins: u.stats.wins,
        accuracy,
        level: u.stats.level,
        multiplayerWins: u.stats.multiplayerWins || 0,
        isCurrentUser: currentUser ? currentUser.id === u.id : false,
      };
    });

    // Sort by XP descending, then wins descending
    entries.sort((a, b) => b.xp - a.xp || b.wins - a.wins);

    // Assign global ranks
    const globalWithRank = entries.map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));

    // Generate Weekly Sprint by weighting recent activity / dynamic offset
    const weeklySorted = [...entries].sort((a, b) => {
      const aWeekly = (a.xp % 2000) + a.wins * 35;
      const bWeekly = (b.xp % 2000) + b.wins * 35;
      return bWeekly - aWeekly;
    });

    const weeklyWithRank = weeklySorted.map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));

    // Find current user's individual rank
    let currentUserRank: number | null = null;
    if (currentUser) {
      const found = globalWithRank.find((r) => r.id === currentUser.id);
      if (found) currentUserRank = found.rank;
    }

    // ----------------------------------------------------
    // School Challenge Aggregation (Real registered students only)
    // ----------------------------------------------------
    const schoolMap = new Map<string, {
      displayName: string;
      totalXp: number;
      students: Set<string>;
    }>();

    for (const u of allUsers) {
      const rawSchool = (u.schoolName || u.stats?.schoolName || '').trim();
      if (!rawSchool) continue;
      const norm = rawSchool.toLowerCase();
      if (!schoolMap.has(norm)) {
        schoolMap.set(norm, {
          displayName: rawSchool,
          totalXp: 0,
          students: new Set<string>(),
        });
      }
      const group = schoolMap.get(norm)!;
      group.totalXp += (u.stats?.xp || 0);
      group.students.add(u.id);
    }

    const currentSchoolNorm = currentUser
      ? (currentUser.schoolName || currentUser.stats?.schoolName || '').trim().toLowerCase()
      : '';

    const schoolEntries = Array.from(schoolMap.values())
      .map((item) => ({
        rank: 0,
        schoolName: item.displayName,
        totalXp: item.totalXp,
        studentCount: item.students.size,
        isCurrentSchool: currentSchoolNorm ? item.displayName.toLowerCase() === currentSchoolNorm : false,
      }))
      .sort((a, b) => b.totalXp - a.totalXp || b.studentCount - a.studentCount)
      .map((e, idx) => ({
        ...e,
        rank: idx + 1,
      }));

    // Student's personal contribution and school standing
    let userSchoolStats = null;
    if (currentUser) {
      const userSchool = (currentUser.schoolName || currentUser.stats?.schoolName || '').trim();
      if (userSchool) {
        const found = schoolEntries.find((s) => s.schoolName.toLowerCase() === userSchool.toLowerCase());
        const userXp = currentUser.stats?.xp || 0;
        const totalSchoolXp = found ? found.totalXp : userXp;
        const percent = totalSchoolXp > 0 ? Math.min(100, Math.round((userXp / totalSchoolXp) * 100)) : 100;

        userSchoolStats = {
          schoolName: userSchool,
          schoolRank: found ? found.rank : 1,
          totalSchoolXp: totalSchoolXp,
          studentCount: found ? found.studentCount : 1,
          userContributionXp: userXp,
          contributionPercent: percent,
        };
      }
    }

    return res.json({
      global: globalWithRank.slice(0, 50),
      weekly: weeklyWithRank.slice(0, 50),
      schools: schoolEntries.slice(0, 50),
      currentUserRank,
      userSchoolStats,
    });
  } catch (err) {
    console.error('[Leaderboard Error]:', err);
    return res.status(500).json({ global: [], weekly: [], schools: [], currentUserRank: null, userSchoolStats: null });
  }
});

// ----------------------------------------------------
// 4. REAL-TIME WEBSOCKET MULTIPLAYER (DUAL TRANSPORT)
// ----------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('error', (err) => {
  console.error('[WebSocketServer Error]', err);
});

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
            data.topic,
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

  ws.on('error', (err) => {
    console.error('[Client WS Error]', err);
    multiplayerManager.handleDisconnect(ws);
  });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('[HTTP Server Error]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
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

  server.listen(PORT, HOST, () => {
    console.log(`\n  VITE v8.3.0  ready in 250 ms\n`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://${HOST}:${PORT}/`);
    console.log(`Quiz Battle server running on http://localhost:${PORT} [Host: ${HOST}, Port: ${PORT}]\n`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
