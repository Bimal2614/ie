import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Liveness for the outside uptime monitor (the separate ielts-uptime project).
 *
 * WHY IT TOUCHES THE DATABASE. Static pages keep answering 200 while Neon or an
 * env var is broken, and every dynamic page 500s — so a homepage check alone
 * says "up" through the outage that matters most. One `select 1` is the
 * cheapest thing that fails the same way the real pages do.
 *
 * Public and content-free on purpose: it says up or down and how long the
 * database took, nothing else. Never cached, or the monitor would be reading
 * the CDN's memory of a healthy minute.
 */
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 5_000;

export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timed out")), DB_TIMEOUT_MS)),
    ]);
    return NextResponse.json(
      { ok: true, db: "ok", dbMs: Date.now() - started, commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[health] database check failed", e);
    return NextResponse.json(
      // The reason stays in the log: a driver error can name the database host.
      { ok: false, db: "error", dbMs: Date.now() - started },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
