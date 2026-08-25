"use client";

import { useActionState, useState } from "react";
import { Loader2, Check, Eye, EyeOff } from "lucide-react";
import { updateProfile, changePassword } from "@/app/actions/settings";
import { AuthField, authButton, authError } from "@/components/auth/auth-ui";
import { TARGET_BANDS, type AuthFormState } from "@/lib/validation";
import { cn } from "@/lib/utils";

// Matches AuthField's input styling, for the <select> and date controls.
const control =
  "h-11 w-full rounded-lg border border-line bg-paper-elev px-3.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15";

function Saved() {
  return (
    <span className="flex items-center gap-1 text-sm font-medium text-green">
      <Check className="size-4" /> Saved
    </span>
  );
}

type ProfileInitial = {
  name: string;
  email: string;
  country: string;
  targetModule: "academic" | "general";
  targetBand: string;
  examDate: string; // yyyy-mm-dd or ""
};

export function ProfileForm({ initial }: { initial: ProfileInitial }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(updateProfile, null);
  const [module, setModule] = useState(initial.targetModule);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <p role="alert" className={authError}>{state.error}</p>}

      <AuthField label="Full name" id="name" name="name" defaultValue={initial.name} autoComplete="name" required error={state?.fieldErrors?.name?.[0]} />

      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-soft">Email</label>
        <div className={cn(control, "flex items-center bg-paper-sunken text-ink-muted")}>{initial.email}</div>
        <p className="mt-1 text-xs text-ink-muted">Contact support to change your email.</p>
      </div>

      <AuthField label="Country" id="country" name="country" defaultValue={initial.country} placeholder="e.g. India" error={state?.fieldErrors?.country?.[0]} />

      <div>
        <span className="mb-1.5 block text-xs font-medium text-ink-soft">Preparing for</span>
        <input type="hidden" name="targetModule" value={module} />
        <div className="grid grid-cols-2 gap-2">
          {([["academic", "Academic"], ["general", "General Training"]] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setModule(value)}
              aria-pressed={module === value}
              className={cn(
                "rounded-lg border p-2.5 text-sm font-medium transition-colors",
                module === value ? "border-brand bg-brand-soft text-ink" : "border-line text-ink-soft hover:bg-paper-sunken",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="targetBand" className="mb-1.5 block text-xs font-medium text-ink-soft">Target band</label>
          <select id="targetBand" name="targetBand" defaultValue={initial.targetBand} className={control}>
            <option value="">Not sure yet</option>
            {TARGET_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="examDate" className="mb-1.5 block text-xs font-medium text-ink-soft">Exam date</label>
          <input id="examDate" name="examDate" type="date" defaultValue={initial.examDate} className={control} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={cn(authButton, "w-auto px-6")}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </button>
        {state?.ok && <Saved />}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(changePassword, null);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      {state?.error && <p role="alert" className={authError}>{state.error}</p>}

      <AuthField
        label="Current password" id="currentPassword" name="currentPassword" type="password"
        autoComplete="current-password" required error={state?.fieldErrors?.currentPassword?.[0]}
      />
      <AuthField
        label="New password" id="newPassword" name="newPassword" type={show ? "text" : "password"}
        autoComplete="new-password" placeholder="At least 10 characters" required
        error={state?.fieldErrors?.newPassword?.[0]}
        adornment={
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
            className="text-ink-muted transition-colors hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        }
      />

      <div className="flex items-center gap-3 pt-1">
        <button type="submit" disabled={pending} className={cn(authButton, "w-auto px-6")}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update password
        </button>
        {state?.ok && <Saved />}
      </div>
    </form>
  );
}

