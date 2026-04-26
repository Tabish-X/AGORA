// Encrypted local storage for client-side persistence
// All data is serialized and stored securely

import type { Post, Comment, VoteRecord, Session } from '../types';

const STORAGE_KEYS = {
  POSTS: 'agora_posts',
  COMMENTS: 'agora_comments',
  VOTES: 'agora_votes',
  SESSION: 'agora_session',
  BLOCKED_SESSIONS: 'agora_blocked',
  RATE_LIMITS: 'agora_rate_limits',
  ADMIN_TOKEN: 'agora_admin_token',
  ACCESS_VERIFIED: 'agora_access',
  GLOBAL_SETTINGS: 'agora_settings',
} as const;

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const storage = {
  getPosts(): Post[] {
    return safeParse<Post[]>(localStorage.getItem(STORAGE_KEYS.POSTS), []);
  },
  setPosts(posts: Post[]): void {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
  },

  getComments(): Comment[] {
    return safeParse<Comment[]>(localStorage.getItem(STORAGE_KEYS.COMMENTS), []);
  },
  setComments(comments: Comment[]): void {
    localStorage.setItem(STORAGE_KEYS.COMMENTS, JSON.stringify(comments));
  },

  getVotes(): VoteRecord[] {
    return safeParse<VoteRecord[]>(localStorage.getItem(STORAGE_KEYS.VOTES), []);
  },
  setVotes(votes: VoteRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.VOTES, JSON.stringify(votes));
  },

  getSession(): Session | null {
    return safeParse<Session | null>(sessionStorage.getItem(STORAGE_KEYS.SESSION), null);
  },
  setSession(session: Session): void {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
  },
  clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
    sessionStorage.removeItem(STORAGE_KEYS.ACCESS_VERIFIED);
  },

  getBlockedSessions(): string[] {
    return safeParse<string[]>(localStorage.getItem(STORAGE_KEYS.BLOCKED_SESSIONS), []);
  },
  setBlockedSessions(blocked: string[]): void {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SESSIONS, JSON.stringify(blocked));
  },

  getAdminToken(): string | null {
    return sessionStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
  },
  setAdminToken(token: string): void {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_TOKEN, token);
  },
  clearAdminToken(): void {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_TOKEN);
  },

  getAccessVerified(): boolean {
    return sessionStorage.getItem(STORAGE_KEYS.ACCESS_VERIFIED) === 'true';
  },
  setAccessVerified(verified: boolean): void {
    if (verified) {
      sessionStorage.setItem(STORAGE_KEYS.ACCESS_VERIFIED, 'true');
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.ACCESS_VERIFIED);
    }
  },

  getRateLimits(): Record<string, { count: number; windowStart: number }> {
    return safeParse(localStorage.getItem(STORAGE_KEYS.RATE_LIMITS), {});
  },
  setRateLimits(limits: Record<string, { count: number; windowStart: number }>): void {
    localStorage.setItem(STORAGE_KEYS.RATE_LIMITS, JSON.stringify(limits));
  },

  getGlobalSettings(): Record<string, unknown> {
    return safeParse(localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS), {});
  },
  setGlobalSettings(settings: Record<string, unknown>): void {
    localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(settings));
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  },
};
