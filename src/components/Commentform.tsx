import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LIMITS } from '../lib/sanitize';

interface CommentFormProps {
  postId: string;
  parentId: string | null;
  placeholder?: string;
  onSuccess?: () => void;
}

export function CommentForm({ postId, parentId, placeholder = 'Write a comment...', onSuccess }: CommentFormProps) {
  const { actions } = useApp();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const success = await actions.createComment(postId, parentId, text);
    setSubmitting(false);
    if (success) {
      setText('');
      onSuccess?.();
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={LIMITS.COMMENT_BODY_MAX}
        rows={3}
        placeholder={placeholder}
        className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-600 placeholder-neutral-700 resize-none"
        disabled={submitting}
        autoFocus
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting || !text.trim()}
          className="text-xs bg-neutral-200 hover:bg-white text-neutral-900 font-medium px-3 py-1.5 rounded-sm transition-colors disabled:opacity-40"
        >
          {submitting ? 'Posting...' : 'Post Reply'}
        </button>
        <span className="text-xs text-neutral-700">
          {text.length}/{LIMITS.COMMENT_BODY_MAX}
        </span>
      </div>
    </div>
  );
}