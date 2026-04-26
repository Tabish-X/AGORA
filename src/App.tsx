import { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthGate } from './components/AuthGate';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Feed } from './components/Feed';
import { PostView } from './components/PostView';
import { CreatePost } from './components/CreatePost';
import { AdminLogin } from './components/AdminLogin';
import { AdminPanel } from './components/AdminPanel';
import { Notification } from './components/Notification';
import { verifyAdminSession } from './lib/backend';

function AppInner() {
  const { state, dispatch } = useApp();
  const { view, session } = state;

  // On mount: re-check admin session validity
  useEffect(() => {
    verifyAdminSession().then((valid) => {
      if (!valid && state.adminAuthenticated) {
        dispatch({ type: 'SET_ADMIN_AUTHENTICATED', payload: false });
      }
    });
  }, []);

  // Security guard: prevent direct URL navigation to admin
  if (view === 'admin' && !state.adminAuthenticated) {
    return <AuthGate />;
  }

  // No session = always show auth gate
  if (!session && view !== 'auth' && view !== 'admin-login' && view !== 'admin') {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {view === 'auth' && <AuthGate />}
      {view === 'admin-login' && <AdminLogin />}
      {view === 'admin' && state.adminAuthenticated && <AdminPanel />}

      {(view === 'feed' || view === 'post' || view === 'create') && session && (
        <>
          <Header />
          <main>
            {view === 'feed' && <Feed />}
            {view === 'post' && <PostView />}
            {view === 'create' && <CreatePost />}
          </main>
          <Footer />
        </>
      )}

      <Notification />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}