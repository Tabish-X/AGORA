import { useApp } from '../context/AppContext';

export function Footer() {
  const { state, actions } = useApp();

  if (!state.session) return null;

  return (
    <footer className="border-t border-neutral-900 py-6 mt-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-800">
            Agora &mdash; Private anonymous discussion room
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-800">
              Session: <span className="font-mono">{state.session.tag}</span>
            </span>
            {/* Admin access — intentionally low-visibility */}
            <button
              onClick={actions.goToAdminLogin}
              className="text-xs text-neutral-900 hover:text-neutral-700 transition-colors"
              aria-label="Administration"
              tabIndex={-1}
            >
              &middot;
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}