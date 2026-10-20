import crypto from 'crypto';
import { db, ServerUserRecord } from './database';
import { UserStats, UserProfile } from '../types';

// In-memory token store for session management
// Token -> { userId: string, expiresAt: number }
interface SessionData {
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionData>();
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days persistent session

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

export function validateSession(token: string | undefined): ServerUserRecord | null {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  const user = db.findById(session.userId);
  if (!user) {
    sessions.delete(token);
    return null;
  }

  return user;
}

export function destroySession(token: string): boolean {
  return sessions.delete(token);
}

export function sanitizeUser(record: ServerUserRecord): UserProfile {
  const school = record.schoolName || record.stats.schoolName || '';
  return {
    id: record.id,
    username: record.username,
    email: record.email,
    avatar: record.avatar,
    schoolName: school,
    shsLevel: record.shsLevel || record.stats.shsLevel || 'SHS 2',
    createdAt: record.createdAt,
    stats: {
      ...record.stats,
      schoolName: school,
      shsLevel: record.shsLevel || record.stats.shsLevel || 'SHS 2',
    },
  };
}
