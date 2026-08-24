/**
 * Renders a JSON-LD block.
 *
 * No nonce is applied on purpose. JSON-LD is data, not executable script, so the
 * CSP script-src directive does not gate it — and adding a nonce would make the
 * server and client markup differ (the browser blanks the attribute), producing a
 * hydration mismatch. Same reasoning as the inline blocks this replaced.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
