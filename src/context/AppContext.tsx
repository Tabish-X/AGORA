import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { AppState, Post, Comment, Session } from '../types';
import type { SortMode } from '../types';
import * as backend from '../lib/backend';
import { storage } from '../lib/storage';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface FullState extends AppState {
  userVotes: Record<string, 1 | -1>;
  sortMode: SortMode;
  commentInput: Record<string, string>; // postId or commentId -> draft text
  replyingTo: string | null; // commentId being replied to
  expandedComments: Set<string>;
  adminContent: {
    posts: Post[];
    comments: Comment[];
    blockedSessions: string[];
  } | null;
  notification: { message: string; type: 'success' | 'error' | 'info' } | null;
}

const initialState: FullState = {
  session: null,
  posts: [],
  comments: [],
  votes: [],
  blockedSessions: [],
  view: 'auth',
  activePostId: null,
  adminAuthenticated: false,
  error: null,
  loading: false,
  userVotes: {},
  sortMode: 'hot',
  commentInput: {},
  replyingTo: null,
  expandedComments: new Set(),
  adminContent: null,
  notification: null,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SESSION'; payload: Session | null }
  | { type: 'SET_VIEW'; payload: AppState['view'] }
  | { type: 'SET_ACTIVE_POST'; payload: string | null }
  | { type: 'SET_POSTS'; payload: Post[] }
  | { type: 'SET_COMMENTS'; payload: Comment[] }
  | { type: 'SET_USER_VOTES'; payload: Record<string, 1 | -1> }
  | { type: 'UPDATE_POST_VOTES'; payload: { postId: string; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 } }
  | { type: 'UPDATE_COMMENT_VOTES'; payload: { commentId: string; upvotes: number; downvotes: number; userVote: 1 | -1 | 0 } }
  | { type: 'ADD_POST'; payload: Post }
  | { type: 'ADD_COMMENT'; payload: Comment }
  | { type: 'SET_SORT_MODE'; payload: SortMode }
  | { type: 'SET_COMMENT_INPUT'; payload: { key: string; value: string } }
  | { type: 'SET_REPLYING_TO'; payload: string | null }
  | { type: 'TOGGLE_COMMENT_EXPANDED'; payload: string }
  | { type: 'SET_ADMIN_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_ADMIN_CONTENT'; payload: FullState['adminContent'] }
  | { type: 'SET_NOTIFICATION'; payload: FullState['notification'] };

function reducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SESSION':
      return { ...state, session: action.payload };
    case 'SET_VIEW':
      return { ...state, view: action.payload, error: null };
    case 'SET_ACTIVE_POST':
      return { ...state, activePostId: action.payload };
    case 'SET_POSTS':
      return { ...state, posts: action.payload };
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload };
    case 'SET_USER_VOTES':
      return { ...state, userVotes: action.payload };
    case 'UPDATE_POST_VOTES': {
      const { postId, upvotes, downvotes, userVote } = action.payload;
      const newVotes = { ...state.userVotes };
      if (userVote === 0) {
        delete newVotes[postId];
      } else {
        newVotes[postId] = userVote;
      }
      return {
        ...state,
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, upvotes, downvotes } : p
        ),
        userVotes: newVotes,
      };
    }
    case 'UPDATE_COMMENT_VOTES': {
      const { commentId, upvotes, downvotes, userVote } = action.payload;
      const newVotes = { ...state.userVotes };
      if (userVote === 0) {
        delete newVotes[commentId];
      } else {
        newVotes[commentId] = userVote;
      }
      return {
        ...state,
        comments: state.comments.map((c) =>
          c.id === commentId ? { ...c, upvotes, downvotes } : c
        ),
        userVotes: newVotes,
      };
    }
    case 'ADD_POST':
      return { ...state, posts: [action.payload, ...state.posts] };
    case 'ADD_COMMENT':
      return { ...state, comments: [...state.comments, action.payload] };
    case 'SET_SORT_MODE':
      return { ...state, sortMode: action.payload };
    case 'SET_COMMENT_INPUT':
      return {
        ...state,
        commentInput: { ...state.commentInput, [action.payload.key]: action.payload.value },
      };
    case 'SET_REPLYING_TO':
      return { ...state, replyingTo: action.payload };
    case 'TOGGLE_COMMENT_EXPANDED': {
      const next = new Set(state.expandedComments);
      if (next.has(action.payload)) {
        next.delete(action.payload);
      } else {
        next.add(action.payload);
      }
      return { ...state, expandedComments: next };
    }
    case 'SET_ADMIN_AUTHENTICATED':
      return { ...state, adminAuthenticated: action.payload };
    case 'SET_ADMIN_CONTENT':
      return { ...state, adminContent: action.payload };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.payload };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface AppContextValue {
  state: FullState;
  dispatch: React.Dispatch<Action>;
  actions: {
    authenticate: (key: string) => Promise<void>;
    loadPosts: () => void;
    loadComments: (postId: string) => void;
    openPost: (postId: string) => void;
    goToFeed: () => void;
    goToCreate: () => void;
    goToAdminLogin: () => void;
    createPost: (title: string, body: string) => Promise<boolean>;
    createComment: (postId: string, parentId: string | null, body: string) => Promise<boolean>;
    votePost: (postId: string, value: 1 | -1) => Promise<void>;
    voteComment: (commentId: string, value: 1 | -1) => Promise<void>;
    setSortMode: (mode: SortMode) => void;
    adminLogin: (username: string, password: string) => Promise<boolean>;
    adminLogout: () => void;
    adminLoadContent: () => Promise<void>;
    adminDeletePost: (postId: string) => Promise<void>;
    adminDeleteComment: (commentId: string) => Promise<void>;
    adminBlockSession: (sessionId: string) => Promise<void>;
    adminUnblockSession: (sessionId: string) => Promise<void>;
    adminRestorePost: (postId: string) => Promise<void>;
    adminRestoreComment: (commentId: string) => Promise<void>;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const showNotification = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });
      setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', payload: null }), 4000);
    },
    []
  );

  // On mount: check for existing session
  useEffect(() => {
    const session = backend.getSession();
    if (session) {
      dispatch({ type: 'SET_SESSION', payload: session });
      dispatch({ type: 'SET_VIEW', payload: 'feed' });
      dispatch({ type: 'SET_USER_VOTES', payload: backend.getUserVotes() });
    } else {
      dispatch({ type: 'SET_VIEW', payload: 'auth' });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const authenticate = useCallback(async (key: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    const result = await backend.initSession(key);
    dispatch({ type: 'SET_LOADING', payload: false });
    if (result.success && result.data) {
      dispatch({ type: 'SET_SESSION', payload: result.data });
      dispatch({ type: 'SET_USER_VOTES', payload: backend.getUserVotes() });
      dispatch({ type: 'SET_VIEW', payload: 'feed' });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error || 'Authentication failed.' });
    }
  }, []);

  const loadPosts = useCallback(() => {
    const result = backend.getPosts();
    if (result.success && result.data) {
      dispatch({ type: 'SET_POSTS', payload: result.data });
    }
  }, []);

  const loadComments = useCallback((postId: string) => {
    const result = backend.getComments(postId);
    if (result.success && result.data) {
      dispatch({ type: 'SET_COMMENTS', payload: result.data });
    }
  }, []);

  const openPost = useCallback(
    (postId: string) => {
      dispatch({ type: 'SET_ACTIVE_POST', payload: postId });
      dispatch({ type: 'SET_VIEW', payload: 'post' });
      dispatch({ type: 'SET_REPLYING_TO', payload: null });
      loadComments(postId);
    },
    [loadComments]
  );

  const goToFeed = useCallback(() => {
    dispatch({ type: 'SET_VIEW', payload: 'feed' });
    dispatch({ type: 'SET_ACTIVE_POST', payload: null });
    dispatch({ type: 'SET_REPLYING_TO', payload: null });
    loadPosts();
  }, [loadPosts]);

  const goToCreate = useCallback(() => {
    dispatch({ type: 'SET_VIEW', payload: 'create' });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const goToAdminLogin = useCallback(() => {
    dispatch({ type: 'SET_VIEW', payload: 'admin-login' });
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const createPost = useCallback(
    async (title: string, body: string): Promise<boolean> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      const result = await backend.createPost(title, body);
      dispatch({ type: 'SET_LOADING', payload: false });
      if (result.success && result.data) {
        dispatch({ type: 'ADD_POST', payload: result.data });
        showNotification('Post created successfully.', 'success');
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to create post.' });
        return false;
      }
    },
    [showNotification]
  );

  const createComment = useCallback(
    async (postId: string, parentId: string | null, body: string): Promise<boolean> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await backend.createComment(postId, parentId, body);
      dispatch({ type: 'SET_LOADING', payload: false });
      if (result.success && result.data) {
        dispatch({ type: 'ADD_COMMENT', payload: result.data });
        // Update post comment count
        dispatch({
          type: 'SET_POSTS',
          payload: storage.getPosts().filter((p) => !p.isDeleted),
        });
        showNotification('Comment posted.', 'success');
        return true;
      } else {
        showNotification(result.error || 'Failed to post comment.', 'error');
        return false;
      }
    },
    [showNotification]
  );

  const votePost = useCallback(async (postId: string, value: 1 | -1) => {
    const result = await backend.castVote(postId, 'post', value);
    if (result.success && result.data) {
      dispatch({
        type: 'UPDATE_POST_VOTES',
        payload: { postId, ...result.data },
      });
    } else if (result.error) {
      showNotification(result.error, 'error');
    }
  }, [showNotification]);

  const voteComment = useCallback(async (commentId: string, value: 1 | -1) => {
    const result = await backend.castVote(commentId, 'comment', value);
    if (result.success && result.data) {
      dispatch({
        type: 'UPDATE_COMMENT_VOTES',
        payload: { commentId, ...result.data },
      });
    } else if (result.error) {
      showNotification(result.error, 'error');
    }
  }, [showNotification]);

  const setSortMode = useCallback((mode: SortMode) => {
    dispatch({ type: 'SET_SORT_MODE', payload: mode });
  }, []);

  const adminLogin = useCallback(
    async (username: string, password: string): Promise<boolean> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      const result = await backend.adminLogin(username, password);
      dispatch({ type: 'SET_LOADING', payload: false });
      if (result.success) {
        dispatch({ type: 'SET_ADMIN_AUTHENTICATED', payload: true });
        dispatch({ type: 'SET_VIEW', payload: 'admin' });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Authentication failed.' });
        return false;
      }
    },
    []
  );

  const adminLogoutAction = useCallback(() => {
    backend.adminLogout();
    dispatch({ type: 'SET_ADMIN_AUTHENTICATED', payload: false });
    dispatch({ type: 'SET_ADMIN_CONTENT', payload: null });
    dispatch({ type: 'SET_VIEW', payload: 'feed' });
  }, []);

  const adminLoadContent = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const result = await backend.adminGetAllContent();
    dispatch({ type: 'SET_LOADING', payload: false });
    if (result.success && result.data) {
      dispatch({ type: 'SET_ADMIN_CONTENT', payload: result.data });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to load admin content.' });
      if (result.error?.includes('Unauthorized')) {
        dispatch({ type: 'SET_ADMIN_AUTHENTICATED', payload: false });
        dispatch({ type: 'SET_VIEW', payload: 'admin-login' });
      }
    }
  }, []);

  const adminDeletePost = useCallback(
    async (postId: string) => {
      const result = await backend.adminDeletePost(postId);
      if (result.success) {
        showNotification('Post deleted.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to delete post.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const adminDeleteComment = useCallback(
    async (commentId: string) => {
      const result = await backend.adminDeleteComment(commentId);
      if (result.success) {
        showNotification('Comment deleted.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to delete comment.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const adminBlockSession = useCallback(
    async (sessionId: string) => {
      const result = await backend.adminBlockSession(sessionId);
      if (result.success) {
        showNotification('Session blocked.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to block session.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const adminUnblockSession = useCallback(
    async (sessionId: string) => {
      const result = await backend.adminUnblockSession(sessionId);
      if (result.success) {
        showNotification('Session unblocked.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to unblock session.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const adminRestorePost = useCallback(
    async (postId: string) => {
      const result = await backend.adminRestorePost(postId);
      if (result.success) {
        showNotification('Post restored.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to restore post.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const adminRestoreComment = useCallback(
    async (commentId: string) => {
      const result = await backend.adminRestoreComment(commentId);
      if (result.success) {
        showNotification('Comment restored.', 'success');
        await adminLoadContent();
      } else {
        showNotification(result.error || 'Failed to restore comment.', 'error');
      }
    },
    [adminLoadContent, showNotification]
  );

  const value: AppContextValue = {
    state,
    dispatch,
    actions: {
      authenticate,
      loadPosts,
      loadComments,
      openPost,
      goToFeed,
      goToCreate,
      goToAdminLogin,
      createPost,
      createComment,
      votePost,
      voteComment,
      setSortMode,
      adminLogin,
      adminLogout: adminLogoutAction,
      adminLoadContent,
      adminDeletePost,
      adminDeleteComment,
      adminBlockSession,
      adminUnblockSession,
      adminRestorePost,
      adminRestoreComment,
      showNotification,
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
