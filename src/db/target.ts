import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Which database a content script writes to.
 *
 * Every one of these scripts needs the same three things — pick local or
 * staging from a `--staging` flag, fail loudly if that URL is missing, and
 * require SSL for the remote one. `build-mock-tests.ts` had it inline and the
 * other two had no staging support at all, so a content push to staging meant
 * editing DATABASE_URL by hand and hoping to remember to put it back.
 *
 * Keeping it here means the three scripts cannot drift into disagreeing about
 * which database "staging" is, which is the kind of difference nobody notices
 * until a book lands in the wrong place.
 */
export function resolveTarget(argv: string[] = process.argv) {
  const staging = argv.includes("--staging");
  const url = staging ? process.env.STAGING_DATABASE_URL : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      staging
        ? "STAGING_DATABASE_URL is not set — add it to .env.local."
        : "DATABASE_URL is not set — add it to .env.local.",
    );
  }
  return {
    url,
    /** Neon requires TLS; a local socket does not offer it. */
    ssl: (staging ? "require" : false) as "require" | false,
    label: staging ? "staging" : "local",
    staging,
  };
}

/**
 * The positional argument, ignoring flags.
 *
 * `npm run db:import -- forecast-general --staging` must not read "--staging"
 * as the book folder to import.
 */
export function positional(argv: string[] = process.argv): string | undefined {
  return argv.slice(2).find((a) => !a.startsWith("--"));
}
