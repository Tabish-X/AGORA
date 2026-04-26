import { type Post } from '../types';
import { formatTimeAgo, truncate } from '../lib/sanitize';
import { VoteButtons } from './VoteButtons';
import { useApp } from '../context/AppContext';

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { actions } = useApp();

  return (
    <article className="border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900/80 rounded-sm transition-colors">
      <div className="flex gap-3 p-4">
        <VoteButtons
          targetId={post.id}
          targetType="post"
          upvotes={post.upvotes}
          downvotes={post.downvotes}
          orientation="vertical"
        />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => actions.openPost(post.id)}
            className="text-left w-full group"
          >
            <h2 className="text-sm font-medium text-neutral-100 group-hover:text-white leading-snug mb-1.5 transition-colors">
              {truncate(post.title, 200)}
            </h2>
          </button>
          <p className="text-xs text-neutral-500 line-clamp-2 mb-2 leading-relaxed">
            {truncate(post.body, 200)}
          </p>
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <span className="font-mono">{post.authorTag}</span>
            <span>{formatTimeAgo(post.createdAt)}</span>
            <button
              onClick={() => actions.openPost(post.id)}
              className="hover:text-neutral-400 transition-colors"
            >
              {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
