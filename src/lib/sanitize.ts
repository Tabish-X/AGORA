// Input sanitization and validation
// Prevents XSS, injection attacks, and abusive content

import DOMPurify from 'dompurify';

// Strict limits for all user input
export const LIMITS = {
  POST_TITLE_MIN: 5,
  POST_TITLE_MAX: 200,
  POST_BODY_MIN: 10,
  POST_BODY_MAX: 10000,
  COMMENT_BODY_MIN: 2,
  COMMENT_BODY_MAX: 2000,
  ACCESS_KEY_MAX: 128,
  USERNAME_MAX: 64,
  PASSWORD_MAX: 128,
  MAX_POSTS_TOTAL: 500,
  MAX_COMMENTS_PER_POST: 1000,
  MAX_ACTIVE_SESSIONS: 50,
  MAX_COMMENT_DEPTH: 5,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_POSTS: 3,
  RATE_LIMIT_COMMENTS: 10,
  RATE_LIMIT_VOTES: 30,
  RATE_LIMIT_REQUESTS: 60,
} as const;

export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') return '';
  // Run through DOMPurify to strip any HTML/scripts
  const cleaned = String(DOMPurify.sanitize(String(input), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  }));
  // Additional escaping of dangerous characters
  return cleaned
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove control chars
    .trim();
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validatePostTitle(title: unknown): ValidationResult {
  const cleaned = sanitizeText(title);
  if (cleaned.length < LIMITS.POST_TITLE_MIN) {
    return { valid: false, error: `Title must be at least ${LIMITS.POST_TITLE_MIN} characters.` };
  }
  if (cleaned.length > LIMITS.POST_TITLE_MAX) {
    return { valid: false, error: `Title must not exceed ${LIMITS.POST_TITLE_MAX} characters.` };
  }
  return { valid: true };
}

export function validatePostBody(body: unknown): ValidationResult {
  const cleaned = sanitizeText(body);
  if (cleaned.length < LIMITS.POST_BODY_MIN) {
    return { valid: false, error: `Post body must be at least ${LIMITS.POST_BODY_MIN} characters.` };
  }
  if (cleaned.length > LIMITS.POST_BODY_MAX) {
    return { valid: false, error: `Post body must not exceed ${LIMITS.POST_BODY_MAX.toLocaleString()} characters.` };
  }
  return { valid: true };
}

export function validateCommentBody(body: unknown): ValidationResult {
  const cleaned = sanitizeText(body);
  if (cleaned.length < LIMITS.COMMENT_BODY_MIN) {
    return { valid: false, error: `Comment must be at least ${LIMITS.COMMENT_BODY_MIN} characters.` };
  }
  if (cleaned.length > LIMITS.COMMENT_BODY_MAX) {
    return { valid: false, error: `Comment must not exceed ${LIMITS.COMMENT_BODY_MAX.toLocaleString()} characters.` };
  }
  return { valid: true };
}

export function validateAccessKey(key: unknown): ValidationResult {
  if (typeof key !== 'string' || key.length === 0) {
    return { valid: false, error: 'Access key is required.' };
  }
  if (key.length > LIMITS.ACCESS_KEY_MAX) {
    return { valid: false, error: 'Invalid access key.' };
  }
  // Only allow printable ASCII
  if (!/^[\x20-\x7E]+$/.test(key)) {
    return { valid: false, error: 'Invalid access key format.' };
  }
  return { valid: true };
}

export function validateVoteValue(value: unknown): value is 1 | -1 {
  return value === 1 || value === -1;
}

export function validateTargetType(type: unknown): type is 'post' | 'comment' {
  return type === 'post' || type === 'comment';
}

export function validateId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  // Accept hex IDs of reasonable length (32-36 chars)
  return /^[a-f0-9-]{32,40}$/.test(id);
}

// Rate limiter - checks and updates rate limit records
export interface RateLimitState {
  count: number;
  windowStart: number;
}

export function checkRateLimit(
  current: RateLimitState | undefined,
  limit: number,
  windowMs: number
): { allowed: boolean; updated: RateLimitState } {
  const now = Date.now();

  if (!current || now - current.windowStart > windowMs) {
    // New window
    return {
      allowed: true,
      updated: { count: 1, windowStart: now },
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      updated: current,
    };
  }

  return {
    allowed: true,
    updated: { count: current.count + 1, windowStart: current.windowStart },
  };
}

export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}
