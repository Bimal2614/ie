import { z } from "zod";

import { isValidStoredPhone } from "@/lib/phone";

/**
 * Server-side input validation. Every Server Action re-validates with these —
 * client checks are UX only and are never trusted.
 */

const password = z
  .string()
  .min(6, "Use at least 6 characters")
  .max(128, "Password is too long");

/**
 * Phone number. The form posts one already-combined value (the country
 * <select> and the national-number input are joined client-side by
 * `PhoneField` into `+91-9904529857`), and this re-checks it against
 * libphonenumber's rules — the client is UX, this is the gate. No country hint
 * is needed, because the calling code is part of the string.
 *
 * There is no SMS verification yet; when OTP lands it verifies ownership of a
 * number this has already established is real and mobile.
 */
const phone = z
  .string()
  .trim()
  .max(24, "Phone number is too long")
  .refine(isValidStoredPhone, "Enter a valid mobile number");

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  phone,
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
  phone,
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

/** The app-shell prompt shown to Google accounts that arrived without a number. */
export const phoneSchema = z.object({ phone });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Missing reset token").max(512),
  newPassword: password,
});

/* ------------------------------------------------------------------ *
 * Partners
 *
 * Two forms, both filled in by someone other than the person the account is
 * for: an admin onboarding a class, and a class enrolling a student. The
 * account holder is not there to correct a typo in their own email, so these
 * validate exactly as hard as the public signup form does.
 * ------------------------------------------------------------------ */

/**
 * A website as a class would type it — "ildsclasses.com", rarely with a scheme.
 * Stored with one, because a link rendered without it resolves relative to our
 * own domain and quietly 404s.
 */
const website = z
  .string()
  .trim()
  .max(200, "That web address is too long")
  .transform((v) => (v === "" ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i.test(v), "Enter a valid web address")
  .nullable();

export const createPartnerSchema = z.object({
  name: z.string().trim().min(2, "Name the class").max(120),
  location: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  website: website.optional().default(null),
  /** Who holds the credentials — a desk, not necessarily a person. */
  loginName: z.string().trim().min(2, "Name the login").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  phone: z
    .string()
    .trim()
    .max(24)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || isValidStoredPhone(v), "Enter a valid mobile number"),
  password,
});
export type CreatePartnerInputRaw = z.input<typeof createPartnerSchema>;

export const editPartnerSchema = createPartnerSchema.pick({
  name: true,
  location: true,
  website: true,
});

/** A class enrolling a student: the signup form, filled in by somebody else. */
export const enrolStudentSchema = z.object({
  name: z.string().trim().min(2, "Enter the student's name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  phone,
  password,
  targetModule: z.enum(["academic", "general"]).default("academic"),
  targetBand: z
    .string()
    .trim()
    .max(4)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type EnrolStudentInput = z.input<typeof enrolStudentSchema>;

/**
 * A coupon: a wholesale rate with a name. Nobody types the code into the app —
 * it is generated here and shown to the partner — so this validates what an
 * admin creates, not what a visitor submits.
 */
export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "At least 3 characters")
    .max(24)
    .regex(/^[A-Z0-9-]+$/, "Letters, numbers and hyphens only"),
  /**
   * Capped at 90, not 99. A free account is an admin grant, which the students
   * screen already does properly, and Razorpay refuses an order of zero — so a
   * 100% coupon would fail at the checkout rather than here, which is far too
   * late to explain it.
   */
  percent: z.coerce.number().int().min(1, "At least 1%").max(90, "90% is the maximum"),
  /** yyyy-mm-dd from a date input; empty means "until we turn it off". */
  endsAt: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((v) => (v ? v : null)),
  note: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type CouponInput = z.input<typeof couponSchema>;
