// Darts Rally – Datenmodell & Typen
// Dokumenten-ID: RALLY-TYPES-2026-V2

export type RallyGameMode = 'board_vs_board' | 'single_board';
export type RallyTargetDistance = 750 | 1000 | 1500;

export type RallyItemType =
  | 'spitzenbruch'   // 2 Triples: gegnerischer nächster Werfer nur 2 Darts
  | 'darttausch'     // Bullseye 50: Jeder Spieler gibt seine Darts an den Hintermann
  | 'ausgebremst'    // 100+ Pkt: gegnerisches Tablet 20s eingefroren (Timer läuft)
  | 'reifenplatzer'  // 1 Doppel + 1 Triple: -75 beim Gegner, +75 beim eigenen Team
  | 'turbo'          // >= 121 Pkt: 20s doppelte Punkte für eigenes Team
  | 'schild';        // Schnapszahl ab 77: wehrt nächsten feindlichen Angriff ab

export interface RallyTeamMember {
  id: string;
  name: string;
}

export interface RallyActiveCurse {
  type: RallyItemType;
  expiresAt: number; // Timestamp ms
  sourceTeam: 'red' | 'gold';
}

export interface RallyTeamState {
  teamKey: 'red' | 'gold';
  teamName: string;
  score: number;
  members: RallyTeamMember[];
  activeRunnerIndex: number;
  activeCurses: RallyActiveCurse[];
  hasShield: boolean;
  isAusgebremst: boolean;
  ausgebremstExpiresAt: number | null;
  turboExpiresAt: number | null;
  spitzenbruchActiveForRunner: boolean;
  totalDartsThrown: number;
  history: {
    runnerName: string;
    pointsScored: number;
    effectivePoints: number;
    itemsTriggered: RallyItemType[];
    timestamp: number;
  }[];
}

export interface RallyGameState {
  sessionId: string;
  boardId: string;
  mode: RallyGameMode;
  targetDistance: RallyTargetDistance;
  status: 'setup' | 'countdown' | 'racing' | 'finished';
  teamRed: RallyTeamState;
  teamGold: RallyTeamState;
  activeBoardTeam?: 'red' | 'gold'; // Im Board-vs-Board: Welches Team bedient dieses Board
  winnerTeam: 'red' | 'gold' | null;
  startedAt: number | null;
  finishedAt: number | null;
  updatedAt: number;
}

// Item-Erkennungs-Heuristik
export interface RallyThrowVisit {
  score: number;
  triplesCount?: number;
  hasBullseye?: boolean;
  hasDoubleAndTriple?: boolean;
}

export function isSchnapszahl(score: number): boolean {
  if (score < 77) return false;
  const digits = score.toString().split('');
  return digits.every((d) => d === digits[0]);
}

export function detectRallyItems(visit: RallyThrowVisit): RallyItemType[] {
  const items: RallyItemType[] = [];

  // 1. Spitzenbruch (2 Triples) -> Gegner nächster Wurf nur 2 Darts
  if (visit.triplesCount && visit.triplesCount >= 2) {
    items.push('spitzenbruch');
  }

  // 2. Darttausch (Bullseye 50) -> Darts an den Hintermann weitergeben
  if (visit.hasBullseye) {
    items.push('darttausch');
  }

  // 3. Ausgebremst (100+ Punkte) -> Gegner-Tablet 20s eingefroren
  if (visit.score >= 100) {
    items.push('ausgebremst');
  }

  // 4. Reifenplatzer (1 Doppel + 1 Triple) -> -75 Gegner / +75 Team
  if (visit.hasDoubleAndTriple) {
    items.push('reifenplatzer');
  }

  // 5. Turbo-Booster (Score >= 121 Punkte) -> 20s doppelte Punkte
  if (visit.score >= 121) {
    items.push('turbo');
  }

  // 6. Schild (Schnapszahl ab 77 Punkten, z.B. 77, 88, 99, 111) -> Wehrt nächsten Angriff ab
  if (isSchnapszahl(visit.score)) {
    items.push('schild');
  }

  return items;
}
