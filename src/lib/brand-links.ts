/**
 * Every off-site profile the brand owns, in one list.
 *
 * WHY ONE FILE. These URLs are needed in three unrelated places — the footer's
 * social row, the `sameAs` array on the Organization JSON-LD, and the
 * verification links you paste into each platform's profile field. When they
 * were going to live inline in each, the footer and the schema would drift and
 * `sameAs` is only worth anything to Google when it round-trips: the profile it
 * names must link back to the site.
 *
 * WHAT `sameAs` DOES. It is the mechanism that ties five scattered profiles to
 * one entity, which is what earns a knowledge panel and what stops a search for
 * "IELTSVega" returning someone else's account first. It is not a ranking factor
 * on its own — it is entity disambiguation.
 *
 * ── ACTION REQUIRED ─────────────────────────────────────────────────────────
 * `instagram` is confirmed. The other four are the handle `ieltsvega` on each
 * platform, which is the right shape but NOT yet verified as yours. Before this
 * ships to production:
 *   1. Claim (or confirm) each handle below.
 *   2. Correct any URL whose real handle differs — LinkedIn company pages in
 *      particular are often `/company/ielts-vega` or carry a numeric suffix.
 *   3. Put https://www.ieltsvega.com in the website field of every profile, so
 *      the sameAs link is reciprocal.
 *   4. Delete the entry for anything you decide not to run. A `sameAs` pointing
 *      at a 404 is worse than no `sameAs` — it weakens the whole entity claim.
 * ────────────────────────────────────────────────────────────────────────────
 */

export type SocialProfile = {
  /** Display name, used as the accessible label on the footer link. */
  readonly name: string;
  readonly url: string;
  /** The handle without the @, for copy like "follow @ieltsvega". */
  readonly handle: string;
  /**
   * False until the profile is claimed and links back here. Unverified entries
   * are still rendered in the footer (so the links exist for the audit) but are
   * held out of `sameAs` — see SAME_AS below.
   */
  readonly verified: boolean;
};

export const SOCIAL_PROFILES: readonly SocialProfile[] = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/ieltsvega/",
    handle: "ieltsvega",
    verified: true,
  },
  {
    name: "X",
    url: "https://x.com/ieltsvega",
    handle: "ieltsvega",
    verified: false,
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/ieltsvega",
    handle: "ieltsvega",
    verified: false,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/ieltsvega",
    handle: "ieltsvega",
    verified: false,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/@ieltsvega",
    handle: "ieltsvega",
    verified: false,
  },
] as const;

/**
 * The array handed to Organization.sameAs.
 *
 * Only verified profiles go in. Google follows every sameAs URL; one that 404s
 * or resolves to an unrelated account tells it the entity claim is unreliable,
 * and it discounts the rest of the list with it. Flip `verified: true` above as
 * you claim each handle and it joins automatically — no second edit here.
 */
export const SAME_AS: readonly string[] = SOCIAL_PROFILES.filter((p) => p.verified).map(
  (p) => p.url,
);

/** Where support email goes. Also the Organization contactPoint. */
export const SUPPORT_EMAIL = "hello@ieltsvega.com";
