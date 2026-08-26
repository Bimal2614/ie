/**
 * The attributes that ask a browser not to offer our audio as a file.
 *
 * Each one is a different vendor's version of the same request, which is why
 * they travel together:
 *
 *  - `controlsList="nodownload"` removes the Download entry from Chromium's
 *    built-in media menu (Chrome, Edge, Opera, Brave). Ignored elsewhere.
 *  - `disableRemotePlayback` and `x-webkit-airplay="deny"` drop the cast /
 *    AirPlay route, which is a second, quieter way for the stream to leave the
 *    page. React's types cover neither on `<audio>`, hence the spread.
 *
 * NONE OF THIS IS THE DEFENCE. A right-click still reaches "Save Audio As…" in
 * Firefox and Safari, so our players suppress the context menu and draw their
 * own controls rather than the browser's — and the recording itself is served
 * by a route that refuses anything but a media element on our own origin
 * (src/lib/protected-media.ts). These attributes are the cheap outermost layer:
 * they remove the one-click affordance where a browser honours them.
 */
export const NO_DOWNLOAD_MEDIA_ATTRS: Record<string, unknown> = {
  controlsList: "nodownload noplaybackrate noremoteplayback",
  disableRemotePlayback: true,
  "x-webkit-airplay": "deny",
};
