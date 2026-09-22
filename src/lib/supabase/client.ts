import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(url as string, anonKey as string);
}

// Singleton for modules (e.g. the offline sync engine) that just need one shared client.
export const supabase = createClient();
