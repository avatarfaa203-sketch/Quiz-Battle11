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
  schoolName?: string;
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
            // Exclude any demo or test users
            if (u.email && u.email.endsWith('@quizbattle.local')) continue;
            this.users.set(u.id, u);
            if (u.email) this.emailIndex.set(u.email.toLowerCase().trim(), u.id);
            if (u.username) this.usernameIndex.set(u.username.toLowerCase().trim(), u.id);
          }
        }
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
    schoolName: string;
    shsLevel?: ShsLevel;
    initialStats?: Partial<UserStats>;
  }): ServerUserRecord {
    const id = 'usr_' + crypto.randomUUID().substring(0, 16);
    const now = new Date().toISOString();
    const studentShsLevel: ShsLevel = params.shsLevel || (params.initialStats?.shsLevel as ShsLevel) || 'SHS 2';
    const cleanSchoolName = (params.schoolName || params.initialStats?.schoolName || 'Senior High School').trim();

    const stats: UserStats = {
      id,
      username: params.username.trim(),
      email: params.email.toLowerCase().trim(),
      avatar: params.avatar || 'avatar_1',
      schoolName: cleanSchoolName,
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
      schoolName: cleanSchoolName,
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
      schoolName: newStats.schoolName || user.schoolName || user.stats.schoolName,
      shsLevel: newStats.shsLevel || user.stats.shsLevel || user.shsLevel || 'SHS 2',
    };
    if (newStats.schoolName) {
      user.schoolName = newStats.schoolName;
    }
    if (newStats.shsLevel) {
      user.shsLevel = newStats.shsLevel;
    }
    this.saveDatabase();
    return user;
  }

  public updateUserProfile(id: string, updates: { username?: string; avatar?: string; passwordHash?: string; salt?: string; shsLevel?: ShsLevel; schoolName?: string }): ServerUserRecord | null {
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

    if (updates.schoolName) {
      const cleanSchool = updates.schoolName.trim();
      user.schoolName = cleanSchool;
      user.stats.schoolName = cleanSchool;
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
