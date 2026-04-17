/**
 * Password Strength Validator
 * Enforces high-security password standards
 */

export interface PasswordStrength {
  score: number; // 0-100
  level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
  isValid: boolean; // Must meet minimum requirements
}

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  minUppercase: 1,
  minLowercase: 1,
  minNumbers: 1,
  minSymbols: 1,
};

/**
 * Validates password strength and returns feedback
 * Minimum requirements:
 * - 8+ characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 symbol (!@#$%^&*)
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      level: 'weak',
      feedback: ['Password is required'],
      isValid: false,
    };
  }

  // Check length
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) {
    score += 20;
  } else {
    feedback.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  // Check uppercase
  const uppercaseRegex = /[A-Z]/;
  if (uppercaseRegex.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least 1 uppercase letter (A-Z)');
  }

  // Check lowercase
  const lowercaseRegex = /[a-z]/;
  if (lowercaseRegex.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least 1 lowercase letter (a-z)');
  }

  // Check numbers
  const numberRegex = /[0-9]/;
  if (numberRegex.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least 1 number (0-9)');
  }

  // Check symbols
  const symbolRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;
  if (symbolRegex.test(password)) {
    score += 20;
  } else {
    feedback.push('Add at least 1 symbol (!@#$%^&* etc)');
  }

  // Length bonus (bonus points for very long passwords)
  if (password.length >= 16) {
    score = Math.min(100, score + 10);
  }

  // Determine level
  let level: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  if (score >= 90) {
    level = 'very-strong';
  } else if (score >= 75) {
    level = 'strong';
  } else if (score >= 60) {
    level = 'good';
  } else if (score >= 40) {
    level = 'fair';
  } else {
    level = 'weak';
  }

  // Check if valid (all requirements met)
  const isValid =
    password.length >= PASSWORD_REQUIREMENTS.minLength &&
    uppercaseRegex.test(password) &&
    lowercaseRegex.test(password) &&
    numberRegex.test(password) &&
    symbolRegex.test(password);

  return {
    score,
    level,
    feedback,
    isValid,
  };
}

/**
 * Get password strength color for UI display
 */
export function getStrengthColor(level: PasswordStrength['level']): string {
  switch (level) {
    case 'very-strong':
      return '#22c55e'; // green
    case 'strong':
      return '#84cc16'; // lime
    case 'good':
      return '#eab308'; // yellow
    case 'fair':
      return '#f97316'; // orange
    case 'weak':
      return '#ef4444'; // red
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get password strength label for UI display
 */
export function getStrengthLabel(level: PasswordStrength['level']): string {
  const labels: Record<PasswordStrength['level'], string> = {
    'very-strong': 'Very Strong',
    strong: 'Strong',
    good: 'Good',
    fair: 'Fair',
    weak: 'Weak',
  };
  return labels[level];
}
