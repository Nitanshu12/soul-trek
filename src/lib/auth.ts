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

// The volunteer name typed into "Who's taking feedback?" — kept separately from
// the login itself, since one bus's login can be shared by more than one person
// and entries should still show who actually recorded them.
const VOLUNTEER_NAME_KEY = "soul-trek-volunteer-name";

export function getVolunteerName(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(VOLUNTEER_NAME_KEY) ?? "";
}

export function setVolunteerName(name: string) {
  localStorage.setItem(VOLUNTEER_NAME_KEY, name.trim());
}
