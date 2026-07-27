import { z } from "zod";

/**
 * Server-side input validation. Every Server Action re-validates with these —
 * client checks are UX only and are never trusted.
 */

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number")
  .regex(/[^A-Za-z0-9]/, "Add a symbol");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password,
  targetModule: z.enum(["academic", "general"]).default("academic"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Shape returned by auth actions to `useActionState`. */
export type AuthFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

/* ------------------------------------------------------------------ *
 * Settings — profile + password change
 * ------------------------------------------------------------------ */

export const TARGET_BANDS = [
  "4.0", "4.5", "5.0", "5.5", "6.0", "6.5", "7.0", "7.5", "8.0", "8.5", "9.0",
] as const;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  country: z.string().trim().max(60).optional(),
  targetModule: z.enum(["academic", "general"]),
  targetBand: z.string().trim().max(4).optional(),
  // yyyy-mm-dd from a native date input; empty string means "cleared".
  examDate: z.string().trim().max(10).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(128),
  newPassword: password,
});
