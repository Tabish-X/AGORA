  import { useApp } from '../context/AppContext';

  interface VoteButtonsProps {
    targetId: string;
    targetType: 'post' | 'comment';
    upvotes: number;
    downvotes: number;
    orientation?: 'vertical' | 'horizontal';
  }

  export function VoteButtons({
    targetId,
    targetType,
    upvotes,
    downvotes,
    orientation = 'vertical',
  }: VoteButtonsProps) {
    const { state, actions } = useApp();
    const userVote = state.userVotes[targetId];
    const score = upvotes - downvotes;

    const handleVote = (value: 1 | -1) => {
      if (targetType === 'post') {
        actions.votePost(targetId, value);
      } else {
        actions.voteComment(targetId, value);
      }
    };

    const upActive = userVote === 1;
    const downActive = userVote === -1;

    if (orientation === 'horizontal') {
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleVote(1)}
            aria-label="Upvote"
            aria-pressed={upActive}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors ${
              upActive
                ? 'bg-orange-950/40 border-orange-800 text-orange-400'
                : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 1L9 8H1L5 1Z" />
            </svg>
            {upvotes}
          </button>
          <span
            className={`text-xs font-mono font-medium min-w-[1.5rem] text-center ${
              score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-neutral-500'
            }`}
          >
            {score > 0 ? '+' : ''}{score}
          </span>
          <button
            onClick={() => handleVote(-1)}
            aria-label="Downvote"
            aria-pressed={downActive}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-sm border transition-colors ${
              downActive
                ? 'bg-blue-950/40 border-blue-800 text-blue-400'
                : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 hover:text-neutral-300'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M5 9L1 2H9L5 9Z" />
            </svg>
            {downvotes}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-0.5 min-w-[2.5rem]">
        <button
          onClick={() => handleVote(1)}
          aria-label="Upvote"
          aria-pressed={upActive}
          className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-colors ${
            upActive
              ? 'bg-orange-950/40 border-orange-800 text-orange-400'
              : 'border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 1L9 8H1L5 1Z" />
          </svg>
        </button>
        <span
          className={`text-xs font-mono font-semibold ${
            score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-neutral-500'
          }`}
        >
          {score}
        </span>
        <button
          onClick={() => handleVote(-1)}
          aria-label="Downvote"
          aria-pressed={downActive}
          className={`w-7 h-7 flex items-center justify-center rounded-sm border transition-colors ${
            downActive
              ? 'bg-blue-950/40 border-blue-800 text-blue-400'
              : 'border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M5 9L1 2H9L5 9Z" />
          </svg>
        </button>
      </div>
    );
  }
