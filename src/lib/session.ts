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

const SPECIAL_ALLOWED_BOARDS = new Set(['board 4', 'board4', 'board 5', 'board5']);

/**
 * Extrahiert die Board-Nummer (1–5) aus einem Session-Namen wie „Board 4“ oder „Board5“.
 */
export function getBoardNumberFromSessionName(name?: string | null): string | null {
  if (!name) return null;
  const match = name.trim().toLowerCase().match(/^board\s*([1-5])$/);
  return match ? match[1] : null;
}

/**
 * Prüft, ob die aktuelle Session Zugriff auf die geschützte Event-/Funspiele-Arena (/special) hat.
 * Erlaubt sind ausschließlich Admins sowie die Anmeldungen für Board 4 und Board 5.
 */
export function canAccessSpecialArena(session?: UserSession | null): boolean {
  if (!session) return false;
  if (session.role === 'admin') return true;
  const normalizedName = (session.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return SPECIAL_ALLOWED_BOARDS.has(normalizedName);
}
