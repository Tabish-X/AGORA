import { useState } from 'react';
import type { Comment } from '../types';
import { formatTimeAgo, LIMITS } from '../lib/sanitize';
import { VoteButtons } from './VoteButtons';
import { CommentForm } from './CommentForm';
import { useApp } from '../context/AppContext';

interface CommentItemProps {
  comment: Comment;
  allComments: Comment[];
  postId: string;
  depth: number;
}

export function CommentItem({ comment, allComments, postId, depth }: CommentItemProps) {
  const { state } = useApp();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const children = allComments.filter((c) => c.parentId === comment.id);
  const canReply = depth < LIMITS.MAX_COMMENT_DEPTH;
  const isOwnComment = state.session?.id === comment.authorId;

  return (
    <div className={`relative ${depth > 0 ? 'ml-4' : ''}`}>
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-neutral-800 hover:bg-neutral-600 cursor-pointer transition-colors"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand thread' : 'Collapse thread'}
        />
      )}
      <div className={`${depth > 0 ? 'pl-4' : ''}`}>
        <div className="py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-neutral-500">
              {comment.authorTag}
              {isOwnComment && <span className="ml-1 text-neutral-600">(you)</span>}
            </span>
            <span className="text-xs text-neutral-700">{formatTimeAgo(comment.createdAt)}</span>
            {depth > 0 && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="text-xs text-neutral-700 hover:text-neutral-500 transition-colors ml-auto"
              >
                {collapsed ? 'expand' : 'collapse'}
              </button>
            )}
          </div>

          {!collapsed && (
            <>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap break-words mb-2">
                {comment.body}
              </p>
              <div className="flex items-center gap-3">
                <VoteButtons
                  targetId={comment.id}
                  targetType="comment"
                  upvotes={comment.upvotes}
                  downvotes={comment.downvotes}
                  orientation="horizontal"
                />
                {canReply && (
                  <button
                    onClick={() => setShowReplyForm((v) => !v)}
                    className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    {showReplyForm ? 'cancel' : 'reply'}
                  </button>
                )}
              </div>

              {showReplyForm && (
                <CommentForm
                  postId={postId}
                  parentId={comment.id}
                  placeholder={`Reply to ${comment.authorTag}...`}
                  onSuccess={() => setShowReplyForm(false)}
                />
              )}
            </>
          )}

          {collapsed && children.length > 0 && (
            <button
              onClick={() => setCollapsed(false)}
              className="text-xs text-neutral-600 hover:text-neutral-400"
            >
              {children.length} hidden {children.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>

        {!collapsed && children.length > 0 && (
          <div className="space-y-0">
            {children
              .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
              .map((child) => (
                <CommentItem
                  key={child.id}
                  comment={child}
                  allComments={allComments}
                  postId={postId}
                  depth={depth + 1}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}