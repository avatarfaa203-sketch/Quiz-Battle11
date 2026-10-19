import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserStats, GameHistoryItem, ShsLevel } from '../types';

export interface ServerUserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  avatar: string;
  shsLevel?: ShsLevel;
  createdAt: string;
  stats: UserStats;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'users.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export class JsonDatabase {
  private users: Map<string, ServerUserRecord> = new Map();
  private emailIndex: Map<string, string> = new Map(); // lowercase email -> user id
  private usernameIndex: Map<string, string> = new Map(); // lowercase username -> user id

  constructor() {
    this.loadDatabase();
  }

  private loadDatabase() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            this.users.set(u.id, u);
            if (u.email) this.emailIndex.set(u.email.toLowerCase().trim(), u.id);
            if (u.username) this.usernameIndex.set(u.username.toLowerCase().trim(), u.id);
          }
        }
      } else {
        // Seed initial demo users for the leaderboard so the world feels active
        this.seedDemoUsers();
        this.saveDatabase();
      }
    } catch (err) {
      console.error('[DB] Failed to load users.json:', err);
    }
  }

  private saveDatabase() {
    try {
      const data = Array.from(this.users.values());
      const tempPath = DB_FILE + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to write users.json:', err);
    }
  }

  private seedDemoUsers() {
    const demoSeed = [
      { username: 'QuantumAce', xp: 8450, wins: 54, losses: 4, correct: 280, total: 295, streak: 8, mpWins: 24 },
      { username: 'BioGenesis', xp: 7120, wins: 46, losses: 7, correct: 245, total: 265, streak: 6, mpWins: 18 },
      { username: 'VectorSigma', xp: 6490, wins: 41, losses: 6, correct: 215, total: 240, streak: 9, mpWins: 16 },
      { username: 'CyberScribe', xp: 5820, wins: 38, losses: 8, correct: 195, total: 220, streak: 5, mpWins: 14 },
      { username: 'NewtonianForce', xp: 5210, wins: 33, losses: 9, correct: 180, total: 205, streak: 4, mpWins: 12 },
      { username: 'CosmicVoyager', xp: 4640, wins: 29, losses: 11, correct: 160, total: 190, streak: 3, mpWins: 9 },
      { username: 'GrammarKnight', xp: 3950, wins: 24, losses: 12, correct: 140, total: 170, streak: 4, mpWins: 7 },
      { username: 'PolymathPro', xp: 3410, wins: 21, losses: 14, correct: 125, total: 155, streak: 2, mpWins: 5 },
      { username: 'BinaryFalcon', xp: 2890, wins: 18, losses: 15, correct: 110, total: 140, streak: 3, mpWins: 4 },
      { username: 'AtomSplitter', xp: 2350, wins: 15, losses: 16, correct: 95, total: 125, streak: 2, mpWins: 3 },
    ];

    for (const d of demoSeed) {
      const id = 'usr_' + crypto.randomUUID().substring(0, 12);
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync('QuizMaster2026!', salt, 1000, 64, 'sha512').toString('hex');
      
      const stats: UserStats = {
        id,
        username: d.username,
        level: Math.max(1, Math.floor(d.xp / 450) + 1),
        xp: d.xp,
        gamesPlayed: d.wins + d.losses,
        wins: d.wins,
        losses: d.losses,
        totalCorrect: d.correct,
        totalQuestions: d.total,
        currentStreak: d.streak,
        bestStreak: d.streak + 2,
        multiplayerWins: d.mpWins,
        multiplayerLosses: Math.max(1, Math.floor(d.mpWins * 0.4)),
        unlockedBadgeIds: ['quiz-starter', 'first-victory', 'maths-master', 'science-master', 'first-multiplayer-win'],
        recentGames: []
      };

      const record: ServerUserRecord = {
        id,
        username: d.username,
        email: `${d.username.toLowerCase()}@quizbattle.local`,
        passwordHash: hash,
        salt,
        avatar: 'avatar_1',
        createdAt: new Date().toISOString(),
        stats
      };

      this.users.set(id, record);
      this.emailIndex.set(record.email.toLowerCase(), id);
      this.usernameIndex.set(record.username.toLowerCase(), id);
    }
  }

  public findByEmail(email: string): ServerUserRecord | null {
    const id = this.emailIndex.get(email.toLowerCase().trim());
    if (!id) return null;
    return this.users.get(id) || null;
  }

  public findByUsername(username: string): ServerUserRecord | null {
    const id = this.usernameIndex.get(username.toLowerCase().trim());
    if (!id) return null;
    return this.users.get(id) || null;
  }

  public findById(id: string): ServerUserRecord | null {
    return this.users.get(id) || null;
  }

  public createUser(params: {
    username: string;
    email: string;
    passwordHash: string;
    salt: string;
    avatar?: string;
    shsLevel?: ShsLevel;
    initialStats?: Partial<UserStats>;
  }): ServerUserRecord {
    const id = 'usr_' + crypto.randomUUID().substring(0, 16);
    const now = new Date().toISOString();
    const studentShsLevel: ShsLevel = params.shsLevel || (params.initialStats?.shsLevel as ShsLevel) || 'SHS 2';

    const stats: UserStats = {
      id,
      username: params.username.trim(),
      email: params.email.toLowerCase().trim(),
      avatar: params.avatar || 'avatar_1',
      shsLevel: studentShsLevel,
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
      ...(params.initialStats || {})
    };

    const record: ServerUserRecord = {
      id,
      username: params.username.trim(),
      email: params.email.toLowerCase().trim(),
      passwordHash: params.passwordHash,
      salt: params.salt,
      avatar: params.avatar || 'avatar_1',
      shsLevel: studentShsLevel,
      createdAt: now,
      stats
    };

    this.users.set(id, record);
    this.emailIndex.set(record.email.toLowerCase(), id);
    this.usernameIndex.set(record.username.toLowerCase(), id);
    this.saveDatabase();
    return record;
  }

  public updateUserStats(id: string, newStats: UserStats): ServerUserRecord | null {
    const user = this.users.get(id);
    if (!user) return null;
    user.stats = {
      ...user.stats,
      ...newStats,
      id,
      username: user.username,
      email: user.email,
      shsLevel: newStats.shsLevel || user.stats.shsLevel || user.shsLevel || 'SHS 2',
    };
    if (newStats.shsLevel) {
      user.shsLevel = newStats.shsLevel;
    }
    this.saveDatabase();
    return user;
  }

  public updateUserProfile(id: string, updates: { username?: string; avatar?: string; passwordHash?: string; salt?: string; shsLevel?: ShsLevel }): ServerUserRecord | null {
    const user = this.users.get(id);
    if (!user) return null;

    if (updates.username && updates.username.trim() !== user.username) {
      this.usernameIndex.delete(user.username.toLowerCase());
      user.username = updates.username.trim();
      user.stats.username = user.username;
      this.usernameIndex.set(user.username.toLowerCase(), user.id);
    }

    if (updates.avatar) {
      user.avatar = updates.avatar;
      user.stats.avatar = updates.avatar;
    }

    if (updates.shsLevel) {
      user.shsLevel = updates.shsLevel;
      user.stats.shsLevel = updates.shsLevel;
    }

    if (updates.passwordHash && updates.salt) {
      user.passwordHash = updates.passwordHash;
      user.salt = updates.salt;
    }

    this.saveDatabase();
    return user;
  }

  public getAllUsers(): ServerUserRecord[] {
    return Array.from(this.users.values());
  }
}

export const db = new JsonDatabase();
