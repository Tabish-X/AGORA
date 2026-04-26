import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { LIMITS, validatePostTitle, validatePostBody, sanitizeText } from '../lib/sanitize';

export function CreatePost() {
  const { state, actions } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [titleError, setTitleError] = useState('');
  const [bodyError, setBodyError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validateField = (field: 'title' | 'body', value: string) => {
    const cleaned = sanitizeText(value);
    if (field === 'title') {
      const result = validatePostTitle(cleaned);
      setTitleError(result.valid ? '' : result.error || '');
    } else {
      const result = validatePostBody(cleaned);
      setBodyError(result.valid ? '' : result.error || '');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(title);
    const cleanBody = sanitizeText(body);
    const titleResult = validatePostTitle(cleanTitle);
    const bodyResult = validatePostBody(cleanBody);

    if (!titleResult.valid) { setTitleError(titleResult.error || ''); return; }
    if (!bodyResult.valid) { setBodyError(bodyResult.error || ''); return; }

    setSubmitting(true);
    const success = await actions.createPost(title, body);
    setSubmitting(false);
    if (success) actions.goToFeed();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-base font-semibold text-neutral-100 mb-6">Create Post</h1>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="post-title" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Title
            </label>
            <span className="text-xs text-neutral-700">{title.length}/{LIMITS.POST_TITLE_MAX}</span>
          </div>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (titleError) validateField('title', e.target.value); }}
            onBlur={(e) => validateField('title', e.target.value)}
            maxLength={LIMITS.POST_TITLE_MAX}
            className={`w-full bg-neutral-950 border text-neutral-100 text-sm px-3 py-2.5 rounded-sm focus:outline-none placeholder-neutral-700 transition-colors ${titleError ? 'border-red-800 focus:border-red-700' : 'border-neutral-800 focus:border-neutral-600'}`}
            placeholder="A clear, descriptive title"
            disabled={submitting}
            autoFocus
          />
          {titleError && <p className="mt-1.5 text-xs text-red-400">{titleError}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="post-body" className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Body
            </label>
            <span className="text-xs text-neutral-700">{body.length}/{LIMITS.POST_BODY_MAX.toLocaleString()}</span>
          </div>
          <textarea
            id="post-body"
            value={body}
            onChange={(e) => { setBody(e.target.value); if (bodyError) validateField('body', e.target.value); }}
            onBlur={(e) => validateField('body', e.target.value)}
            maxLength={LIMITS.POST_BODY_MAX}
            rows={10}
            className={`w-full bg-neutral-950 border text-neutral-200 text-sm px-3 py-2.5 rounded-sm focus:outline-none placeholder-neutral-700 resize-y transition-colors ${bodyError ? 'border-red-800 focus:border-red-700' : 'border-neutral-800 focus:border-neutral-600'}`}
            placeholder="Write your post content here."
            disabled={submitting}
          />
          {bodyError && <p className="mt-1.5 text-xs text-red-400">{bodyError}</p>}
        </div>

        {state.error && (
          <div role="alert" className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2.5 rounded-sm">
            {state.error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !title.trim() || !body.trim()}
            className="text-sm bg-neutral-100 hover:bg-white text-neutral-900 font-medium px-5 py-2.5 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Post'}
          </button>
          <button
            type="button"
            onClick={actions.goToFeed}
            disabled={submitting}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
        </div>

        <div className="pt-2 border-t border-neutral-800">
          <p className="text-xs text-neutral-700">
            Posts are visible to all room members. Max {LIMITS.RATE_LIMIT_POSTS} posts per minute.
          </p>
        </div>
      </form>
    </div>
  );
}