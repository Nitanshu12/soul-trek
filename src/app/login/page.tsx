"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError("App is not configured yet (missing Supabase env vars).");
      setLoading(false);
      return;
    }

    const email = usernameToEmail(identifier);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (signInError) {
      setError("Incorrect username/email or password.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30">
            <span className="h-5 w-5 rounded-full border-2 border-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Soul Trek</h1>
          <p className="mt-1.5 text-sm text-dim">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-dim">
              Username (or admin email)
            </label>
            <input
              autoFocus
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. bus1"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg transition-colors focus:border-accent"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-dim">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg transition-colors focus:border-accent"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !identifier.trim() || !password}
            className="w-full rounded-xl bg-accent px-4 py-3.5 text-base font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-relaxed text-muted">
          Don&apos;t have a login? Ask your Soul Trek admin to create one for you.
        </p>
      </div>
    </div>
  );
}
