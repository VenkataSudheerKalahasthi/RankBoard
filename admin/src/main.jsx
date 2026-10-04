import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkKeyWarning() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Clerk Configuration Required</h2>
        <p className="text-sm text-slate-400">
          The environment variable <code className="text-amber-400 font-mono text-xs bg-slate-800 px-1.5 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> is missing in your <code className="text-slate-300 font-mono text-xs">admin/.env</code> file.
        </p>
        <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-lg text-left font-mono">
          1. Copy VITE_CLERK_PUBLISHABLE_KEY from client/.env into admin/.env<br/>
          2. Restart the admin Vite dev server
        </div>
      </div>
    </div>
  );
}

const rootElement = document.getElementById('root');

if (!clerkPublishableKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is missing. Rendering setup notice.');
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MissingClerkKeyWarning />
    </React.StrictMode>
  );
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={clerkPublishableKey}>
        <BrowserRouter>
          <AdminAuthProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </AdminAuthProvider>
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}
