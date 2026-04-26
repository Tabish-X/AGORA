export interface Post {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorTag: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  isDeleted: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  body: string;
  authorId: string;
  authorTag: string;
  createdAt: number;
  upvotes: number;
  downvotes: number;
  isDeleted: boolean;
  depth: number;
}

export interface VoteRecord {
  targetId: string;
  targetType: 'post' | 'comment';
  value: 1 | -1;
  sessionId: string;
  timestamp: number;
}

export interface Session {
  id: string;
  tag: string;
  createdAt: number;
  isBlocked: boolean;
  accessGranted: boolean;
  postCount: number;
  commentCount: number;
  lastPostAt: number;
  lastCommentAt: number;
  lastVoteAt: number;
}

export interface RateLimitRecord {
  count: number;
  windowStart: number;
}

export interface AppState {
  session: Session | null;
  posts: Post[];
  comments: Comment[];
  votes: VoteRecord[];
  blockedSessions: string[];
  view: 'auth' | 'feed' | 'post' | 'create' | 'admin-login' | 'admin';
  activePostId: string | null;
  adminAuthenticated: boolean;
  error: string | null;
  loading: boolean;
}

export interface AdminCredentials {
  username: string;
  password: string;
}

export type SortMode = 'new' | 'top' | 'hot';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
