import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Shield, Lock } from 'lucide-react';

export const Login = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-xl shadow-brand-900/40 text-white font-extrabold text-xl mb-2">
          DSA
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Rankboard Admin Console
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Authorized administrative access for college competitive programming leaderboard management.
        </p>
      </div>

      {/* Clerk Sign In Component */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-2xl backdrop-blur-md">
        <SignIn
          routing="hash"
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'bg-transparent shadow-none p-4',
              headerTitle: 'text-slate-100 font-bold text-lg',
              headerSubtitle: 'text-slate-400 text-xs',
              formButtonPrimary: 'bg-brand-600 hover:bg-brand-500 text-xs font-semibold py-2.5 rounded-lg shadow-sm',
              formFieldInput: 'bg-slate-950 border-slate-800 text-slate-200 text-xs rounded-lg focus:border-brand-500',
              formFieldLabel: 'text-slate-300 text-xs font-medium',
              footerActionLink: 'text-brand-400 hover:text-brand-300 text-xs',
              identityPreviewText: 'text-slate-300 text-xs',
              identityPreviewEditButton: 'text-brand-400',
              socialButtonsBlockButton: 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs',
              dividerLine: 'bg-slate-800',
              dividerText: 'text-slate-500 text-xs',
            },
          }}
        />
      </div>

      {/* Security Note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
        <Lock className="w-3.5 h-3.5 text-slate-600" />
        <span>Strict Role-Based Authorization Enforced</span>
      </div>
    </div>
  );
};

export default Login;
