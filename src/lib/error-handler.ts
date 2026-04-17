/**
 * Structured Error Handling & Logging
 * Provides consistent error handling across the app
 */

export interface ApiErrorDetails {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * Custom API Error class for structured error handling
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  toJSON(): ApiErrorDetails {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Logger with different severity levels
 * Can be extended to send to external service
 */
export const logger = {
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data);
    }
  },

  info: (message: string, data?: unknown) => {
    console.info(`[INFO] ${message}`, data);
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data);
  },

  error: (message: string, error?: unknown, context?: unknown) => {
    console.error(`[ERROR] ${message}`);
    if (error instanceof Error) {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    } else if (error) {
      console.error('Details:', error);
    }
    if (context) {
      console.error('Context:', context);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendToSentry(error, context)
    }
  },
};

/**
 * Format error for user display
 * Hides sensitive backend details
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    // Map specific error codes to user-friendly messages
    const messageMap: Record<string, string> = {
      'INVALID_CREDENTIALS': 'Invalid email or password',
      'EMAIL_EXISTS': 'This email is already registered',
      'INVALID_EMAIL': 'Invalid email format',
      'INVALID_URL': 'Invalid website URL',
      'SCAN_FAILED': 'Scan failed. Please try again.',
      'UNAUTHORIZED': 'Your session has expired. Please log in again.',
      'FORBIDDEN': 'You do not have permission to perform this action',
      'NOT_FOUND': 'The requested resource was not found',
      'INTERNAL_ERROR': 'Something went wrong. Please try again.',
    };

    return messageMap[error.code] || error.message || 'An error occurred';
  }

  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred';
  }

  return 'An unexpected error occurred. Please try again.';
}
