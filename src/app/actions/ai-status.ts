"use server";

import { requireUser } from "@/lib/dal";
import { isSpeakingAiConfigured, isWritingAiConfigured } from "@/lib/env";

/**
 * Which AI scorers this deployment can actually use.
 *
 * The report screen waits for a band to appear, and a missing API key looks
 * exactly like a slow one: rows stay unscored, so it polls the whole schedule
 * and then offers a retry that cannot possibly succeed. A candidate is left
 * believing their answer failed when the server was never able to grade it.
 *
 * Booleans only — never the keys, the model name, or the endpoint. Behind
 * `requireUser` because the set of configured integrations is deployment
 * information, not something to hand to anonymous callers.
 */
export async function aiScoringStatus(): Promise<{ speaking: boolean; writing: boolean }> {
  await requireUser();
  return {
    speaking: isSpeakingAiConfigured(),
    writing: isWritingAiConfigured(),
  };
}
