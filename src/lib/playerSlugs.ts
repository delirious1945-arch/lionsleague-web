/**
 * Spieler-Kürzel und Board-Zuweisung für Lions Weyhausen
 *
 * Ermöglicht jedem registrierten Spieler einen persönlichen Monitor-Zugang:
 * z. B. https://lionsweyhausen.vercel.app/board/sk für Sebastian Kirste.
 *
 * Die Vereinsheim-Boards 1 bis 5 bleiben unangetastet.
 */

export interface PlayerSlugEntry {
  name: string;
  slug: string;
  team: string;
}

export const KNOWN_PLAYER_SLUGS: PlayerSlugEntry[] = [
  { name: 'André Rathje', slug: 'ar', team: 'B-Team' },
  { name: 'Dirk Ostermann', slug: 'do', team: 'A-Team' },
  { name: 'Erik Schremmer', slug: 'es', team: 'A-Team' },
  { name: 'Jannik Baier', slug: 'jb', team: 'B-Team' },
  { name: 'Jens Goltermann', slug: 'jg', team: 'A-Team' },
  { name: 'Karen Schulz', slug: 'ks', team: 'B-Team' },
  { name: 'Karsten Kohnert', slug: 'kk', team: 'B-Team' },
  { name: 'Kevin Emde', slug: 'ke', team: 'A-Team' },
  { name: 'Maik Feuerhahn', slug: 'mf', team: 'B-Team' },
  { name: 'Martin Thomas', slug: 'mt', team: 'B-Team' },
  { name: 'Martin Wolnik', slug: 'mw', team: 'Kein Team' },
  { name: 'Michael Gehrt', slug: 'mg', team: 'B-Team' },
  { name: 'Michael Jochen', slug: 'mj', team: 'B-Team' },
  { name: 'Michael Kranz', slug: 'mk', team: 'B-Team' },
  { name: 'Nicholas Stedman', slug: 'ns', team: 'A-Team' },
  { name: 'Philip Ostermann', slug: 'po', team: 'Kein Team' },
  { name: 'Sebastian Kirste', slug: 'sk', team: 'A-Team' },
  { name: 'Timo Feuerhahn', slug: 'tf', team: 'B-Team' },
  { name: 'Uwe Kohnert', slug: 'uk', team: 'Kein Team' },
];

/**
 * Ermittelt das 2-Buchstaben-Kürzel für einen Spielernamen.
 * Fallback für künftige Neuzugänge: Anfangsbuchstabe Vorname + Anfangsbuchstabe Nachname.
 */
export function getPlayerSlug(name?: string | null): string {
  if (!name) return '1';
  const clean = name.trim();
  if (!clean) return '1';

  // 1. Suche in bekannten Spielern
  const matched = KNOWN_PLAYER_SLUGS.find(
    (p) => p.name.toLowerCase() === clean.toLowerCase()
  );
  if (matched) return matched.slug;

  // 2. Automatischer Fallback nach BBDV-Standard: Erster Buchstabe Vorname + erster Buchstabe Nachname
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return (first + last).toLowerCase();
  }

  // 1-Wort Fallback
  return clean.slice(0, 2).toLowerCase();
}

/**
 * Findet einen Spieler anhand seines Kürzels (z. B. 'sk' -> 'Sebastian Kirste').
 */
export function getPlayerBySlug(slug?: string | null): PlayerSlugEntry | null {
  if (!slug) return null;
  const clean = slug.trim().toLowerCase();
  return KNOWN_PLAYER_SLUGS.find((p) => p.slug === clean) || null;
}

/**
 * Prüft, ob die gegebene ID eine Standard-Boardnummer (1-5) ist.
 */
export function isBoardNumber(id?: string | null): boolean {
  if (!id) return false;
  return ['1', '2', '3', '4', '5'].includes(id.trim());
}

/**
 * Prüft, ob die gegebene ID ein gültiges Spielerkürzel ist.
 */
export function isPlayerSlug(id?: string | null): boolean {
  if (!id) return false;
  return Boolean(getPlayerBySlug(id));
}

/**
 * Prüft, ob die gegebene ID ein valides Board (1-5) oder ein valides Spieler-Kürzel ist.
 */
export function isValidBoardId(id?: string | null): boolean {
  if (!id) return false;
  const clean = id.trim().toLowerCase();
  return isBoardNumber(clean) || isPlayerSlug(clean);
}

/**
 * Liefert einen sauberen Anzeigenamen für Monitore und Umschalter.
 */
export function getBoardDisplayName(id?: string | null): string {
  if (!id) return 'Board 1';
  const clean = id.trim();
  if (isBoardNumber(clean)) {
    return `Board ${clean}`;
  }
  const player = getPlayerBySlug(clean);
  if (player) {
    return `${player.name} (${player.slug.toUpperCase()})`;
  }
  return `Kanal ${clean.toUpperCase()}`;
}
