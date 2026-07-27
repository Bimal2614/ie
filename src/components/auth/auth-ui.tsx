import { cn } from "@/lib/utils";

/**
 * Auth primitives for the LIGHT form panel (the showcase panel stays dark).
 * Kept in one place so login and signup stay identical.
 */

/** Primary "go" CTA — solid green (the conversion action per the colour system). */
export const authButton =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-green text-sm font-semibold text-green-ink transition-[filter] hover:brightness-105 disabled:opacity-60";

export const authError =
  "rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger";

/**
 * The header block — a mono pill chip, a serif heading (matching the marketing
 * pages' editorial voice), and a subtitle. Centred.
 */
export function AuthHeader({
  chip,
  title,
  subtitle,
}: {
  chip: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="text-center">
      <span className="font-mono inline-flex rounded-full border border-line bg-paper-elev px-3 py-1 text-[11px] tracking-wide text-ink-soft">
        {chip}
      </span>
      <h1 className="font-serif mt-4 text-3xl tracking-tight text-ink">
        {title}
      </h1>
      {/* <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p> */}
    </div>
  );
}

export function AuthField({
  label,
  hideLabel,
  error,
  adornment,
  className,
  ...props
}: {
  label: string;
  hideLabel?: boolean;
  error?: string;
  adornment?: React.ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {!hideLabel && (
        <label
          htmlFor={props.id}
          className="mb-1.5 block text-xs font-medium text-ink-soft"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          aria-label={hideLabel ? label : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "auth-input h-11 w-full rounded-lg border border-line bg-paper-elev px-3.5 text-sm text-ink outline-none transition-colors",
            "placeholder:text-ink-muted",
            "focus:border-brand focus:ring-2 focus:ring-brand/15",
            "aria-[invalid=true]:border-danger",
            adornment ? "pr-10" : "",
            className,
          )}
          {...props}
        />
        {adornment && (
          <span className="absolute inset-y-0 right-3 flex items-center">
            {adornment}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
