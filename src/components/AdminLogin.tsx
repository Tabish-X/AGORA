import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { LIMITS } from '../lib/sanitize';

export function AdminLogin() {
  const { state, actions } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setSubmitting(true);
    await actions.adminLogin(username, password);
    setSubmitting(false);
    // Clear password regardless of outcome
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="border border-neutral-800 bg-neutral-900 rounded-sm p-8">
          <div className="mb-6">
            <h1 className="text-sm font-semibold text-neutral-300 tracking-tight">
              Administration
            </h1>
            <p className="text-xs text-neutral-600 mt-1">
              Restricted access. Credentials required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label
                htmlFor="admin-username"
                className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5"
              >
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={LIMITS.USERNAME_MAX}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-600 placeholder-neutral-700 font-mono"
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={LIMITS.PASSWORD_MAX}
                autoComplete="current-password"
                className="w-full bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-neutral-600 placeholder-neutral-700"
                disabled={submitting}
              />
            </div>

            {state.error && (
              <div
                role="alert"
                className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-sm"
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username.trim() || !password}
              className="w-full bg-neutral-300 hover:bg-neutral-100 text-neutral-900 text-sm font-medium py-2 px-4 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {submitting ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-800">
            <button
              onClick={actions.goToFeed}
              className="text-xs text-neutral-700 hover:text-neutral-500 transition-colors"
            >
              Return to forum
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-800 text-center mt-4">
          All access attempts are logged. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
