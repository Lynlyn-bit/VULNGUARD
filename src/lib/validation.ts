import { z } from 'zod';

/**
 * Shared validation schemas using Zod
 * Ensures consistent validation across frontend and backend
 */

// Email validation
export const EmailSchema = z
  .string()
  .email('Invalid email format')
  .max(255, 'Email is too long');

// Password validation - min 8 chars, 1 uppercase, 1 number, 1 special char
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Simple password for signup without special chars
export const SimplePasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

// URL validation - accepts domains and full URLs
export const URLSchema = z
  .string()
  .min(1, 'URL is required')
  .refine(
    (val) => {
      try {
        const url = new URL(val.startsWith('http') ? val : `https://${val}`);
        return url.hostname.includes('.');
      } catch {
        return false;
      }
    },
    'Invalid URL format (e.g., example.com or https://example.com)'
  );

// Auth schemas
export const SignupSchema = z.object({
  email: EmailSchema,
  password: SimplePasswordSchema,
  firstName: z.string().optional().default(''),
  lastName: z.string().optional().default(''),
});

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Scan schemas
export const ScanUrlSchema = z.object({
  url: URLSchema,
});

// Profile schemas
export const ProfileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: PasswordSchema.optional(),
});

// Export types for TypeScript
export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ScanUrlInput = z.infer<typeof ScanUrlSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;

/**
 * Validate data and return typed result
 */
export function validateData<T>(
  schema: z.ZodSchema,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated as T };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Get first validation error message
 */
export function getFirstValidationError(error: z.ZodError): string {
  const firstIssue = error.issues[0];
  const fieldName = firstIssue.path.join('.');
  const message = firstIssue.message;
  return fieldName ? `${fieldName}: ${message}` : message;
}
