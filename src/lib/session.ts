export interface UserSession {
  id?: number;
  name: string;
  role: string;
  team: string;
}

export function parseUserSession(raw?: string | null): UserSession | null {
  if (!raw) return null;
  try {
    const decoded = raw.includes('%') ? decodeURIComponent(raw) : raw;
    return JSON.parse(decoded) as UserSession;
  } catch {
    try {
      return JSON.parse(raw) as UserSession;
    } catch {
      return null;
    }
  }
}
