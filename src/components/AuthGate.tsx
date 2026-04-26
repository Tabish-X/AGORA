import { useState, type FormEvent } from 'react';
import { useApp } from '../context/AppContext';
import { LIMITS } from '../lib/sanitize';

export function AuthGate() {
  const { state, actions } = useApp();
  const [key, setKey] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    await actions.authenticate(key);
  };

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="border border-neutral-800 bg-neutral-900 rounded-sm p-8">
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-neutral-100 tracking-tight">
              Agora
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Private anonymous discussion room
            </p>
          </div>

          <div className="mb-6">
            <p className="text-sm text-neutral-400 leading-relaxed">
              This is a closed, private community. Entry requires a valid access key.
              You will be assigned an anonymous identity for the duration of your session.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="access-key"
                className="block text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2"
              >
                Access Key
              </label>
              <input
                id="access-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                maxLength={LIMITS.ACCESS_KEY_MAX}
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-neutral-950 border border-neutral-700 text-neutral-100 text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-neutral-500 placeholder-neutral-600 font-mono"
                placeholder="Enter access key"
                disabled={state.loading}
              />
            </div>

            {state.error && (
              <div
                role="alert"
                className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 px-3 py-2 rounded-sm"
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={state.loading || !key.trim()}
              className="w-full bg-neutral-100 hover:bg-white text-neutral-900 text-sm font-medium py-2.5 px-4 rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state.loading ? 'Verifying...' : 'Enter Room'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-600 text-center">
              No account required. All participation is anonymous. No messages or private communications are supported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
