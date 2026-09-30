import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * The receipt an institution downloads after paying for a student's term.
 *
 * PURE. Nothing here touches the database or the session: it takes a `Receipt`
 * — assembled and access-checked in src/lib/payments/receipt.ts — and returns
 * the bytes. That split is what makes the layout something you can render from
 * a script with a hand-written object when you are changing the wording.
 *
 * WHY THE AMOUNTS READ "INR 1,299.00" AND NOT "₹1,299.00". pdf-lib's built-in
 * Helvetica is a standard PDF font, and standard fonts are WinAnsi-encoded:
 * that character set predates the rupee sign (U+20B9, 2010) and simply has no
 * slot for it — `drawText` THROWS rather than dropping it. The alternatives are
 * embedding a Unicode font, which means shipping ~450KB of TTF into the
 * serverless bundle for one glyph, or naming the currency by its ISO code the
 * way every cross-border invoice already does. So the web UI keeps ₹ (see
 * `formatPrice` in lib/plans.ts) and the PDF says INR.
 *
 * Everything drawn passes through `winAnsi` first for the same reason: an
 * institution whose trading name carries a Devanagari character, a curly
 * apostrophe pasted out of Word, or an em dash would otherwise not produce a
 * worse-looking receipt — it would produce a 500 at the moment someone tries to
 * download proof that they paid us.
 */

export type ReceiptLine = {
  label: string;
  /** Minor units. Negative for a discount. */
  amountCents: number;
};

export type Receipt = {
  /** Human-facing reference, stable for a given payment. */
  number: string;
  paidAt: Date;
  seller: {
    name: string;
    email: string;
    site: string;
    cin: string | null;
    gstin: string | null;
  };
  /** The payer: the institution, and the login that pressed the button. */
  billedTo: {
    name: string;
    location: string | null;
    payerName: string | null;
    payerEmail: string | null;
  };
  /** Who the seat was bought for. Not the payer. */
  student: { name: string; email: string };
  item: {
    planLabel: string;
    months: number;
    /** When the term this payment bought runs out; null when open-ended. */
    accessUntil: Date | null;
  };
  currency: string;
  lines: ReceiptLine[];
  totalCents: number;
  orderId: string;
  paymentId: string | null;
};

/* ------------------------------------------------------------------ *
 * Text that a standard PDF font can actually draw
 * ------------------------------------------------------------------ */

/** Typographic characters that have an honest ASCII equivalent. */
const FOLD: Record<string, string> = {
  "‘": "'", // left single quote
  "’": "'", // right single quote / apostrophe
  "“": '"', // left double quote
  "”": '"', // right double quote
  "–": "-", // en dash
  "—": "-", // em dash
  "•": "-", // bullet
  "…": "...", // ellipsis
  "₹": "INR ", // rupee sign - see the file header
};

/** The same set as `FOLD`, as one pass over the string. */
const FOLDABLE = /[‘’“”–—•…₹]/g;

/**
 * WinAnsi's printable range: ASCII, plus the Latin-1 supplement. The 0x80–0x9F
 * band holds the typographic characters folded above, so anything still in it
 * after folding is a control code and goes.
 */
function encodable(code: number): boolean {
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa1 && code <= 0xff);
}

/** Drawable text, or "" — never something `drawText` will throw on. */
export function winAnsi(value: string): string {
  let out = "";
  // Whitespace first: a no-break space is not in WinAnsi's printable range, so
  // the loop below would DELETE it and run two words together. Every flavour of
  // space becomes a plain one before anything else looks at the string.
  const folded = value.replace(/\s/g, " ").replace(FOLDABLE, (m) => FOLD[m]);
  for (const ch of folded) {
    const code = ch.codePointAt(0)!;
    if (encodable(code)) out += ch;
    // A character outside the set is dropped rather than turned into "?": a
    // name rendered with gaps still reads, a name rendered as "????" does not.
  }
  return out.replace(/\s+/g, " ").trim();
}

/**
 * An amount as a receipt states it: the ISO code, then the figure, always to
 * two places. Indian digit grouping for INR — 1,03,920.00, not 103,920.00 —
 * because that is how the institution's own books will have it.
 */
export function money(cents: number, currency: string): string {
  const sign = cents < 0 ? "- " : "";
  const amount = Math.abs(cents) / 100;
  const grouped = amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // The sign sits outside the code, with a space: "- INR 259.80" reads as a
  // deduction, where "-INR 259.80" reads at a glance as a currency called -INR.
  return `${sign}${currency} ${grouped}`;
}

/** "14 Sept 2026", in UTC — the same day the rest of the panel shows. */
function day(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 56;
const RIGHT = A4.width - MARGIN;
/** Where the amount column ends. Everything numeric is right-aligned to it. */
const INK = rgb(0.09, 0.1, 0.13);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.85, 0.86, 0.88);

type Ctx = {
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
};

function text(
  ctx: Ctx,
  value: string,
  opts: { x: number; y: number; size?: number; bold?: boolean; color?: typeof INK; maxWidth?: number },
): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.regular;
  let safe = winAnsi(value);
  if (!safe) return;
  if (opts.maxWidth) safe = truncate(safe, font, size, opts.maxWidth);
  ctx.page.drawText(safe, { x: opts.x, y: opts.y, size, font, color: opts.color ?? INK });
}

/** Right-aligned at `x`. Used for every figure, so the column lines up. */
function textRight(
  ctx: Ctx,
  value: string,
  opts: { x: number; y: number; size?: number; bold?: boolean; color?: typeof INK },
): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.bold : ctx.regular;
  const safe = winAnsi(value);
  if (!safe) return;
  ctx.page.drawText(safe, {
    x: opts.x - font.widthOfTextAtSize(safe, size),
    y: opts.y,
    size,
    font,
    color: opts.color ?? INK,
  });
}

/** Cut to fit, with an ellipsis, rather than running into the next column. */
function truncate(value: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) return value;
  let cut = value;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}...`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut.trimEnd()}...`;
}

function rule(ctx: Ctx, y: number): void {
  ctx.page.drawLine({
    start: { x: MARGIN, y },
    end: { x: RIGHT, y },
    thickness: 0.75,
    color: LINE,
  });
}

/** A label above its value — the shape both header columns use. */
function field(ctx: Ctx, label: string, value: string, x: number, y: number, maxWidth: number): number {
  text(ctx, label.toUpperCase(), { x, y, size: 7.5, bold: true, color: MUTED });
  text(ctx, value, { x, y: y - 13, size: 10, maxWidth });
  return y - 13;
}

export async function renderReceiptPdf(receipt: Receipt): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${winAnsi(receipt.number)}`);
  doc.setSubject(`${winAnsi(receipt.item.planLabel)} for ${winAnsi(receipt.student.name)}`);
  doc.setProducer(receipt.seller.name);
  doc.setCreator(receipt.seller.name);

  const ctx: Ctx = {
    page: doc.addPage([A4.width, A4.height]),
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  let y = A4.height - MARGIN;

  /* ── Masthead ─────────────────────────────────────────────────────── */
  text(ctx, receipt.seller.name, { x: MARGIN, y: y - 6, size: 19, bold: true });
  textRight(ctx, "RECEIPT", { x: RIGHT, y: y - 4, size: 13, bold: true, color: MUTED });
  y -= 24;

  const sellerLines = [
    receipt.seller.site,
    receipt.seller.email,
    receipt.seller.cin ? `CIN ${receipt.seller.cin}` : null,
    receipt.seller.gstin ? `GSTIN ${receipt.seller.gstin}` : null,
  ].filter((v): v is string => Boolean(v));
  for (const line of sellerLines) {
    text(ctx, line, { x: MARGIN, y, size: 9, color: MUTED });
    y -= 12;
  }

  y -= 10;
  rule(ctx, y);
  y -= 26;

  /* ── Who paid, and the references ─────────────────────────────────── */
  const colRight = MARGIN + 300;
  const colWidth = 250;

  text(ctx, "BILLED TO", { x: MARGIN, y, size: 7.5, bold: true, color: MUTED });
  text(ctx, receipt.billedTo.name, { x: MARGIN, y: y - 14, size: 11, bold: true, maxWidth: 260 });
  let leftY = y - 14;
  for (const line of [
    receipt.billedTo.location,
    receipt.billedTo.payerName,
    receipt.billedTo.payerEmail,
  ].filter((v): v is string => Boolean(v))) {
    leftY -= 13;
    text(ctx, line, { x: MARGIN, y: leftY, size: 9.5, color: MUTED, maxWidth: 260 });
  }

  let rightY = field(ctx, "Receipt no.", receipt.number, colRight, y, colWidth);
  rightY = field(ctx, "Date paid", day(receipt.paidAt), colRight, rightY - 16, colWidth);
  rightY = field(ctx, "Payment ref.", receipt.paymentId ?? receipt.orderId, colRight, rightY - 16, colWidth);

  y = Math.min(leftY, rightY) - 30;

  /* ── Who it was bought for ────────────────────────────────────────── */
  text(ctx, "SEAT PURCHASED FOR", { x: MARGIN, y, size: 7.5, bold: true, color: MUTED });
  y -= 14;
  text(ctx, receipt.student.name, { x: MARGIN, y, size: 11, bold: true, maxWidth: 300 });
  // Stacked, not set beside the name: a long name and a long address side by
  // side is the one pairing that would collide, and this block has the room.
  y -= 13;
  text(ctx, receipt.student.email, { x: MARGIN, y, size: 9.5, color: MUTED, maxWidth: 300 });
  y -= 28;

  /* ── What it bought ───────────────────────────────────────────────── */
  rule(ctx, y);
  y -= 15;
  text(ctx, "DESCRIPTION", { x: MARGIN, y, size: 7.5, bold: true, color: MUTED });
  textRight(ctx, "AMOUNT", { x: RIGHT, y, size: 7.5, bold: true, color: MUTED });
  y -= 10;
  rule(ctx, y);
  y -= 22;

  for (const line of receipt.lines) {
    text(ctx, line.label, { x: MARGIN, y, size: 10, maxWidth: 340 });
    textRight(ctx, money(line.amountCents, receipt.currency), { x: RIGHT, y, size: 10 });
    y -= 18;
  }

  y -= 4;
  rule(ctx, y);
  y -= 20;
  text(ctx, "Total paid", { x: MARGIN, y, size: 11, bold: true });
  textRight(ctx, money(receipt.totalCents, receipt.currency), { x: RIGHT, y, size: 12, bold: true });
  y -= 18;
  rule(ctx, y);
  y -= 26;

  /* ── The term, and how it was paid ────────────────────────────────── */
  // The tier and its length are already in the description column, so this says
  // the one thing that is not there: the date the seat stops working.
  const access = receipt.item.accessUntil
    ? `Access for ${winAnsi(receipt.student.name)} runs to ${day(receipt.item.accessUntil)}.`
    : "Access has no end date.";
  text(ctx, access, { x: MARGIN, y, size: 9.5, color: MUTED, maxWidth: RIGHT - MARGIN });
  y -= 14;
  text(ctx, `Paid online through Razorpay. Reference ${receipt.orderId}.`, {
    x: MARGIN,
    y,
    size: 9.5,
    color: MUTED,
    maxWidth: RIGHT - MARGIN,
  });

  /* ── Foot ─────────────────────────────────────────────────────────── */
  const footY = MARGIN + 14;
  rule(ctx, footY + 20);
  text(ctx, "This is a computer-generated receipt and does not require a signature.", {
    x: MARGIN,
    y: footY,
    size: 8.5,
    color: MUTED,
  });
  textRight(ctx, receipt.number, { x: RIGHT, y: footY, size: 8.5, color: MUTED });

  return doc.save();
}
