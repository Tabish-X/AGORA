import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LIMITS } from '../lib/sanitize';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  postId: string;
}

export function CommentList({ postId }: CommentListProps) {
  const { state, actions } = useApp();
  const { comments, loading } = state;
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const postComments = comments.filter((c) => c.postId === postId);
  const rootComments = postComments.filter((c) => c.parentId === null);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    const success = await actions.createComment(postId, null, body);
    setSubmitting(false);
    if (success) setBody('');
  };

  return (
    <div className="mt-6">
      <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-4">
        {postComments.length} {postComments.length === 1 ? 'Comment' : 'Comments'}
      </h3>

      {/* Top-level comment input */}
      <div className="mb-6 space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={LIMITS.COMMENT_BODY_MAX}
          rows={4}
          placeholder="Write a comment..."
          className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-neutral-600 placeholder-neutral-700 resize-none"
          disabled={submitting || loading}
        />
        <div className="flex items-center justify-between">
          <button
            onClick={handleSubmit}
            disabled={submitting || !body.trim()}
            className="text-xs bg-neutral-200 hover:bg-white text-neutral-900 font-medium px-4 py-2 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
          <span className="text-xs text-neutral-700">
            {body.length}/{LIMITS.COMMENT_BODY_MAX}
          </span>
        </div>
      </div>

      {rootComments.length === 0 && !loading && (
        <p className="text-sm text-neutral-600 text-center py-8">
          No comments yet. Start the discussion.
        </p>
      )}

      <div className="divide-y divide-neutral-800/50">
        {rootComments
          .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
          .map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              allComments={postComments}
              postId={postId}
              depth={0}
            />
          ))}
      </div>
    </div>
  );
}