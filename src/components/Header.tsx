import { useApp } from '../context/AppContext';

export function Header() {
  const { state, actions } = useApp();
  const { session, view } = state;

  if (!session) return null;

  const isOnFeed = view === 'feed';
  const isOnPost = view === 'post';
  const isOnCreate = view === 'create';

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={actions.goToFeed}
            className="text-sm font-semibold text-neutral-100 hover:text-white tracking-tight transition-colors"
          >
            Agora
          </button>
          {(isOnPost || isOnCreate) && (
            <>
              <span className="text-neutral-700">/</span>
              <button
                onClick={actions.goToFeed}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Feed
              </button>
              {isOnPost && (
                <>
                  <span className="text-neutral-700">/</span>
                  <span className="text-sm text-neutral-400">Post</span>
                </>
              )}
              {isOnCreate && (
                <>
                  <span className="text-neutral-700">/</span>
                  <span className="text-sm text-neutral-400">New Post</span>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs font-mono text-neutral-600 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-sm"
            title="Your anonymous session identifier"
          >
            {session.tag}
          </span>
          {isOnFeed && (
            <button
              onClick={actions.goToCreate}
              className="text-xs bg-neutral-100 hover:bg-white text-neutral-900 font-medium px-3 py-1.5 rounded-sm transition-colors"
            >
              New Post
            </button>
          )}
        </div>
      </div>
    </header>
  );
}