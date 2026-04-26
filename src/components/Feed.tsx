import { useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PostCard } from './PostCard';
import type { Post } from '../types';
import type { SortMode } from '../types';

function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const now = Date.now();
  switch (mode) {
    case 'new':
      return [...posts].sort((a, b) => b.createdAt - a.createdAt);
    case 'top':
      return [...posts].sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    case 'hot': {
      const score = (p: Post) => {
        const s = p.upvotes - p.downvotes;
        const ageHours = (now - p.createdAt) / 3600000;
        return s / Math.pow(ageHours + 2, 1.5);
      };
      return [...posts].sort((a, b) => score(b) - score(a));
    }
    default:
      return posts;
  }
}

export function Feed() {
  const { state, actions } = useApp();
  const { posts, sortMode, loading } = state;

  useEffect(() => {
    actions.loadPosts();
  }, [actions]);

  const sortedPosts = useMemo(() => sortPosts(posts, sortMode), [posts, sortMode]);

  const SORT_OPTIONS: { value: SortMode; label: string }[] = [
    { value: 'hot', label: 'Hot' },
    { value: 'new', label: 'New' },
    { value: 'top', label: 'Top' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => actions.setSortMode(opt.value)}
              className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                sortMode === opt.value
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={actions.goToCreate}
          className="text-xs text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-600 px-3 py-1.5 rounded-sm transition-colors"
        >
          Submit Post
        </button>
      </div>

      {loading && sortedPosts.length === 0 && (
        <div className="text-sm text-neutral-600 text-center py-16">Loading...</div>
      )}

      {!loading && sortedPosts.length === 0 && (
        <div className="text-center py-20">
          <p className="text-neutral-500 text-sm mb-1">No posts yet.</p>
          <p className="text-neutral-600 text-xs">Be the first to submit something.</p>
          <button
            onClick={actions.goToCreate}
            className="mt-4 text-xs text-neutral-400 hover:text-neutral-200 border border-neutral-800 hover:border-neutral-600 px-4 py-2 rounded-sm transition-colors"
          >
            Create Post
          </button>
        </div>
      )}

      <div className="space-y-2">
        {sortedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {sortedPosts.length > 0 && (
        <div className="mt-6 text-center text-xs text-neutral-700">
          {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'} in this room
        </div>
      )}
    </div>
  );
}