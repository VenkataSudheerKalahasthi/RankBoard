/**
 * Password validation utility for College DSA RankBoard
 *
 * Requirements:
 * 1. Minimum 8 characters (8 or more characters, no arbitrary maximum length)
 * 2. At least one uppercase letter (A-Z)
 * 3. At least one number (0-9)
 * 4. At least one special character (@, #, $, %, !, &, etc.)
 *
 * Whitespace is preserved without silent modification.
 */

export const VALIDATION_MESSAGES = {
  MIN_LENGTH: 'Password must contain at least 8 characters.',
  UPPERCASE: 'Password must contain at least one uppercase letter.',
  NUMBER: 'Password must contain at least one number.',
  SPECIAL: 'Password must contain at least one special character.',
};

// Matches any special symbol (punctuation / symbols, excluding standard whitespace and alphanumeric)
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;

/**
 * Validates a password against the 4 core security conditions.
 *
 * @param {string} password - The raw password input
 * @returns {{
 *   isValid: boolean,
 *   error: string | null,
 *   errors: string[],
 *   criteria: {
 *     minLength: boolean,
 *     hasUppercase: boolean,
 *     hasNumber: boolean,
 *     hasSpecial: boolean
 *   }
 * }}
 */
export function validatePassword(password) {
  const pwd = typeof password === 'string' ? password : '';

  const criteria = {
    minLength: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: SPECIAL_CHAR_REGEX.test(pwd),
  };

  const errors = [];
  if (!criteria.minLength) {
    errors.push(VALIDATION_MESSAGES.MIN_LENGTH);
  }
  if (!criteria.hasUppercase) {
    errors.push(VALIDATION_MESSAGES.UPPERCASE);
  }
  if (!criteria.hasNumber) {
    errors.push(VALIDATION_MESSAGES.NUMBER);
  }
  if (!criteria.hasSpecial) {
    errors.push(VALIDATION_MESSAGES.SPECIAL);
  }

  return {
    isValid: errors.length === 0,
    // Primary single error to display without overwhelming the user
    error: errors.length > 0 ? errors[0] : null,
    errors,
    criteria,
  };
}

export default validatePassword;
