import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Sparkles, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Lock, 
  Mail, 
  User, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { validatePassword, VALIDATION_MESSAGES } from '../utils/passwordValidator';

const Register = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & error states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Email verification flow (if required by Clerk instance)
  const [verifying, setVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);

  // Dynamic password criteria evaluation (real-time checklist)
  const passwordEvaluation = validatePassword(password);
  const { criteria } = passwordEvaluation;

  // Handle Google OAuth Sign-Up
  const handleGoogleSignUp = async () => {
    if (!isLoaded || oauthLoading || loading) return;
    setOauthLoading(true);
    setError('');
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/student/profile',
      });
    } catch (err) {
      console.error('Google sign-up error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Google sign-up could not be initiated.';
      setError(msg);
      setOauthLoading(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading) return;

    setError('');

    // Pre-submission Password Validation
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      // Create user with Clerk
      const result = await signUp.create({
        emailAddress: email,
        password: password, // Raw password with preserved whitespace
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });

      // Handle email verification if required
      if (result.status === 'missing_requirements') {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setVerifying(true);
      } else if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/student/profile');
      } else {
        setError(`Registration status: ${result.status}. Please check your verification.`);
      }
    } catch (err) {
      console.error('Clerk registration error:', err);
      // Capture and display clear Clerk error message
      let clerkMsg = 
        err.errors?.[0]?.longMessage || 
        err.errors?.[0]?.message || 
        'Registration could not be completed. Please check your credentials.';
      
      if (err.errors?.[0]?.code === 'form_password_length_too_short' || clerkMsg.includes('15')) {
        clerkMsg = `${clerkMsg} (Action Required: In your Clerk Dashboard under User & Authentication > Password settings, change 'Minimum password length' from 15 to 8).`;
      }
      setError(clerkMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Email Verification Code
  const handleVerify = async (e) => {
    e.preventDefault();
    if (!isLoaded || verificationLoading) return;

    setVerificationLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (completeSignUp.status === 'complete') {
        await setActive({ session: completeSignUp.createdSessionId });
        navigate('/student/profile');
      } else {
        setError('Verification pending. Please check the code and try again.');
      }
    } catch (err) {
      console.error('Verification code error:', err);
      const msg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid verification code.';
      setError(msg);
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center px-4 py-12">
      {/* Brand Header */}
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

      {/* Main Registration Card */}
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        {!verifying ? (
          <div>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 transition-all shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed mb-5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {oauthLoading ? 'Connecting to Google...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider font-semibold text-slate-400 absolute">
                or
              </span>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="reg-first-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    First name <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="reg-first-name"
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-last-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Last name <span className="text-slate-400 text-[10px] font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="reg-last-name"
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    placeholder="student@college.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Password Input with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Min. 8 characters
                  </span>
                </div>

                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter strong password"
                    value={password}
                    onChange={(e) => {
                      // Preserve whitespace without silent alteration
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white font-sans"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Real-time Requirement Checklist */}
                <div className="mt-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Password Security Requirements:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${criteria.minLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      {criteria.minLength ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>8+ characters</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasUppercase ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      {criteria.hasUppercase ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>Uppercase (A-Z)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      {criteria.hasNumber ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>Number (0-9)</span>
                    </div>

                    <div className={`flex items-center gap-1.5 ${criteria.hasSpecial ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                      {criteria.hasSpecial ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>Special (@, #, $...)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || oauthLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Validating & Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Email Verification Step */
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-2 border border-brand-200">
                <Mail className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Verify your email
              </h2>
              <p className="text-xs text-slate-500">
                A 6-digit verification code was sent to <strong className="text-slate-800">{email}</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{error}</div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="reg-verification-code" className="block text-xs font-semibold text-slate-700 mb-1">
                  Verification Code
                </label>
                <input
                  id="reg-verification-code"
                  type="text"
                  required
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono text-base font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-slate-900 bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={verificationLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-60"
              >
                {verificationLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Email & Complete Registration</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setVerifying(false)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition py-1"
              >
                Back to registration details
              </button>
            </form>
          </div>
        )}

        {/* Footer links */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Already have an account?</span>
          <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 hover:underline">
            Sign In
          </Link>
        </div>
      </div>

      {/* Security badge */}
      <div className="mt-6 flex items-center gap-1.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-500" />
        <span>Protected with Clerk Authentication</span>
      </div>
    </div>
  );
};

export default Register;
