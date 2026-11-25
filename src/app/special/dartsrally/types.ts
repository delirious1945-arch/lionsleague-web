// Darts Rally – Datenmodell & Typen
// Dokumenten-ID: RALLY-TYPES-2026-V1

export type RallyGameMode = 'board_vs_board' | 'single_board';
export type RallyTargetDistance = 750 | 1000 | 1500;

export type RallyItemType =
  | 'banana'    // Schleudertrauma: gegnerischer nächster Werfer nur 2 Darts
  | 'freeze'    // Frost-Blitz: gegnerisches Tablet friert 10s ein
  | 'fog'       // Schneesturm-Nebel: gegnerischer Score 20s verdeckt
  | 'rocket'    // Lenkrakete: -75 beim Gegner, +75 beim eigenen Team
  | 'turbo'     // Turbo-Booster: 20s doppelte Punkte für eigenes Team
  | 'shield';   // Eis-Schild: wehrt nächsten Angriff ab

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
  isFrozen: boolean;
  freezeExpiresAt: number | null;
  turboExpiresAt: number | null;
  fogExpiresAt: number | null;
  bananaActiveForRunner: boolean;
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
  isTripleSameNumber?: boolean;
  hitsOn18?: number;
}

export function detectRallyItems(visit: RallyThrowVisit): RallyItemType[] {
  const items: RallyItemType[] = [];

  // 1. Frost-Blitz (Bullseye 50)
  if (visit.hasBullseye) {
    items.push('freeze');
  }

  // 2. Bananenschale (2 Triples)
  if (visit.triplesCount && visit.triplesCount >= 2) {
    items.push('banana');
  }

  // 3. Lenkrakete (1 Doppel + 1 Triple)
  if (visit.hasDoubleAndTriple) {
    items.push('rocket');
  }

  // 4. Schneesturm-Nebel (100+ Punkte)
  if (visit.score >= 100) {
    items.push('fog');
  }

  // 5. Turbo-Booster (3x dieselbe Zahl)
  if (visit.isTripleSameNumber) {
    items.push('turbo');
  }

  // 6. Eis-Schild (mind. 2 Treffer in die 18)
  if (visit.hitsOn18 && visit.hitsOn18 >= 2) {
    items.push('shield');
  }

  return items;
}
