import React from 'react';
import { Lock } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';

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

      {/* Admin Login Component */}
      <LoginForm
        portal="admin"
        destinationUrl="/dashboard"
      />

      {/* Security Note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
        <Lock className="w-3.5 h-3.5 text-slate-600" />
        <span>Strict Role-Based Authorization Enforced</span>
      </div>
    </div>
  );
};

export default Login;
