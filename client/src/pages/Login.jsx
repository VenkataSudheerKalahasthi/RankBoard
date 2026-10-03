import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Code2 } from 'lucide-react';

const Login = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-6 space-y-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-brand-400 font-bold shadow-subtle mb-2">
          <Code2 className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Student Portal Sign In
        </h1>
        <p className="text-xs text-slate-500">
          Sign in via Clerk to access your DSA Rankboard student dashboard
        </p>
      </div>

      <div className="shadow-lg rounded-2xl overflow-hidden">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          afterSignInUrl="/student/dashboard"
          appearance={{
            elements: {
              formButtonPrimary: 'bg-brand-600 hover:bg-brand-700 text-sm font-semibold',
              card: 'border border-slate-200 shadow-none',
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;
