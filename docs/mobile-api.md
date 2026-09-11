# IELTSVega Mobile API (`/api/v1`)

The JSON API behind the Flutter app. It runs inside this same Next.js app and
reuses the same business logic the website does — there is no second backend and
no second copy of a grading rule, a plan gate or a lockout ladder.

The machine-readable contract is at **`/api/v1/openapi`** (snapshot it with
`npm run api:spec`). Point the Flutter repo's code generator at it.

## The two rules everything else follows

**1. One policy, two front doors.** Anything a candidate can do lives in a
function that takes an already-authenticated user and returns a result. The
website's Server Action renders that result as form state; the route handler
renders it as JSON. Neither owns the policy, so the two cannot drift.

**2. The client never states a fact the server can check.** Answers go up, bands
come back. A tier comes from the store, not the app. A mock module's clock comes
from the server, not the handset.

## Authentication

`Authorization: Bearer <token>`, from `/api/v1/auth/{login,signup,google}`.

Tokens are the same opaque, revocable, hashed-at-rest session tokens the website
puts in a cookie — same table, same expiries, same revocation. Only the
transport differs.

Send **`X-Client-Platform: ios`** or **`android`** on every request. Sessions are
single-occupancy *per client*, so without this header the app's session counts
as a web one and evicts the candidate's browser session (and vice versa,
forever).

Store the token in the platform keychain (`flutter_secure_storage`), never in
shared preferences. It is returned once and only its SHA-256 hash is kept.

Call `GET /api/v1/auth/session` on cold start and on resume: it validates the
token, slides the 7-day idle window forward, and returns anything that changed
while the app was away.

## The envelope

```jsonc
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "...", "message": "...", "fields": {}, "retryAfterSec": 0, "plan": {} } }
```

Branch on `ok` and then on `error.code` — not on the HTTP status, which is a
coarser view of the same information. `message` is always safe to show a user.

| code | what the app should do |
| --- | --- |
| `unauthenticated` | clear the keychain, show sign-in |
| `plan_required` | render the paywall from `error.plan` |
| `validation_failed` | mark the inputs named in `error.fields` |
| `rate_limited` | back off by `error.retryAfterSec` |
| `service_unavailable` | retry the same request unchanged |
| `conflict` | a state problem — show the message, do not re-prompt |

## Things that will bite if skipped

**AI scores arrive later.** Submit returns `band: null` for Writing and
Speaking. If `subjective > 0`, poll `GET /api/v1/attempts/{id}/score` — every 3s
for the first half-minute, then every 10s, giving up at two minutes. `status:
"unavailable"` will never resolve; stop and say so.

**Speaking audio must be 16 kHz mono PCM WAV.** Flutter's `record` package
produces this natively on both platforms, and it is already the format the
scorer wants — so the server stores it as sent and never spawns ffmpeg. Any
other format is refused. Post it as multipart `audio` to
`/api/v1/practice/recording`.

**Mock timing is the server's.** Render countdowns from `endsAt` /
`remainingSeconds`, never from `DateTime.now()`. Autosave to
`PUT .../progress` every ~15s — a phone gets backgrounded and killed, and that
endpoint is the difference between resuming a paper and losing an hour of it.
On `advance`, render what comes back; do not assume `fromIndex + 1`.

**Media needs the bearer header.** Audio and images are proxied through our own
routes (never presigned, so there is no shareable sessionless link). `just_audio`
and friends accept custom headers — pass the token.

## Payments

Apple and Google require their own purchase flow for digital subscriptions, so
Razorpay Checkout cannot be used in the app.

1. `GET /api/v1/billing/plans` → product ids for this platform. Gate buttons on
   `purchasable`, and hide them entirely when `alreadySubscribed` — a plan bought
   on the website counts.
2. Show the **store's** price from `ProductDetails`/`SKProduct`. `listPrice` in
   our response is a fallback only; store price tiers vary by storefront.
3. Complete the purchase with `in_app_purchase`.
4. `POST /api/v1/billing/iap/verify` with the Apple `transactionId` or the Play
   `purchaseToken`.
5. **Only then** finish/acknowledge the transaction with the store. An
   unacknowledged Play purchase is auto-refunded after three days.

Call verify again on "restore purchases" — it is idempotent. Renewals arrive on
their own via the store webhooks (`/api/webhooks/apple`, `/api/webhooks/google`).

One store subscription belongs to one account, permanently: the first account to
verify a receipt owns it, and a second account verifying the same receipt is
refused. Without that, one payment would buy unlimited Premium accounts.

## Configuration

See `.env.example`. Beyond what the website already needs:

- `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` — native sign-in.
- `APPLE_*` (issuer, key id, .p8 key, bundle id, environment) — App Store
  verification.
- `GOOGLE_PLAY_*` (package name, service account email + key) — Play
  verification. The service account needs **View financial data** granted in the
  Play Console, not just project access.
- `APPLE_IAP_PRODUCT_*`, `GOOGLE_IAP_PRODUCT_*` — product id per tier.

All optional: unset simply means that feature is off rather than broken.
