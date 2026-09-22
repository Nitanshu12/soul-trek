export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  role: "admin";
  created_at: string;
}

const VOLUNTEER_NAME_KEY = "soul-trek-volunteer-name";

export function getVolunteerName(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(VOLUNTEER_NAME_KEY) ?? "";
}

export function setVolunteerName(name: string) {
  localStorage.setItem(VOLUNTEER_NAME_KEY, name.trim());
}
