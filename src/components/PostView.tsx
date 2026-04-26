import { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { VoteButtons } from './VoteButtons';
import { CommentList } from './CommentList';
import { formatTimeAgo } from '../lib/sanitize';

export function PostView() {
  const { state, actions } = useApp();
  const { activePostId, posts, loading } = state;

  useEffect(() => {
    if (activePostId) {
      actions.loadComments(activePostId);
    }
  }, [activePostId, actions]);

  const post = posts.find((p) => p.id === activePostId);

  if (!activePostId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-neutral-600 text-sm">
        Post not found.
      </div>
    );
  }

  if (loading && !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center text-neutral-600 text-sm">
        Loading...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-neutral-500 text-sm mb-3">Post not found or has been removed.</p>
        <button
          onClick={actions.goToFeed}
          className="text-xs text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-sm transition-colors"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <article className="border border-neutral-800 bg-neutral-900/40 rounded-sm p-5 mb-6">
        <div className="flex gap-4">
          <VoteButtons
            targetId={post.id}
            targetType="post"
            upvotes={post.upvotes}
            downvotes={post.downvotes}
            orientation="vertical"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-neutral-100 leading-snug mb-3">
              {post.title}
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap break-words mb-4">
              {post.body}
            </p>
            <div className="flex items-center gap-3 text-xs text-neutral-600 pt-3 border-t border-neutral-800">
              <span className="font-mono">{post.authorTag}</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
              <span>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
            </div>
          </div>
        </div>
      </article>

      <CommentList postId={post.id} />
    </div>
  );
}