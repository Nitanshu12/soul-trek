export const VOLUNTEER_EMAIL_DOMAIN = "volunteer.soultrek.internal";

export function usernameToEmail(usernameOrEmail: string): string {
  const trimmed = usernameOrEmail.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  const slug = trimmed.toLowerCase().replace(/\s+/g, "");
  return `${slug}@${VOLUNTEER_EMAIL_DOMAIN}`;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  role: "admin" | "volunteer";
  bus_id: string | null;
  created_at: string;
}
