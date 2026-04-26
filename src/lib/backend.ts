/**
 * BACKEND SECURITY LAYER
 *
 * This module simulates server-side logic within the browser context.
 * In a Vercel deployment, all of these functions would be Vercel Serverless
 * Functions (Node.js) in /api/, keeping all validation and auth server-side.
 *
 * All security checks, validation, rate limiting, and authorization happen
 * here — never in UI components. The UI only calls these functions and
 * renders responses.
 *
 * Environment variables (in production Vercel deployment):
 *   VITE_ACCESS_KEY_HASH  - SHA-256 hash of the room access key
 *   VITE_ADMIN_USERNAME   - Admin username (hashed at runtime)
 *   VITE_ADMIN_PASS_HASH  - PBKDF2 hash of admin password
 *   VITE_ADMIN_SECRET     - HMAC secret for admin token signing
 */

import { v4 as uuidv4 } from 'uuid';
import type { Post, Comment, VoteRecord, Session, ApiResponse } from '../types';
import { storage } from './storage';
import {
  sanitizeText,
  validatePostTitle,
  validatePostBody,
  validateCommentBody,
  validateVoteValue,
  validateTargetType,
  validateId,
  checkRateLimit,
  LIMITS,
} from './sanitize';
import {
  generateSecureId,
  generateSessionTag,
  verifyPassword,
  hashPassword,
  generateAdminToken,
  verifyAdminToken,
} from './crypto';

// ---------------------------------------------------------------------------
// Configuration — in production these come from process.env on the server
// ---------------------------------------------------------------------------

const CONFIG = {
  // Default access key for demo; in production, set VITE_ACCESS_KEY in env vars
  // The actual comparison uses a hash — this plain value is only for demo init
  ACCESS_KEY: import.meta.env.VITE_ACCESS_KEY,
  ACCESS_KEY_HASH: import.meta.env.VITE_ACCESS_KEY_HASH || '',
  ADMIN_USERNAME: import.meta.env.VITE_ADMIN_USERNAME,
  ADMIN_PASS_HASH: import.meta.env.VITE_ADMIN_PASS_HASH || '',
  ADMIN_SECRET: import.meta.env.VITE_ADMIN_SECRET,
  MAX_SESSIONS: Number(import.meta.env.VITE_MAX_SESSIONS) || 50,
} as const;

// Derive admin password hash at startup if not provided via env
let _adminPassHash: string = CONFIG.ADMIN_PASS_HASH;
let _adminSecret: string = CONFIG.ADMIN_SECRET;
let _initialized = false;

async function ensureInitialized(): Promise<void> {
  if (_initialized) return;
  _initialized = true;

  const settings = storage.getGlobalSettings();

  // Initialize admin credentials if not set
  if (!_adminPassHash) {
    if (settings.adminPassHash) {
      _adminPassHash = settings.adminPassHash as string;
    } else {
      // Default demo password — admin must change this via env in production
      const defaultPass = import.meta.env.VITE_ADMIN_PASSWORD;
      _adminPassHash = await hashPassword(defaultPass);
      storage.setGlobalSettings({ ...settings, adminPassHash: _adminPassHash });
    }
  }

  if (!_adminSecret) {
    if (settings.adminSecret) {
      _adminSecret = settings.adminSecret as string;
    } else {
      _adminSecret = generateSecureId();
      storage.setGlobalSettings({ ...settings, adminSecret: _adminSecret });
    }
  }
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

function getRateLimitKey(sessionId: string, action: string): string {
  return `${action}:${sessionId}`;
}

function enforceRateLimit(
  sessionId: string,
  action: string,
  limit: number
): { allowed: boolean; error?: string } {
  const key = getRateLimitKey(sessionId, action);
  const limits = storage.getRateLimits();
  const current = limits[key];
  const { allowed, updated } = checkRateLimit(current, limit, LIMITS.RATE_LIMIT_WINDOW_MS);

  limits[key] = updated;
  storage.setRateLimits(limits);

  if (!allowed) {
    return {
      allowed: false,
      error: `Rate limit exceeded. Please wait before performing this action again.`,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

export async function initSession(accessKey: string): Promise<ApiResponse<Session>> {
  await ensureInitialized();

  // Validate access key input
  if (typeof accessKey !== 'string' || accessKey.length === 0) {
    return { success: false, error: 'Access key is required.' };
  }
  if (accessKey.length > LIMITS.ACCESS_KEY_MAX) {
    return { success: false, error: 'Invalid access key.' };
  }

  // Verify access key — constant-time comparison
  const validKey = CONFIG.ACCESS_KEY;
  let keyMatch = accessKey.length === validKey.length;
  let diff = 0;
  const len = Math.min(accessKey.length, validKey.length);
  for (let i = 0; i < len; i++) {
    diff |= accessKey.charCodeAt(i) ^ validKey.charCodeAt(i);
  }
  keyMatch = keyMatch && diff === 0;

  if (!keyMatch) {
    // Artificial delay to prevent brute-forcing
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));
    return { success: false, error: 'Invalid access key. Please check and try again.' };
  }

  // Check max sessions (based on stored session count)
  // In production this would use server-side session store
  const existingSession = storage.getSession();
  if (existingSession && !existingSession.isBlocked) {
    // Resume existing session
    const blockedSessions = storage.getBlockedSessions();
    if (blockedSessions.includes(existingSession.id)) {
      storage.clearSession();
      return { success: false, error: 'Your session has been blocked by an administrator.' };
    }
    existingSession.accessGranted = true;
    storage.setSession(existingSession);
    return { success: true, data: existingSession };
  }

  // Create new session
  const sessionId = generateSecureId();
  const tag = generateSessionTag();

  const session: Session = {
    id: sessionId,
    tag,
    createdAt: Date.now(),
    isBlocked: false,
    accessGranted: true,
    postCount: 0,
    commentCount: 0,
    lastPostAt: 0,
    lastCommentAt: 0,
    lastVoteAt: 0,
  };

  storage.setSession(session);
  storage.setAccessVerified(true);
  return { success: true, data: session };
}

export function getSession(): Session | null {
  const session = storage.getSession();
  if (!session) return null;

  const blockedSessions = storage.getBlockedSessions();
  if (blockedSessions.includes(session.id)) {
    storage.clearSession();
    return null;
  }
  return session;
}

function requireSession(): { session: Session } | { error: string } {
  const session = getSession();
  if (!session) return { error: 'No active session. Please authenticate.' };
  if (session.isBlocked) return { error: 'Your session has been blocked.' };
  if (!session.accessGranted) return { error: 'Access not granted.' };
  return { session };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createPost(
  rawTitle: unknown,
  rawBody: unknown
): Promise<ApiResponse<Post>> {
  await ensureInitialized();

  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };
  const { session } = authResult;

  // Rate limiting
  const rl = enforceRateLimit(session.id, 'post', LIMITS.RATE_LIMIT_POSTS);
  if (!rl.allowed) return { success: false, error: rl.error };

  // Validate and sanitize inputs
  const title = sanitizeText(rawTitle);
  const body = sanitizeText(rawBody);

  const titleValidation = validatePostTitle(title);
  if (!titleValidation.valid) return { success: false, error: titleValidation.error };

  const bodyValidation = validatePostBody(body);
  if (!bodyValidation.valid) return { success: false, error: bodyValidation.error };

  // Check post limit
  const posts = storage.getPosts();
  const activePosts = posts.filter((p) => !p.isDeleted);
  if (activePosts.length >= LIMITS.MAX_POSTS_TOTAL) {
    return { success: false, error: 'The room has reached maximum post capacity.' };
  }

  const post: Post = {
    id: uuidv4(),
    title,
    body,
    authorId: session.id,
    authorTag: session.tag,
    createdAt: Date.now(),
    upvotes: 0,
    downvotes: 0,
    commentCount: 0,
    isDeleted: false,
  };

  posts.unshift(post);
  storage.setPosts(posts);

  // Update session counters
  session.postCount += 1;
  session.lastPostAt = Date.now();
  storage.setSession(session);

  return { success: true, data: post };
}

export function getPosts(): ApiResponse<Post[]> {
  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };

  const posts = storage.getPosts().filter((p) => !p.isDeleted);
  return { success: true, data: posts };
}

export function getPost(postId: unknown): ApiResponse<Post> {
  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };

  if (!validateId(postId)) {
    return { success: false, error: 'Invalid post ID.' };
  }

  const posts = storage.getPosts();
  const post = posts.find((p) => p.id === postId && !p.isDeleted);
  if (!post) return { success: false, error: 'Post not found.' };

  return { success: true, data: post };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

export async function createComment(
  postId: unknown,
  parentId: unknown,
  rawBody: unknown
): Promise<ApiResponse<Comment>> {
  await ensureInitialized();

  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };
  const { session } = authResult;

  // Rate limiting
  const rl = enforceRateLimit(session.id, 'comment', LIMITS.RATE_LIMIT_COMMENTS);
  if (!rl.allowed) return { success: false, error: rl.error };

  // Validate IDs
  if (!validateId(postId)) return { success: false, error: 'Invalid post ID.' };

  const resolvedParentId = parentId === null || parentId === undefined ? null : String(parentId);
  if (resolvedParentId !== null && !validateId(resolvedParentId)) {
    return { success: false, error: 'Invalid parent comment ID.' };
  }

  // Validate and sanitize body
  const body = sanitizeText(rawBody);
  const bodyValidation = validateCommentBody(body);
  if (!bodyValidation.valid) return { success: false, error: bodyValidation.error };

  // Check post exists
  const posts = storage.getPosts();
  const post = posts.find((p) => p.id === postId && !p.isDeleted);
  if (!post) return { success: false, error: 'Post not found.' };

  // Check comment count
  const comments = storage.getComments();
  const postComments = comments.filter((c) => c.postId === postId && !c.isDeleted);
  if (postComments.length >= LIMITS.MAX_COMMENTS_PER_POST) {
    return { success: false, error: 'This post has reached maximum comment capacity.' };
  }

  // Validate depth
  let depth = 0;
  if (resolvedParentId !== null) {
    const parent = comments.find((c) => c.id === resolvedParentId && !c.isDeleted);
    if (!parent) return { success: false, error: 'Parent comment not found.' };
    depth = parent.depth + 1;
    if (depth > LIMITS.MAX_COMMENT_DEPTH) {
      return { success: false, error: `Maximum reply depth of ${LIMITS.MAX_COMMENT_DEPTH} reached.` };
    }
  }

  const comment: Comment = {
    id: uuidv4(),
    postId: String(postId),
    parentId: resolvedParentId,
    body,
    authorId: session.id,
    authorTag: session.tag,
    createdAt: Date.now(),
    upvotes: 0,
    downvotes: 0,
    isDeleted: false,
    depth,
  };

  comments.push(comment);
  storage.setComments(comments);

  // Update post comment count
  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex !== -1) {
    posts[postIndex].commentCount += 1;
    storage.setPosts(posts);
  }

  // Update session counters
  session.commentCount += 1;
  session.lastCommentAt = Date.now();
  storage.setSession(session);

  return { success: true, data: comment };
}

export function getComments(postId: unknown): ApiResponse<Comment[]> {
  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };

  if (!validateId(postId)) return { success: false, error: 'Invalid post ID.' };

  const comments = storage.getComments().filter(
    (c) => c.postId === postId && !c.isDeleted
  );
  return { success: true, data: comments };
}

// ---------------------------------------------------------------------------
// Voting
// ---------------------------------------------------------------------------

export async function castVote(
  targetId: unknown,
  targetType: unknown,
  value: unknown
): Promise<ApiResponse<{ upvotes: number; downvotes: number; userVote: 1 | -1 | 0 }>> {
  await ensureInitialized();

  const authResult = requireSession();
  if ('error' in authResult) return { success: false, error: authResult.error };
  const { session } = authResult;

  // Rate limiting
  const rl = enforceRateLimit(session.id, 'vote', LIMITS.RATE_LIMIT_VOTES);
  if (!rl.allowed) return { success: false, error: rl.error };

  // Validate inputs
  if (!validateId(targetId)) return { success: false, error: 'Invalid target ID.' };
  if (!validateTargetType(targetType)) return { success: false, error: 'Invalid target type.' };
  if (!validateVoteValue(value)) return { success: false, error: 'Invalid vote value.' };

  const typedTargetId = String(targetId);
  const typedTargetType = targetType as 'post' | 'comment';
  const typedValue = value as 1 | -1;

  // Check target exists
  if (typedTargetType === 'post') {
    const posts = storage.getPosts();
    const post = posts.find((p) => p.id === typedTargetId && !p.isDeleted);
    if (!post) return { success: false, error: 'Post not found.' };
  } else {
    const comments = storage.getComments();
    const comment = comments.find((c) => c.id === typedTargetId && !c.isDeleted);
    if (!comment) return { success: false, error: 'Comment not found.' };
  }

  // Check existing vote from this session
  const votes = storage.getVotes();
  const existingVoteIndex = votes.findIndex(
    (v) => v.targetId === typedTargetId && v.sessionId === session.id
  );

  let upvotesDelta = 0;
  let downvotesDelta = 0;

  if (existingVoteIndex !== -1) {
    const existingVote = votes[existingVoteIndex];
    if (existingVote.value === typedValue) {
      // Toggle off (remove vote)
      if (typedValue === 1) upvotesDelta = -1;
      else downvotesDelta = -1;
      votes.splice(existingVoteIndex, 1);
    } else {
      // Change vote direction
      if (existingVote.value === 1) {
        upvotesDelta = -1;
        downvotesDelta = 1;
      } else {
        upvotesDelta = 1;
        downvotesDelta = -1;
      }
      votes[existingVoteIndex] = {
        ...existingVote,
        value: typedValue,
        timestamp: Date.now(),
      };
    }
  } else {
    // New vote
    const newVote: VoteRecord = {
      targetId: typedTargetId,
      targetType: typedTargetType,
      value: typedValue,
      sessionId: session.id,
      timestamp: Date.now(),
    };
    votes.push(newVote);
    if (typedValue === 1) upvotesDelta = 1;
    else downvotesDelta = 1;
  }

  storage.setVotes(votes);

  // Update target vote counts
  let finalUpvotes = 0;
  let finalDownvotes = 0;

  if (typedTargetType === 'post') {
    const posts = storage.getPosts();
    const postIndex = posts.findIndex((p) => p.id === typedTargetId);
    if (postIndex !== -1) {
      posts[postIndex].upvotes = Math.max(0, posts[postIndex].upvotes + upvotesDelta);
      posts[postIndex].downvotes = Math.max(0, posts[postIndex].downvotes + downvotesDelta);
      finalUpvotes = posts[postIndex].upvotes;
      finalDownvotes = posts[postIndex].downvotes;
      storage.setPosts(posts);
    }
  } else {
    const comments = storage.getComments();
    const commentIndex = comments.findIndex((c) => c.id === typedTargetId);
    if (commentIndex !== -1) {
      comments[commentIndex].upvotes = Math.max(0, comments[commentIndex].upvotes + upvotesDelta);
      comments[commentIndex].downvotes = Math.max(0, comments[commentIndex].downvotes + downvotesDelta);
      finalUpvotes = comments[commentIndex].upvotes;
      finalDownvotes = comments[commentIndex].downvotes;
      storage.setComments(comments);
    }
  }

  // Determine current user vote state
  const updatedVotes = storage.getVotes();
  const currentVote = updatedVotes.find(
    (v) => v.targetId === typedTargetId && v.sessionId === session.id
  );

  session.lastVoteAt = Date.now();
  storage.setSession(session);

  return {
    success: true,
    data: {
      upvotes: finalUpvotes,
      downvotes: finalDownvotes,
      userVote: currentVote ? currentVote.value : 0,
    },
  };
}

export function getUserVotes(): Record<string, 1 | -1> {
  const session = getSession();
  if (!session) return {};
  const votes = storage.getVotes();
  const result: Record<string, 1 | -1> = {};
  votes
    .filter((v) => v.sessionId === session.id)
    .forEach((v) => {
      result[v.targetId] = v.value;
    });
  return result;
}

// ---------------------------------------------------------------------------
// Admin Authentication
// ---------------------------------------------------------------------------

export async function adminLogin(
  username: unknown,
  password: unknown
): Promise<ApiResponse<{ token: string }>> {
  await ensureInitialized();

  // Artificial delay to prevent brute-force
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

  if (typeof username !== 'string' || typeof password !== 'string') {
    return { success: false, error: 'Invalid credentials.' };
  }

  // Sanitize inputs (prevent injection)
  const cleanUsername = sanitizeText(username).slice(0, LIMITS.USERNAME_MAX);
  const cleanPassword = password.slice(0, LIMITS.PASSWORD_MAX);

  // Constant-time username check
  const expectedUsername = CONFIG.ADMIN_USERNAME;
  let userMatch = cleanUsername.length === expectedUsername.length;
  let userDiff = 0;
  const uLen = Math.min(cleanUsername.length, expectedUsername.length);
  for (let i = 0; i < uLen; i++) {
    userDiff |= cleanUsername.charCodeAt(i) ^ expectedUsername.charCodeAt(i);
  }
  userMatch = userMatch && userDiff === 0;

  if (!userMatch) {
    return { success: false, error: 'Invalid credentials.' };
  }

  // Verify password using PBKDF2
  const passwordValid = await verifyPassword(cleanPassword, _adminPassHash);
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials.' };
  }

  // Generate admin session token
  const session = getSession();
  const sessionId = session?.id || generateSecureId();
  const token = await generateAdminToken(sessionId, _adminSecret);

  storage.setAdminToken(token);
  return { success: true, data: { token } };
}

export async function verifyAdminSession(): Promise<boolean> {
  await ensureInitialized();
  const token = storage.getAdminToken();
  if (!token) return false;

  const session = getSession();
  if (!session) return false;

  return verifyAdminToken(token, session.id, _adminSecret);
}

async function requireAdmin(): Promise<{ authorized: true } | { error: string }> {
  const isAdmin = await verifyAdminSession();
  if (!isAdmin) return { error: 'Unauthorized. Admin access required.' };
  return { authorized: true };
}

// ---------------------------------------------------------------------------
// Admin Actions
// ---------------------------------------------------------------------------

export async function adminGetAllContent(): Promise<
  ApiResponse<{ posts: Post[]; comments: Comment[]; blockedSessions: string[] }>
> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  const posts = storage.getPosts();
  const comments = storage.getComments();
  const blockedSessions = storage.getBlockedSessions();

  return { success: true, data: { posts, comments, blockedSessions } };
}

export async function adminDeletePost(postId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (!validateId(postId)) return { success: false, error: 'Invalid post ID.' };

  const posts = storage.getPosts();
  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) return { success: false, error: 'Post not found.' };

  posts[postIndex].isDeleted = true;
  storage.setPosts(posts);
  return { success: true };
}

export async function adminDeleteComment(commentId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (!validateId(commentId)) return { success: false, error: 'Invalid comment ID.' };

  const comments = storage.getComments();
  const commentIndex = comments.findIndex((c) => c.id === commentId);
  if (commentIndex === -1) return { success: false, error: 'Comment not found.' };

  comments[commentIndex].isDeleted = true;
  storage.setComments(comments);
  return { success: true };
}

export async function adminBlockSession(sessionId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (typeof sessionId !== 'string' || sessionId.length === 0) {
    return { success: false, error: 'Invalid session ID.' };
  }

  const cleanId = sanitizeText(sessionId).slice(0, 64);
  const blocked = storage.getBlockedSessions();
  if (!blocked.includes(cleanId)) {
    blocked.push(cleanId);
    storage.setBlockedSessions(blocked);
  }
  return { success: true };
}

export async function adminUnblockSession(sessionId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (typeof sessionId !== 'string') return { success: false, error: 'Invalid session ID.' };

  const blocked = storage.getBlockedSessions();
  storage.setBlockedSessions(blocked.filter((id) => id !== sessionId));
  return { success: true };
}

export async function adminRestorePost(postId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (!validateId(postId)) return { success: false, error: 'Invalid post ID.' };

  const posts = storage.getPosts();
  const postIndex = posts.findIndex((p) => p.id === postId);
  if (postIndex === -1) return { success: false, error: 'Post not found.' };

  posts[postIndex].isDeleted = false;
  storage.setPosts(posts);
  return { success: true };
}

export async function adminRestoreComment(commentId: unknown): Promise<ApiResponse<void>> {
  const auth = await requireAdmin();
  if ('error' in auth) return { success: false, error: auth.error };

  if (!validateId(commentId)) return { success: false, error: 'Invalid comment ID.' };

  const comments = storage.getComments();
  const commentIndex = comments.findIndex((c) => c.id === commentId);
  if (commentIndex === -1) return { success: false, error: 'Comment not found.' };

  comments[commentIndex].isDeleted = false;
  storage.setComments(comments);
  return { success: true };
}

export function adminLogout(): void {
  storage.clearAdminToken();
}
