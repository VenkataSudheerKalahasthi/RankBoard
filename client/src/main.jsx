import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { StudentProvider } from './context/StudentContext';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function MissingClerkKeyWarning() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-amber-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
          !
        </div>
        <h2 className="text-xl font-bold text-white">Clerk Configuration Required</h2>
        <p className="text-sm text-zinc-400">
          The environment variable <code className="text-amber-400 font-mono text-xs bg-zinc-800 px-1.5 py-0.5 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> is missing or not configured in your <code className="text-zinc-300 font-mono text-xs">client/.env</code> file.
        </p>
        <div className="text-xs text-zinc-400 bg-zinc-950 p-3 rounded-lg text-left font-mono">
          1. Create client/.env from client/.env.example<br/>
          2. Set VITE_CLERK_PUBLISHABLE_KEY=pk_test_...<br/>
          3. Restart the Vite dev server
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
          <StudentProvider>
            <App />
          </StudentProvider>
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>
  );
}
