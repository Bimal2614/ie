"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLog, coupons, partners, users } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-errors";
import { env } from "@/lib/env";
import { RESERVED_SUBDOMAINS, isAllowedSubdomain, isHexColor } from "@/lib/partner-brand";
import {
  attachSubdomain,
  detachSubdomain,
  domainStatus,
  type DomainResult,
} from "@/lib/partner-domains";
import { putObject } from "@/lib/speech/s3";
import { requireAdmin } from "@/lib/dal";
import {
  createPartnerWithLogin,
  setPartnerStatus,
  setPasswordFor,
  updatePartner,
} from "@/lib/partners";
import { couponSchema, createPartnerSchema, editPartnerSchema } from "@/lib/validation";

/**
 * Onboarding an institution — our side of the partnership.
 *
 * Every action here is admin-only and says so in its first line. They are thin
 * on purpose: the writes themselves live in src/lib/partners.ts, so the two
 * rows that make a partner (the class and its login) are always created
 * together, in one transaction, from one place.
 */

export type AdminPartnerResult =
  | { ok: true; partnerId?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/**
 * Create a class and the single login we hand over with it.
 *
 * THE PASSWORD IS CHOSEN HERE AND SPOKEN ONCE. It is hashed with bcrypt on the
 * way in, exactly like a candidate's, so this screen is the last time anyone —
 * us included — can read it. If it is lost, it is reset, not recovered.
 */
export async function createPartnerAction(input: unknown): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();

  const parsed = createPartnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const result = await createPartnerWithLogin(parsed.data);
  if (!result.ok) {
    return {
      ok: false,
      fieldErrors: { email: ["That email already has an account. Use another for the login."] },
    };
  }

  await db.insert(auditLog).values({
    userId: admin.id,
    event: "partner.created",
    metadata: { partnerId: result.partnerId, name: parsed.data.name },
  });

  revalidatePath("/admin/partners");
  return { ok: true, partnerId: result.partnerId };
}

/** Edit the class's own details. Its login and status change separately. */
export async function updatePartnerAction(
  partnerId: string,
  input: unknown,
): Promise<AdminPartnerResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { ok: false, error: "That request wasn't valid." };

  const parsed = editPartnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  await updatePartner(partnerId, parsed.data);
  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}

/**
 * Suspend a class, or bring it back.
 *
 * SUSPENDING TAKES NOTHING AWAY FROM THE STUDENTS. Their plans run exactly as
 * long as they were paid for; what stops is the class's ability to enrol anyone
 * new or pay for anyone. Revoking students' access would be refunding ourselves
 * with their study time.
 */
export async function setPartnerStatusAction(
  partnerId: string,
  status: "active" | "suspended",
): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { ok: false, error: "That request wasn't valid." };
  if (status !== "active" && status !== "suspended") {
    return { ok: false, error: "That request wasn't valid." };
  }

  await setPartnerStatus(partnerId, status);
  await db.insert(auditLog).values({
    userId: admin.id,
    event: status === "suspended" ? "partner.suspended" : "partner.reactivated",
    metadata: { partnerId },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}

const resetLoginSchema = z.object({
  loginUserId: z.uuid(),
  password: z.string().min(6, "Use at least 6 characters").max(128),
});

/**
 * Rotate a class's password — after onboarding, or when they lose it.
 *
 * The target is re-read and checked to be a `partner` row before anything is
 * written: a user id in an argument is a claim, and without this check the
 * admin screen would be a way to set any account's password, our own included.
 */
export async function resetPartnerLoginPassword(input: unknown): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();

  const parsed = resetLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Use a password of at least 6 characters." };
  const { loginUserId, password } = parsed.data;

  const [login] = await db
    .select({ id: users.id, partnerId: users.partnerId })
    .from(users)
    .where(and(eq(users.id, loginUserId), eq(users.role, "partner")))
    .limit(1);
  if (!login) return { ok: false, error: "That login no longer exists." };

  await setPasswordFor(loginUserId, password);
  await db.insert(auditLog).values({
    userId: admin.id,
    event: "partner.password_reset",
    metadata: { partnerId: login.partnerId, loginUserId },
  });

  if (login.partnerId) revalidatePath(`/admin/partners/${login.partnerId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Coupons
 * ------------------------------------------------------------------ */

/** Create a rate. The code is ours to invent; nobody ever types it in. */
export async function createCouponAction(input: unknown): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();

  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  const { code, amountInr, amountUsd, endsAt, note } = parsed.data;
  const amountInrCents = amountInr * 100;
  const amountUsdCents = amountUsd === null ? null : amountUsd * 100;

  try {
    await db.insert(coupons).values({
      code,
      amountInrCents,
      amountUsdCents,
      endsAt: endsAt ? new Date(`${endsAt}T23:59:59Z`) : null,
      note,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { ok: false, fieldErrors: { code: ["That code already exists."] } };
    }
    throw err;
  }

  await db.insert(auditLog).values({
    userId: admin.id,
    event: "coupon.created",
    metadata: { code, amountInrCents, amountUsdCents },
  });

  revalidatePath("/admin/coupons");
  return { ok: true };
}

/**
 * Turn a coupon on or off.
 *
 * DEACTIVATING CHANGES NOTHING ALREADY SOLD. Every seat bought under it keeps
 * the price it was bought at — `partner_payments` froze both the list price and
 * the rate at the sale — and every class holding the coupon simply goes back to
 * list price on its next order.
 */
export async function setCouponStatusAction(
  couponId: string,
  status: "active" | "inactive",
): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(couponId).success) return { ok: false, error: "That request wasn't valid." };
  if (status !== "active" && status !== "inactive") {
    return { ok: false, error: "That request wasn't valid." };
  }

  await db
    .update(coupons)
    .set({ status, updatedAt: new Date() })
    .where(eq(coupons.id, couponId));

  await db.insert(auditLog).values({
    userId: admin.id,
    event: status === "active" ? "coupon.activated" : "coupon.deactivated",
    metadata: { couponId },
  });

  revalidatePath("/admin/coupons");
  return { ok: true };
}

/** Put a class on a rate, or take it off one (`couponId: null`). */
export async function assignCouponAction(
  partnerId: string,
  couponId: string | null,
): Promise<AdminPartnerResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { ok: false, error: "That request wasn't valid." };
  if (couponId !== null && !z.uuid().safeParse(couponId).success) {
    return { ok: false, error: "That request wasn't valid." };
  }

  await db
    .update(partners)
    .set({ couponId, updatedAt: new Date() })
    .where(eq(partners.id, partnerId));

  await db.insert(auditLog).values({
    userId: admin.id,
    event: couponId ? "partner.coupon_assigned" : "partner.coupon_removed",
    metadata: { partnerId, couponId },
  });

  revalidatePath("/admin/partners");
  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * White label
 * ------------------------------------------------------------------ */

/** Logos are small marks, not photographs. */
const MAX_LOGO_BYTES = 512 * 1024;

/**
 * The image type a logo's bytes ACTUALLY are, from their magic number — never
 * from the filename or the browser's claim. SVG is deliberately absent: it is a
 * document that can carry script, and this file is served from our own origin.
 */
function sniffImage(bytes: Uint8Array): { ext: string; contentType: string } | null {
  const at = (i: number, ...b: number[]) => b.every((v, k) => bytes[i + k] === v);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return { ext: "png", contentType: "image/png" };
  if (at(0, 0xff, 0xd8, 0xff)) return { ext: "jpg", contentType: "image/jpeg" };
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}

export type BrandingResult =
  | { ok: true; domain: DomainResult | null }
  | { ok: false; error: string };

/**
 * Save a class's white label: subdomain, logo, tagline, colours. Every field is
 * optional, and an empty one clears that piece back to the IELTSVega default.
 *
 * A FormData rather than an object because the logo travels with it. The row
 * is written first and the domain wired second: a Vercel or Hostinger outage
 * must not lose what the admin typed, and the wiring is safe to retry.
 */
export async function savePartnerBrandingAction(
  partnerId: string,
  form: FormData,
): Promise<BrandingResult> {
  const admin = await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { ok: false, error: "That request wasn't valid." };

  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const subdomain = text("subdomain")?.toLowerCase() ?? null;
  const tagline = text("tagline");
  const brandColor = text("brandColor")?.toLowerCase() ?? null;
  const brandTextColor = text("brandTextColor")?.toLowerCase() ?? null;

  if (subdomain && RESERVED_SUBDOMAINS.has(subdomain)) {
    return { ok: false, error: `"${subdomain}" is kept for IELTSVega's own use. Pick another name, such as "${subdomain}class".` };
  }
  if (subdomain && !isAllowedSubdomain(subdomain)) {
    return {
      ok: false,
      error: "Use 2–40 lowercase letters, numbers or hyphens for the subdomain, starting with a letter or number.",
    };
  }
  if (tagline && tagline.length > 120) return { ok: false, error: "Keep the tagline under 120 characters." };
  if (brandColor && !isHexColor(brandColor)) return { ok: false, error: "The brand colour must look like #1a2b3c." };
  if (brandTextColor && !isHexColor(brandTextColor)) {
    return { ok: false, error: "The text colour must look like #1a2b3c." };
  }

  const [current] = await db
    .select({ subdomain: partners.subdomain, logoKey: partners.logoKey })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (!current) return { ok: false, error: "That partner no longer exists." };

  let logoKey = form.get("removeLogo") === "1" ? null : current.logoKey;
  const logo = form.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) return { ok: false, error: "The logo must be under 512 KB." };
    const bytes = new Uint8Array(await logo.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return { ok: false, error: "Upload the logo as a PNG, JPG or WebP." };
    const key = `${env.S3_FOLDER_PREFIX ?? ""}partner-logos/${partnerId}/${randomUUID()}.${kind.ext}`;
    if (!(await putObject(key, bytes, kind.contentType))) {
      return { ok: false, error: "The logo couldn't be stored. Check the S3 settings and try again." };
    }
    logoKey = key;
  }

  try {
    await db
      .update(partners)
      .set({ subdomain, tagline, brandColor, brandTextColor, logoKey, updatedAt: new Date() })
      .where(eq(partners.id, partnerId));
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "Another class already has that subdomain." };
    throw err;
  }

  await db.insert(auditLog).values({
    userId: admin.id,
    event: "partner.branding_updated",
    metadata: { partnerId, subdomain, previousSubdomain: current.subdomain, logoChanged: logoKey !== current.logoKey },
  });

  // A rename frees the old name — on Vercel and in DNS — before taking the new.
  if (current.subdomain && current.subdomain !== subdomain) await detachSubdomain(current.subdomain);
  const domain = subdomain ? await attachSubdomain(subdomain) : null;

  revalidatePath(`/admin/partners/${partnerId}`);
  return { ok: true, domain };
}

/** Re-check a subdomain, or retry wiring it up when it is missing. */
export async function checkPartnerDomainAction(partnerId: string): Promise<BrandingResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(partnerId).success) return { ok: false, error: "That request wasn't valid." };
  const [row] = await db
    .select({ subdomain: partners.subdomain })
    .from(partners)
    .where(eq(partners.id, partnerId))
    .limit(1);
  if (!row?.subdomain) return { ok: true, domain: null };
  const status = await domainStatus(row.subdomain);
  return { ok: true, domain: status.state === "missing" ? await attachSubdomain(row.subdomain) : status };
}
