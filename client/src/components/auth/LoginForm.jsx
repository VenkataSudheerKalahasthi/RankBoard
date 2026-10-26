import React, { useState, useEffect, useRef } from 'react';
import { useSignIn, useAuth } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { validatePassword } from '../../utils/passwordValidator';

/**
 * Universal Clerk LoginForm
 * Handles:
 * 1. Email code sign-in & verification
 * 2. Password sign-in with show/hide toggle
 * 3. Google OAuth sign-in & sso-callback
 * 4. Google user without password (Scenario B) with graceful options & zero loops
 * 5. Complete Forgot Password flow (Code verification -> New password setup)
 * 6. Resend verification code with cooldown timer
 * 7. Real-time feedback, loading states, and robust error handling
 */
export default function LoginForm({
  portal = 'student', // 'student' | 'admin'
  destinationUrl = '/student/dashboard',
  signUpUrl = '/register',
}) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isSignedIn) {
      navigate(destinationUrl, { replace: true });
    }
  }, [isSignedIn, destinationUrl, navigate]);

  // Main flow step state
  // 'IDENTIFIER' | 'PASSWORD' | 'GOOGLE_NO_PASSWORD' | 'VERIFY_EMAIL_CODE' | 'FORGOT_PASSWORD_EMAIL' | 'VERIFY_RECOVERY_CODE' | 'SET_NEW_PASSWORD'
  const [step, setStep] = useState('IDENTIFIER');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & loading states
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Factor references
  const [emailAddressId, setEmailAddressId] = useState('');
  const [hasPasswordFactor, setHasPasswordFactor] = useState(false);
  const [isGoogleOnlyAccount, setIsGoogleOnlyAccount] = useState(false);

  // Cooldown timer for Resend Code (60 seconds)
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (cooldown > 0) {
      timerRef.current = setTimeout(() => {
        setCooldown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cooldown]);

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
  };

  // Helper to extract clear Clerk error message
  const extractErrorMessage = (err, defaultMsg = 'An unexpected error occurred.') => {
    console.error('[Clerk Auth Error]:', err);
    if (!err) return defaultMsg;
    const firstErr = err.errors?.[0];
    if (firstErr) {
      if (firstErr.code === 'form_identifier_not_found') {
        return 'No account was found with this email. Please check the spelling or register a new account.';
      }
      if (firstErr.code === 'form_password_incorrect') {
        return 'Incorrect password. Please try again or use Forgot Password to reset it.';
      }
      if (firstErr.code === 'form_code_incorrect') {
        return 'The verification code entered is incorrect. Please check the code and try again.';
      }
      if (firstErr.code === 'verification_expired') {
        return 'The verification code has expired. Please click Resend Code to request a new one.';
      }
      if (firstErr.code === 'form_password_validation_failed') {
        return firstErr.longMessage || 'Password does not meet the security criteria.';
      }
      return firstErr.longMessage || firstErr.message || defaultMsg;
    }
    return err.message || defaultMsg;
  };

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    if (!isLoaded || oauthLoading || loading || isSubmittingRef.current) return;
    setOauthLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: destinationUrl,
      });
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not initiate Google Sign-In.'));
      setOauthLoading(false);
    }
  };

  // Step 1: Submit Identifier (Email)
  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading || oauthLoading || isSubmittingRef.current) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const result = await signIn.create({
        identifier: trimmedEmail,
      });

      const firstFactors = result.supportedFirstFactors || [];
      const passwordFactor = firstFactors.find((f) => f.strategy === 'password');
      const emailCodeFactor = firstFactors.find((f) => f.strategy === 'email_code');

      setHasPasswordFactor(!!passwordFactor);
      if (emailCodeFactor && emailCodeFactor.emailAddressId) {
        setEmailAddressId(emailCodeFactor.emailAddressId);
      }

      if (passwordFactor) {
        // User has a password configured -> prompt for password
        setIsGoogleOnlyAccount(false);
        setStep('PASSWORD');
      } else if (emailCodeFactor) {
        // Account has no password (e.g. Google-authenticated or passwordless)
        // Check if user has Google OAuth factor or was created without password
        setIsGoogleOnlyAccount(true);
        setStep('GOOGLE_NO_PASSWORD');
      } else {
        // Fallback: try direct email code preparation
        isSubmittingRef.current = false;
        await handleSendEmailCode(trimmedEmail);
        return;
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to process email. Please try again.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Send Email Code for Sign-In
  const handleSendEmailCode = async (targetEmail = email) => {
    if (!isLoaded || loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const cleanEmail = (targetEmail || '').trim().toLowerCase();
      let currentSignIn = signIn;
      if (!currentSignIn.identifier || currentSignIn.identifier.toLowerCase() !== cleanEmail) {
        currentSignIn = await signIn.create({ identifier: cleanEmail });
      }

      const emailCodeFactor = currentSignIn.supportedFirstFactors?.find(
        (f) => f.strategy === 'email_code'
      );

      if (emailCodeFactor && emailCodeFactor.emailAddressId) {
        setEmailAddressId(emailCodeFactor.emailAddressId);
      }

      // Check if Clerk already prepared the email verification
      const factorVerification = currentSignIn.firstFactorVerification;
      const isAlreadyPrepared =
        factorVerification?.status === 'unverified' &&
        factorVerification?.strategy === 'email_code';

      if (!isAlreadyPrepared) {
        if (emailCodeFactor && emailCodeFactor.emailAddressId) {
          await currentSignIn.prepareFirstFactor({
            strategy: 'email_code',
            emailAddressId: emailCodeFactor.emailAddressId,
          });
        } else {
          await currentSignIn.prepareFirstFactor({
            strategy: 'email_code',
          });
        }
      }

      setVerificationCode('');
      setStep('VERIFY_EMAIL_CODE');
      startCooldown(60);
      setSuccessMessage('A 6-digit verification code has been sent to your email.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not send verification code.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Resend Email Verification Code
  const handleResendEmailCode = async () => {
    if (!isLoaded || resendLoading || cooldown > 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await signIn.prepareFirstFactor({
        strategy: 'email_code',
        ...(emailAddressId && { emailAddressId }),
      });
      startCooldown(60);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to resend code. Please try again in a few moments.'));
    } finally {
      setResendLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Verify Email Code and Establish Session
  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading || isSubmittingRef.current) return;

    const trimmedCode = verificationCode.trim();
    if (!trimmedCode) {
      setError('Please enter the verification code.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: trimmedCode,
      });

      if (attempt.status === 'complete') {
        setSuccessMessage('Email verified successfully! Establishing session...');
        await setActive({ session: attempt.createdSessionId });
        navigate(destinationUrl, { replace: true });
      } else {
        setError(`Sign in status: ${attempt.status}. Additional verification required.`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid or expired verification code. Please try again.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Password Sign-In
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading || isSubmittingRef.current) return;

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'password',
        password: password,
      });

      if (attempt.status === 'complete') {
        setSuccessMessage('Signed in successfully! Loading portal...');
        await setActive({ session: attempt.createdSessionId });
        navigate(destinationUrl, { replace: true });
      } else {
        setError(`Authentication status: ${attempt.status}. Please complete verification.`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Authentication failed. Please verify your password.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Initiate Forgot Password Flow
  const handleStartForgotPassword = async (targetEmail = email) => {
    if (!isLoaded || loading || isSubmittingRef.current) return;
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      setStep('FORGOT_PASSWORD_EMAIL');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      // In Clerk, passing strategy: 'reset_password_email_code' to signIn.create()
      // creates the sign-in attempt and initiates the password recovery code email.
      const result = await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: cleanEmail,
      });

      const resetFactor = result.supportedFirstFactors?.find(
        (f) => f.strategy === 'reset_password_email_code'
      );

      if (resetFactor && resetFactor.emailAddressId) {
        setEmailAddressId(resetFactor.emailAddressId);
      }

      // Check if Clerk already auto-prepared the verification during create()
      // Calling prepareFirstFactor again immediately right after would send a duplicate email
      // with a different code and invalidate the first code. Only call if not already prepared.
      const factorVerification = result.firstFactorVerification;
      const isAlreadyPrepared =
        factorVerification?.status === 'unverified' &&
        factorVerification?.strategy === 'reset_password_email_code';

      if (!isAlreadyPrepared && resetFactor?.emailAddressId) {
        await signIn.prepareFirstFactor({
          strategy: 'reset_password_email_code',
          emailAddressId: resetFactor.emailAddressId,
        });
      }

      setRecoveryCode('');
      setStep('VERIFY_RECOVERY_CODE');
      startCooldown(60);
      setSuccessMessage('Password recovery code sent to ' + cleanEmail);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not initiate password recovery.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Resend Password Recovery Code
  const handleResendRecoveryCode = async () => {
    if (!isLoaded || resendLoading || cooldown > 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setResendLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        ...(emailAddressId && { emailAddressId }),
      });
      startCooldown(60);
      setSuccessMessage('A fresh password recovery code has been sent to your email.');
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to resend recovery code.'));
    } finally {
      setResendLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Verify Recovery Code (MUST precede new password form)
  const handleVerifyRecoveryCode = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading || isSubmittingRef.current) return;

    const trimmedCode = recoveryCode.trim();
    if (!trimmedCode) {
      setError('Please enter the 6-digit recovery code.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const attempt = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: trimmedCode,
      });

      // Verification successful! Clerk transitions to 'needs_new_password'
      if (attempt.status === 'needs_new_password') {
        setStep('SET_NEW_PASSWORD');
        setSuccessMessage('Code verified successfully. Please enter your new password.');
      } else if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        navigate(destinationUrl, { replace: true });
      } else {
        setError(`Recovery verification status: ${attempt.status}`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Invalid or expired recovery code. Please check and retry.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Submit New Password after Recovery Code Verification
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    if (!isLoaded || loading || isSubmittingRef.current) return;

    setError('');

    // Pre-validate new password
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const resetResult = await signIn.resetPassword({
        password: newPassword,
        signOutOfOtherSessions: true,
      });

      if (resetResult.status === 'complete') {
        setSuccessMessage('Password successfully updated! Signing into your account...');
        await setActive({ session: resetResult.createdSessionId });
        navigate(destinationUrl, { replace: true });
      } else {
        setError(`Password reset status: ${resetResult.status}`);
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to update password. Please ensure it meets requirements.'));
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Password criteria checklist for new password
  const newPasswordEvaluation = validatePassword(newPassword);
  const { criteria } = newPasswordEvaluation;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Visual Theme Classes
  const isAdmin = portal === 'admin';
  const cardBgClass = isAdmin
    ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl'
    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl';
  const inputBgClass = isAdmin
    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-brand-500 focus:ring-brand-500/20'
    : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:border-blue-600 focus:ring-blue-500/20';
  const labelClass = isAdmin
    ? 'text-slate-300 text-xs font-semibold'
    : 'text-slate-700 dark:text-slate-300 text-xs font-semibold';
  const primaryButtonClass = isAdmin
    ? 'bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed'
    : 'bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed';
  const secondaryButtonClass = isAdmin
    ? 'border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-xs py-2 px-3 rounded-lg transition-all'
    : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs py-2 px-3 rounded-lg transition-all';

  return (
    <div className={`w-full max-w-md rounded-2xl border p-6 sm:p-8 ${cardBgClass} transition-colors duration-200`}>
      {/* Alert Notices */}
      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{error}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
        </div>
      )}

      {/* STEP 1: IDENTIFIER (EMAIL ENTRY OR GOOGLE OAUTH) */}
      {step === 'IDENTIFIER' && (
        <div className="space-y-5">
          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={oauthLoading || loading}
            className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
              isAdmin
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750 hover:border-slate-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 shadow-2xs'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>{oauthLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className={`w-full border-t ${isAdmin ? 'border-slate-800' : 'border-slate-200 dark:border-slate-800'}`} />
            <span
              className={`px-3 text-[11px] uppercase tracking-wider font-semibold absolute ${
                isAdmin
                  ? 'bg-slate-900 text-slate-500'
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500'
              }`}
            >
              or email
            </span>
          </div>

          {/* Identifier Form */}
          <form onSubmit={handleIdentifierSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email-input" className={`block mb-1.5 ${labelClass}`}>
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="auth-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={isAdmin ? 'admin@gmail.com' : 'student@gmail.com'}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || oauthLoading || !email.trim()}
              className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Looking up account...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Secondary Action Links */}
          <div className="pt-2 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => handleStartForgotPassword(email)}
              disabled={loading}
              className="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Forgot Password?
            </button>
            {!isAdmin && signUpUrl && (
              <Link
                to={signUpUrl}
                className="text-blue-600 dark:text-sky-400 font-semibold hover:underline transition"
              >
                Create Account
              </Link>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: PASSWORD SIGN-IN (For accounts with password configured) */}
      {step === 'PASSWORD' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="truncate font-medium text-slate-700 dark:text-slate-300">
              Signing in as <strong className="text-slate-900 dark:text-white">{email}</strong>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('IDENTIFIER');
                setPassword('');
                setError('');
              }}
              className="text-blue-600 dark:text-sky-400 font-bold hover:underline shrink-0 ml-2"
            >
              Change
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="auth-password-input" className={labelClass}>
                Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => handleStartForgotPassword(email)}
                disabled={loading}
                className="text-[11px] text-blue-600 dark:text-sky-400 hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                id="auth-password-input"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => handleSendEmailCode(email)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 font-medium transition"
            >
              Sign in with email verification code instead
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: GOOGLE USER WITHOUT PASSWORD (Scenario B) */}
      {step === 'GOOGLE_NO_PASSWORD' && (
        <div className="space-y-5">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-2 border border-amber-500/20">
              <KeyRound className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Google Account Detected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
              The account for <strong className="text-slate-800 dark:text-slate-200">{email}</strong> was registered via Google Sign-In and does not currently have a password set.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Action A: Continue with Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={oauthLoading || loading}
              className={`w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                isAdmin
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{oauthLoading ? 'Connecting to Google...' : 'Continue with Google (Recommended)'}</span>
            </button>

            {/* Action B: Send Email Verification Code */}
            <button
              type="button"
              onClick={() => handleSendEmailCode(email)}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold ${secondaryButtonClass}`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Sign in with Email Verification Code</span>
            </button>

            {/* Action C: Set up a password */}
            <button
              type="button"
              onClick={() => handleStartForgotPassword(email)}
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold ${secondaryButtonClass}`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Set Up a Password for this Account</span>
            </button>
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setStep('IDENTIFIER');
                setError('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Use a different email</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EMAIL CODE VERIFICATION (Email Code Sign-In) */}
      {step === 'VERIFY_EMAIL_CODE' && (
        <div className="space-y-4">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Verify your email
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We sent a 6-digit verification code to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyEmailCode} className="space-y-4">
            <div>
              <label htmlFor="auth-email-code-input" className={`block mb-1.5 ${labelClass}`}>
                Verification Code
              </label>
              <input
                id="auth-email-code-input"
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                className={`w-full py-2.5 px-3.5 text-center tracking-widest font-mono text-lg font-extrabold rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || verificationCode.trim().length === 0}
              className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>

            {/* Resend Code Button with Cooldown State */}
            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResendEmailCode}
                disabled={resendLoading || cooldown > 0 || loading}
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 font-semibold disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed hover:underline transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : resendLoading ? (
                  <span>Sending code...</span>
                ) : (
                  <span>Resend Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('IDENTIFIER');
                  setVerificationCode('');
                  setError('');
                }}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"
              >
                Back to email
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 5: FORGOT PASSWORD EMAIL ENTRY */}
      {step === 'FORGOT_PASSWORD_EMAIL' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Password Recovery
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter your registered email address to receive a recovery code.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartForgotPassword(email);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="auth-forgot-email-input" className={`block mb-1.5 ${labelClass}`}>
                Email address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="auth-forgot-email-input"
                  type="email"
                  required
                  placeholder="name@college.edu"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending recovery code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('IDENTIFIER');
                setError('');
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition py-1"
            >
              Back to Sign In
            </button>
          </form>
        </div>
      )}

      {/* STEP 6: VERIFY RECOVERY CODE (Code must be successfully verified BEFORE new password form is shown) */}
      {step === 'VERIFY_RECOVERY_CODE' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto mb-2 border border-brand-500/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Enter Recovery Code
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              A 6-digit password recovery code was sent to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>
            </p>
          </div>

          <form onSubmit={handleVerifyRecoveryCode} className="space-y-4">
            <div>
              <label htmlFor="auth-recovery-code-input" className={`block mb-1.5 ${labelClass}`}>
                Recovery Code
              </label>
              <input
                id="auth-recovery-code-input"
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={recoveryCode}
                onChange={(e) => {
                  setRecoveryCode(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                className={`w-full py-2.5 px-3.5 text-center tracking-widest font-mono text-lg font-extrabold rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
              />
            </div>

            <button
              type="submit"
              disabled={loading || recoveryCode.trim().length === 0}
              className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <span>Verify Code & Proceed</span>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={handleResendRecoveryCode}
                disabled={resendLoading || cooldown > 0 || loading}
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-sky-400 font-semibold disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed hover:underline transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? (
                  <span>Resend in {cooldown}s</span>
                ) : resendLoading ? (
                  <span>Sending...</span>
                ) : (
                  <span>Resend Code</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('IDENTIFIER');
                  setRecoveryCode('');
                  setError('');
                }}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-medium"
              >
                Back to sign in
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 7: SET NEW PASSWORD (Displayed only after recovery code verification succeeds) */}
      {step === 'SET_NEW_PASSWORD' && (
        <form onSubmit={handleSetNewPassword} className="space-y-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isGoogleOnlyAccount ? 'Create Account Password' : 'Set New Password'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isGoogleOnlyAccount
                ? 'Create a password to enable password-based sign-in for this account.'
                : 'Enter your new strong password below.'}
            </p>
          </div>

          {/* New Password Input */}
          <div>
            <label htmlFor="auth-new-password" className={`block mb-1.5 ${labelClass}`}>
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                id="auth-new-password"
                type={showNewPassword ? 'text' : 'password'}
                required
                placeholder="Enter new strong password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div>
            <label htmlFor="auth-confirm-password" className={`block mb-1.5 ${labelClass}`}>
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                id="auth-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 transition-all ${inputBgClass}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Password Security Checklist */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2 text-[11px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Password Requirements:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className={`flex items-center gap-1.5 ${criteria.minLength ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {criteria.minLength ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />}
                <span>8+ characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${criteria.hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {criteria.hasUppercase ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />}
                <span>Uppercase (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${criteria.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {criteria.hasNumber ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${criteria.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                {criteria.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />}
                <span>Special (@, #, $...)</span>
              </div>
            </div>
            {confirmPassword.length > 0 && (
              <div className={`pt-1 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-500 font-medium'}`}>
                {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !newPasswordEvaluation.isValid || !passwordsMatch}
            className={`w-full flex items-center justify-center gap-2 ${primaryButtonClass}`}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <span>Save Password & Sign In</span>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
