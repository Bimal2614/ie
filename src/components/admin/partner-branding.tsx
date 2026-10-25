"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, ImageUp, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";

import { checkPartnerDomainAction, savePartnerBrandingAction } from "@/app/actions/admin-partners";
import { LogoMark } from "@/components/ui/logo";
import type { DomainResult } from "@/lib/partner-domains";
import { isHexColor, readableOn } from "@/lib/partner-brand";
import { cn } from "@/lib/utils";

/**
 * A class's white label, edited by us at onboarding.
 *
 * EVERY FIELD IS OPTIONAL, and the preview shows exactly that: leave the logo
 * out and the IELTSVega mark stays; leave the colour out and the chrome stays
 * slate. The text colour has an "Auto" state — black or white, whichever reads
 * on the chosen colour — so picking a colour alone can never produce text
 * nobody can read; setting it by hand overrides that.
 */

const field =
  "h-9 w-full rounded-lg border border-line bg-paper-elev px-3 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50";
const label = "text-xs font-semibold uppercase tracking-wider text-ink-muted";

const STATE_COPY: Record<DomainResult["state"], { text: string; tone: string }> = {
  live: { text: "Live", tone: "bg-green-soft text-green-ink" },
  pending: { text: "Setting up", tone: "bg-warning-soft text-ink" },
  missing: { text: "Not connected", tone: "bg-danger-soft text-danger" },
  local: { text: "Local only", tone: "bg-paper-sunken text-ink-soft" },
  unmanaged: { text: "Manual setup", tone: "bg-paper-sunken text-ink-soft" },
};

export function PartnerBranding({
  partnerId,
  partnerName,
  rootDomain,
  siteUrl,
  initial,
}: {
  partnerId: string;
  partnerName: string;
  /** "ieltsvega.com", or "localhost" in dev. */
  rootDomain: string;
  /** Where the class's site opens, when it has a subdomain. */
  siteUrl: string | null;
  initial: {
    subdomain: string | null;
    tagline: string | null;
    brandColor: string | null;
    brandTextColor: string | null;
    logoUrl: string | null;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [domain, setDomain] = useState<DomainResult | null>(null);

  const [subdomain, setSubdomain] = useState(initial.subdomain ?? "");
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [color, setColor] = useState(initial.brandColor ?? "");
  const [textColor, setTextColor] = useState(initial.brandTextColor ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logoUrl);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validColor = isHexColor(color) ? color : null;
  const autoText = validColor ? readableOn(validColor) : null;
  const shownText = isHexColor(textColor) ? textColor : autoText;

  const save = () => {
    setError(null);
    setSaved(false);
    const form = new FormData();
    form.set("subdomain", subdomain);
    form.set("tagline", tagline);
    form.set("brandColor", color);
    form.set("brandTextColor", validColor ? textColor : "");
    if (removeLogo) form.set("removeLogo", "1");
    const file = fileRef.current?.files?.[0];
    if (file) form.set("logo", file);
    startTransition(async () => {
      const result = await savePartnerBrandingAction(partnerId, form);
      if (!result.ok) return setError(result.error);
      setSaved(true);
      setDomain(result.domain);
      if (fileRef.current) fileRef.current.value = "";
      setRemoveLogo(false);
    });
  };

  const check = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkPartnerDomainAction(partnerId);
      if (!result.ok) return setError(result.error);
      setDomain(result.domain);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-ink">White label</h2>
          <p className="mt-0.5 max-w-xl text-xs text-ink-muted">
            Everything here is optional. Whatever you set replaces IELTSVega&apos;s logo, name and
            colours for this class&apos;s students and panel. Whatever you leave empty stays IELTSVega.
          </p>
        </div>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            Open {siteUrl.replace(/^https?:\/\//, "")} <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <label className={cn(label, "block")}>
            Subdomain
            <div className="mt-1.5 flex items-center">
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="classx"
                maxLength={40}
                className={cn(field, "rounded-r-none")}
              />
              <span className="flex h-9 items-center rounded-r-lg border border-l-0 border-line bg-paper-sunken px-3 text-sm normal-case tracking-normal text-ink-muted">
                .{rootDomain}
              </span>
            </div>
          </label>

          <label className={cn(label, "block")}>
            Tagline
            <input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={120}
              placeholder="e.g. Ahmedabad's IELTS specialists since 2012"
              className={cn(field, "mt-1.5")}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              title="Brand colour"
              hint="Sidebar, header and sign-in panel."
              value={color}
              onChange={setColor}
              emptyLabel="IELTSVega slate"
            />
            <ColorField
              title="Text colour"
              hint={
                autoText
                  ? `Empty = auto (${autoText === "#ffffff" ? "white" : "black"} on your colour).`
                  : "Used once a brand colour is set."
              }
              value={textColor}
              onChange={setTextColor}
              emptyLabel={autoText ? "Auto" : "—"}
              disabled={!validColor}
            />
          </div>

          <div>
            <p className={label}>Logo</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-paper-elev px-3 text-sm font-medium text-ink hover:bg-paper-sunken"
              >
                <ImageUp className="size-4" /> {logoPreview ? "Replace" : "Upload"}
              </button>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setLogoPreview(null);
                    setRemoveLogo(true);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="size-4" /> Remove
                </button>
              )}
              <span className="text-xs text-ink-muted">PNG, JPG or WebP, under 512 KB. Square works best.</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoPreview(URL.createObjectURL(file));
                  setRemoveLogo(false);
                }}
              />
            </div>
          </div>
        </div>

        {/* What the class's sidebar will look like with these settings. */}
        <div>
          <p className={label}>Preview</p>
          <div
            className="mt-1.5 rounded-2xl p-4"
            style={{
              backgroundColor: validColor ?? "hsl(222 47% 11%)",
              color: validColor ? (shownText ?? "#ffffff") : "#ffffff",
            }}
          >
            <div className="flex items-center gap-2.5">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="" className="size-9 shrink-0 object-contain" />
              ) : (
                <LogoMark className="size-9" />
              )}
              <div className="min-w-0 leading-tight">
                <p className="truncate text-lg font-semibold">{partnerName}</p>
                <p className={`line-clamp-2 text-[10px] uppercase tracking-[0.18em] ${tagline ? "opacity-85" : "opacity-50"}`}>
                  {tagline || "Academic & General"}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-1 text-sm">
              <p className="rounded-md px-3 py-2" style={{ backgroundColor: "color-mix(in srgb, currentColor 10%, transparent)" }}>
                Dashboard
              </p>
              <p className="px-3 py-2 opacity-70">Practice</p>
              <p className="px-3 py-2 opacity-70">Mock Tests</p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save white label
        </button>
        {initial.subdomain && (
          <button
            type="button"
            disabled={pending}
            onClick={check}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-4 text-sm font-semibold text-ink hover:bg-paper-sunken disabled:opacity-50"
          >
            <RefreshCw className="size-3.5" /> Check domain
          </button>
        )}
        {saved && !error && <span className="text-sm text-green-ink">Saved.</span>}
        {domain && (
          <span className="inline-flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATE_COPY[domain.state].tone)}>
              {STATE_COPY[domain.state].text}
            </span>
            {domain.host}
            {domain.detail && <span className="text-xs text-ink-muted">· {domain.detail}</span>}
          </span>
        )}
      </div>
    </div>
  );
}

function ColorField({
  title,
  hint,
  value,
  onChange,
  emptyLabel,
  disabled,
}: {
  title: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const valid = isHexColor(value);
  return (
    <div className={cn(disabled && "opacity-50")}>
      <p className={label}>{title}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          aria-label={title}
          disabled={disabled}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-paper-elev p-1 disabled:cursor-not-allowed"
        />
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={emptyLabel}
          maxLength={7}
          className={cn(field, "font-mono", value && !valid && "border-danger")}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-xs font-medium text-ink-muted hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}
