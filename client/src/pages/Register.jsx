import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { Code2, Sparkles } from 'lucide-react';

const Register = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-6 space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Join College DSA Rankboard
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Student Registration
        </h1>
        <p className="text-xs text-slate-500">
          Create your student account to submit coding handles and compete
        </p>
      </div>

      <div className="shadow-lg rounded-2xl overflow-hidden">
        <SignUp
          routing="path"
          path="/register"
          signInUrl="/login"
          afterSignUpUrl="/student/profile"
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

export default Register;
