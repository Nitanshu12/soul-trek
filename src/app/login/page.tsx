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
    <div className="flex min-h-screen flex-col items-center justify-center bg-orange-600 px-6 text-white">
      <h1 className="mb-1 text-2xl font-bold">Soul Trek Feedback</h1>
      <p className="mb-8 text-orange-100">Sign in to continue</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <input
          autoFocus
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Username (or admin email)"
          autoCapitalize="none"
          className="w-full rounded-xl border-0 bg-white px-4 py-3 text-lg text-neutral-900 shadow-sm outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border-0 bg-white px-4 py-3 text-lg text-neutral-900 shadow-sm outline-none"
        />

        {error && (
          <p className="rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-50">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !identifier.trim() || !password}
          className="w-full rounded-xl bg-neutral-900 px-4 py-3 text-lg font-semibold text-white disabled:opacity-40"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-8 max-w-xs text-center text-sm text-orange-100">
        Don&apos;t have a login? Ask your Soul Trek admin to create one for you.
      </p>
    </div>
  );
}
