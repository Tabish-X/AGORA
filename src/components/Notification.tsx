import { useApp } from '../context/AppContext';

export function Notification() {
  const { state } = useApp();
  const { notification } = state;

  if (!notification) return null;

  const colors = {
    success: 'bg-green-950/80 border-green-800 text-green-300',
    error: 'bg-red-950/80 border-red-800 text-red-300',
    info: 'bg-blue-950/80 border-blue-800 text-blue-300',
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 right-4 z-50 max-w-sm px-4 py-3 border rounded-sm text-sm font-medium shadow-lg ${colors[notification.type]}`}
    >
      {notification.message}
    </div>
  );
}