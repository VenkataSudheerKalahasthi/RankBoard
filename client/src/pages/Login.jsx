import React from 'react';
import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import LoginForm from '../components/auth/LoginForm';

const Login = () => {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-6 space-y-1">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-brand-400 font-bold shadow-subtle mb-2">
          <Code2 className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black theme-text-primary tracking-tight">
          Student Portal Sign In
        </h1>
        <p className="text-xs theme-text-secondary">
          Sign in via Clerk to access your DSA Rankboard student dashboard
        </p>
      </div>

      <LoginForm
        portal="student"
        destinationUrl="/student/dashboard"
        signUpUrl="/register"
      />

      <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Need to register a new student account on this computer? </span>
        <Link to="/register" className="text-blue-600 dark:text-sky-400 font-semibold hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
};

export default Login;
