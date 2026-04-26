import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatTimeAgo, truncate } from '../lib/sanitize';
import type { Post, Comment } from '../types';

type AdminTab = 'posts' | 'comments' | 'sessions';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-sm p-6 max-w-sm w-full">
        <p className="text-sm text-neutral-200 mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="text-xs bg-red-900 hover:bg-red-800 border border-red-700 text-red-200 px-4 py-2 rounded-sm transition-colors font-medium"
          >
            Confirm
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-neutral-400 hover:text-neutral-200 border border-neutral-700 px-4 py-2 rounded-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function PostRow({ post, onDelete, onRestore }: { post: Post; onDelete: () => void; onRestore: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const score = post.upvotes - post.downvotes;

  return (
    <>
      <tr className={`border-b border-neutral-800 ${post.isDeleted ? 'opacity-40' : ''}`}>
        <td className="py-3 pr-4">
          <div className="text-xs font-medium text-neutral-200 mb-0.5">
            {truncate(post.title, 80)}
          </div>
          <div className="text-xs text-neutral-600 font-mono">{post.authorTag}</div>
        </td>
        <td className="py-3 pr-4 text-xs text-neutral-500 whitespace-nowrap">
          {formatTimeAgo(post.createdAt)}
        </td>
        <td className="py-3 pr-4 text-xs text-neutral-500 whitespace-nowrap">
          <span className={score >= 0 ? 'text-orange-400' : 'text-blue-400'}>
            {score > 0 ? '+' : ''}{score}
          </span>
          {' / '}{post.commentCount} cmt
        </td>
        <td className="py-3 pr-4 text-xs whitespace-nowrap">
          {post.isDeleted ? (
            <span className="text-red-500">Deleted</span>
          ) : (
            <span className="text-green-600">Active</span>
          )}
        </td>
        <td className="py-3 text-xs whitespace-nowrap">
          {post.isDeleted ? (
            <button
              onClick={onRestore}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Restore
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </td>
      </tr>
      {showConfirm && (
        <ConfirmDialog
          message={`Delete post "${truncate(post.title, 60)}"? This will hide it from all users.`}
          onConfirm={() => { setShowConfirm(false); onDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

function CommentRow({ comment, onDelete, onRestore }: { comment: Comment; onDelete: () => void; onRestore: () => void }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <tr className={`border-b border-neutral-800 ${comment.isDeleted ? 'opacity-40' : ''}`}>
        <td className="py-3 pr-4">
          <div className="text-xs text-neutral-300 mb-0.5">
            {truncate(comment.body, 100)}
          </div>
          <div className="text-xs text-neutral-600 font-mono">{comment.authorTag}</div>
        </td>
        <td className="py-3 pr-4 text-xs text-neutral-500 font-mono whitespace-nowrap">
          {comment.postId.slice(0, 8)}...
        </td>
        <td className="py-3 pr-4 text-xs text-neutral-500 whitespace-nowrap">
          {formatTimeAgo(comment.createdAt)}
        </td>
        <td className="py-3 pr-4 text-xs whitespace-nowrap">
          {comment.isDeleted ? (
            <span className="text-red-500">Deleted</span>
          ) : (
            <span className="text-green-600">Active</span>
          )}
        </td>
        <td className="py-3 text-xs whitespace-nowrap">
          {comment.isDeleted ? (
            <button
              onClick={onRestore}
              className="text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              Restore
            </button>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-red-500 hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          )}
        </td>
      </tr>
      {showConfirm && (
        <ConfirmDialog
          message="Delete this comment? It will be hidden from all users."
          onConfirm={() => { setShowConfirm(false); onDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

export function AdminPanel() {
  const { state, actions } = useApp();
  const { adminContent, loading } = state;
  const [activeTab, setActiveTab] = useState<AdminTab>('posts');
  const [filterDeleted, setFilterDeleted] = useState(true);
  const [sessionInput, setSessionInput] = useState('');
  const [blockConfirm, setBlockConfirm] = useState<string | null>(null);

  useEffect(() => {
    actions.adminLoadContent();
  }, [actions]);

  const allPosts = adminContent?.posts || [];
  const allComments = adminContent?.comments || [];
  const blockedSessions = adminContent?.blockedSessions || [];

  const displayedPosts = filterDeleted ? allPosts.filter((p) => !p.isDeleted) : allPosts;
  const displayedComments = filterDeleted ? allComments.filter((c) => !c.isDeleted) : allComments;

  // Collect unique session IDs from posts and comments
  const sessionIds = Array.from(
    new Set([
      ...allPosts.map((p) => p.authorId),
      ...allComments.map((c) => c.authorId),
    ])
  );

  const TABS: { value: AdminTab; label: string }[] = [
    { value: 'posts', label: `Posts (${allPosts.length})` },
    { value: 'comments', label: `Comments (${allComments.length})` },
    { value: 'sessions', label: `Sessions (${sessionIds.length})` },
  ];

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Admin Header */}
      <div className="border-b border-neutral-800 bg-neutral-900 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-neutral-400 bg-red-950/30 border border-red-900/50 px-2 py-0.5 rounded-sm">
              ADMIN
            </span>
            <span className="text-sm font-semibold text-neutral-200">Agora Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={actions.adminLoadContent}
              disabled={loading}
              className="text-xs text-neutral-500 hover:text-neutral-300 border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={actions.adminLogout}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Posts', value: allPosts.length },
            { label: 'Active Posts', value: allPosts.filter((p) => !p.isDeleted).length },
            { label: 'Total Comments', value: allComments.length },
            { label: 'Blocked Sessions', value: blockedSessions.length },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-neutral-900 border border-neutral-800 rounded-sm p-4"
            >
              <div className="text-xl font-semibold text-neutral-100">{stat.value}</div>
              <div className="text-xs text-neutral-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-neutral-800 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`text-xs px-4 py-2 border-b-2 transition-colors -mb-px ${
                activeTab === tab.value
                  ? 'border-neutral-400 text-neutral-200'
                  : 'border-transparent text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filterDeleted}
                onChange={(e) => setFilterDeleted(e.target.checked)}
                className="accent-neutral-400"
              />
              Hide deleted
            </label>
          </div>
        </div>

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="overflow-x-auto">
            {displayedPosts.length === 0 ? (
              <p className="text-sm text-neutral-600 py-8 text-center">No posts to display.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Post</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Created</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Score</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                    <th className="py-2 text-xs font-medium text-neutral-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPosts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      onDelete={() => actions.adminDeletePost(post.id)}
                      onRestore={() => actions.adminRestorePost(post.id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="overflow-x-auto">
            {displayedComments.length === 0 ? (
              <p className="text-sm text-neutral-600 py-8 text-center">No comments to display.</p>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Comment</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Post ID</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Created</th>
                    <th className="py-2 pr-4 text-xs font-medium text-neutral-600 uppercase tracking-wider">Status</th>
                    <th className="py-2 text-xs font-medium text-neutral-600 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedComments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      onDelete={() => actions.adminDeleteComment(comment.id)}
                      onRestore={() => actions.adminRestoreComment(comment.id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            {/* Block by ID input */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-sm p-4">
              <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-3">
                Block Session by ID
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sessionInput}
                  onChange={(e) => setSessionInput(e.target.value)}
                  placeholder="Session ID (hex)"
                  className="flex-1 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-600 font-mono placeholder-neutral-700"
                />
                <button
                  onClick={() => {
                    if (sessionInput.trim()) setBlockConfirm(sessionInput.trim());
                  }}
                  className="text-xs bg-red-900/50 hover:bg-red-900 border border-red-800 text-red-300 px-3 py-2 rounded-sm transition-colors"
                >
                  Block
                </button>
              </div>
            </div>

            {/* Session list */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-sm">
              <div className="px-4 py-3 border-b border-neutral-800">
                <h3 className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                  Known Sessions ({sessionIds.length})
                </h3>
              </div>
              {sessionIds.length === 0 ? (
                <p className="text-sm text-neutral-600 py-6 text-center">No sessions found.</p>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {sessionIds.map((sid) => {
                    const isBlocked = blockedSessions.includes(sid);
                    const tag = allPosts.find((p) => p.authorId === sid)?.authorTag
                      || allComments.find((c) => c.authorId === sid)?.authorTag
                      || 'unknown';
                    const postCount = allPosts.filter((p) => p.authorId === sid).length;
                    const commentCount = allComments.filter((c) => c.authorId === sid).length;

                    return (
                      <div
                        key={sid}
                        className={`px-4 py-3 flex items-center justify-between ${isBlocked ? 'opacity-50' : ''}`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-neutral-300">{tag}</span>
                            {isBlocked && (
                              <span className="text-xs text-red-500 bg-red-950/30 border border-red-900/50 px-1.5 py-0.5 rounded-sm">
                                Blocked
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-700 font-mono">
                            {sid.slice(0, 16)}... &bull; {postCount} posts, {commentCount} comments
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isBlocked ? (
                            <button
                              onClick={() => actions.adminUnblockSession(sid)}
                              className="text-xs text-neutral-400 hover:text-neutral-200 border border-neutral-700 px-3 py-1 rounded-sm transition-colors"
                            >
                              Unblock
                            </button>
                          ) : (
                            <button
                              onClick={() => setBlockConfirm(sid)}
                              className="text-xs text-red-500 hover:text-red-400 border border-red-900/50 px-3 py-1 rounded-sm transition-colors"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Blocked sessions list */}
            {blockedSessions.length > 0 && (
              <div className="bg-neutral-900 border border-red-900/30 rounded-sm">
                <div className="px-4 py-3 border-b border-neutral-800">
                  <h3 className="text-xs font-medium text-red-500 uppercase tracking-wider">
                    Blocked Sessions ({blockedSessions.length})
                  </h3>
                </div>
                <div className="divide-y divide-neutral-800">
                  {blockedSessions.map((sid) => (
                    <div key={sid} className="px-4 py-3 flex items-center justify-between">
                      <span className="text-xs font-mono text-neutral-500">{sid.slice(0, 24)}...</span>
                      <button
                        onClick={() => actions.adminUnblockSession(sid)}
                        className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {blockConfirm && (
        <ConfirmDialog
          message={`Block session ${blockConfirm.slice(0, 16)}...? This will prevent them from accessing the room.`}
          onConfirm={() => {
            actions.adminBlockSession(blockConfirm);
            setBlockConfirm(null);
            setSessionInput('');
          }}
          onCancel={() => setBlockConfirm(null)}
        />
      )}
    </div>
  );
}
