import { validatePassword, VALIDATION_MESSAGES } from './passwordValidator.js';

export function runPasswordValidatorTests() {
  const testCases = [
    {
      input: 'Siva@12',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.MIN_LENGTH,
      description: 'Reject: fewer than 8 characters',
    },
    {
      input: 'Siva@123',
      expectedValid: true,
      expectedError: null,
      description: 'Passes all four stated requirements (8 chars)',
    },
    {
      input: 'sivapass@123',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.UPPERCASE,
      description: 'Reject: no uppercase letter',
    },
    {
      input: 'SivaPassword@',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.NUMBER,
      description: 'Reject: no number',
    },
    {
      input: 'SivaPassword123',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.SPECIAL,
      description: 'Reject: no special character',
    },
    {
      input: 'SivaPassword@123456789',
      expectedValid: true,
      expectedError: null,
      description: 'Passes all four stated requirements (>8 chars)',
    },
    {
      input: '1234567',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.MIN_LENGTH,
      description: 'Reject: 7-character password',
    },
    {
      input: 'Abcdefg1',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.SPECIAL,
      description: 'Reject: 8 chars without special character',
    },
    {
      input: 'Abcdef!@',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.NUMBER,
      description: 'Reject: 8 chars without number',
    },
    {
      input: 'abcdef1!',
      expectedValid: false,
      expectedError: VALIDATION_MESSAGES.UPPERCASE,
      description: 'Reject: 8 chars without uppercase',
    },
    {
      input: 'Siva Pass@123',
      expectedValid: true,
      expectedError: null,
      description: 'Preserves whitespace and validates correctly',
    },
  ];

  const results = [];
  let allPassed = true;

  for (const tc of testCases) {
    const res = validatePassword(tc.input);
    const passed = res.isValid === tc.expectedValid && res.error === tc.expectedError;
    if (!passed) allPassed = false;
    results.push({
      ...tc,
      actualValid: res.isValid,
      actualError: res.error,
      passed,
    });
  }

  return { allPassed, results };
}
