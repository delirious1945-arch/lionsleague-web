export type GolfGameMode = '1vsComputer' | '1vs1';
export type GolfHolesCount = 18 | 9;
export type GolfBotDifficulty = 'caddy' | 'clubmeister' | 'tourpro' | 'legend';

export const MAX_STROKES_PER_HOLE = 8;

export const IMPOSSIBLE_3DART_SCORES = new Set<number>([
  163, 166, 169, 172, 173, 175, 176, 178, 179,
]);

export function isValidThreeDartScore(score: number): boolean {
  return (
    Number.isInteger(score) &&
    score >= 0 &&
    score <= 180 &&
    !IMPOSSIBLE_3DART_SCORES.has(score)
  );
}

export interface GolfBotConfig {
  id: GolfBotDifficulty;
  name: string;
  handicapLabel: string;
  subtitle: string;
  badgeColor: string;
  avgMin: number;
  avgMax: number;
  checkoutChanceLow: number; // <= 60 m
  checkoutChanceMid: number; // 61..120 m
  checkoutChanceHigh: number; // 121..170 m
  overshootChance: number;
  missChance: number;
}

export const GOLF_BOT_CONFIGS: Record<GolfBotDifficulty, GolfBotConfig> = {
  caddy: {
    id: 'caddy',
    name: 'Platz-Caddy',
    handicapLabel: 'HCP 36',
    subtitle: 'Einsteiger (Ø 38–52 Pkt.) · Streut öfter & fliegt gelegentlich übers Grün',
    badgeColor: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15',
    avgMin: 34,
    avgMax: 56,
    checkoutChanceLow: 0.32,
    checkoutChanceMid: 0.08,
    checkoutChanceHigh: 0.01,
    overshootChance: 0.22,
    missChance: 0.08,
  },
  clubmeister: {
    id: 'clubmeister',
    name: 'Club-Golfer',
    handicapLabel: 'HCP 18',
    subtitle: 'Fortgeschritten (Ø 52–68 Pkt.) · Solide Annäherung & sichere Checkouts',
    badgeColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15',
    avgMin: 48,
    avgMax: 74,
    checkoutChanceLow: 0.54,
    checkoutChanceMid: 0.16,
    checkoutChanceHigh: 0.03,
    overshootChance: 0.14,
    missChance: 0.04,
  },
  tourpro: {
    id: 'tourpro',
    name: 'PGA Tour-Pro',
    handicapLabel: 'HCP 0',
    subtitle: 'Profi (Ø 68–88 Pkt.) · Hohe Scores & starke Finishes bis 170 m',
    badgeColor: 'text-amber-300 border-amber-400/40 bg-amber-500/15',
    avgMin: 64,
    avgMax: 96,
    checkoutChanceLow: 0.76,
    checkoutChanceMid: 0.28,
    checkoutChanceHigh: 0.08,
    overshootChance: 0.07,
    missChance: 0.01,
  },
  legend: {
    id: 'legend',
    name: 'Green-Jacket Legende',
    handicapLabel: 'Plus-HCP',
    subtitle: 'Weltklasse (Ø 85–112 Pkt.) · Konstante 100+ Aufnahmen & eiskalte Finishes',
    badgeColor: 'text-rose-300 border-rose-400/40 bg-rose-500/15',
    avgMin: 82,
    avgMax: 120,
    checkoutChanceLow: 0.9,
    checkoutChanceMid: 0.44,
    checkoutChanceHigh: 0.15,
    overshootChance: 0.03,
    missChance: 0.0,
  },
};

export interface GolfHoleDefinition {
  holeNumber: number; // 1..18
  par: 3 | 4 | 5;
  startDistance: number; // in Metern
  name: string;
  hazardHint: string;
}

export interface GolfDartShot {
  strokeNumber: number; // 1..8 an diesem Loch (1 Schlag = 1 Aufnahme)
  dartInTurn: 1 | 2 | 3;
  label: string; // z. B. "100", "60", "41", "MISS"
  value: number; // 0..180
  distanceBefore: number;
  distanceAfter: number;
  overshot: boolean; // true wenn value > distanceBefore
  holedOut: boolean; // true wenn distanceAfter === 0
  pickedUp?: boolean; // true wenn Max-Schläge (8) erreicht ohne Einlochen
}

export interface GolfHolePlayerResult {
  holeNumber: number;
  par: 3 | 4 | 5;
  startDistance: number;
  strokes: number;
  toPar: number; // strokes - par
  overshoots: number;
  holedOut: boolean;
  pickedUp: boolean;
  shots: GolfDartShot[];
}

export interface GolfPlayerState {
  currentDistance: number;
  currentHoleStrokes: number;
  currentHoleOvershoots: number;
  currentHoleHoledOut: boolean;
  currentHolePickedUp: boolean;
  currentTurnShots: GolfDartShot[];
  currentHoleAllShots: GolfDartShot[];
  completedHoles: GolfHolePlayerResult[];
  totalStrokes: number;
  totalParPlayed: number;
  scoreToPar: number;
  holesWon: number;
  holeInOnes: number;
  eaglesOrBetter: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubleBogeysOrWorse: number;
  totalOvershoots: number;
}

export interface GolfLastActionBanner {
  id: number;
  tone: 'hole_out' | 'eagle' | 'overshoot' | 'drive' | 'miss' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface GolfLiveData {
  holesCount: GolfHolesCount;
  currentHoleIndex: number; // 0..17
  coursePar: number;
  holes: GolfHoleDefinition[];
  isComputer: boolean;
  computerLevel?: GolfBotDifficulty;
  p1: GolfPlayerState;
  p2: GolfPlayerState;
  lastAction?: GolfLastActionBanner | null;
  winnerPlayer?: 1 | 2 | 'draw' | null;
  winnerName?: string | null;
}

export interface GolfSessionSavePayload {
  session_id: string;
  player_id?: number | null;
  player_name: string;
  opponent_name: string | null;
  game_mode: GolfGameMode;
  is_computer: number;
  computer_level: string | null;
  holes_count: number;
  course_par: number;
  total_strokes: number;
  score_to_par: number;
  holes_won: number;
  eagles_count: number;
  birdies_count: number;
  pars_count: number;
  bogeys_count: number;
  overshoots_count: number;
  is_winner: number;
  hole_details: GolfHolePlayerResult[];
  training_date: string;
}

export interface GolfHistoryItem extends GolfSessionSavePayload {
  id: number;
  created_at?: string;
}

const HOLE_NAMES_18: { name: string; hazardHint: string }[] = [
  { name: 'Aller-Abschlag', hazardHint: 'Breites Fairway zum Auftakt' },
  { name: 'Kiefern-Schneise', hazardHint: 'Vorsicht vor dem Überflug ins Unterholz' },
  { name: 'Insel-Grün Weyhausen', hazardHint: 'Präzises kurzes Eisen gefragt' },
  { name: 'Sandbunker-Kurve', hazardHint: 'Dogleg links – guter Drive legt das Grün frei' },
  { name: 'Lions-Allee', hazardHint: 'Langes Par 5 – hier zählt jede Aufnahme' },
  { name: 'Teich-Panorama', hazardHint: 'Kurz vor der Fahne lauert das Wasser' },
  { name: 'Windmühlen-Hügel', hazardHint: 'Gegenwind auf dem erhöhten Grün' },
  { name: 'Heide-Blick', hazardHint: 'Schnelles Grün – nicht überschießen!' },
  { name: 'Clubhaus-Kehre', hazardHint: 'Abschluss der Front Nine am Vereinsheim' },
  { name: 'Birken-Fairway', hazardHint: 'Auftakt der Back Nine mit engem Grün' },
  { name: 'Silbersee-Sprung', hazardHint: 'Kurzes Par 3 direkt über das Wasser' },
  { name: 'Fuchs-Senke', hazardHint: 'Blinder Annäherungsschlag zur Fahne' },
  { name: 'Meister-Meile', hazardHint: 'Königsloch – zwei starke Drives nötig' },
  { name: 'Eichen-Schatten', hazardHint: 'Tückische Fahnenposition am Hang' },
  { name: 'Schilf-Ufer', hazardHint: 'Präzision schlägt rohe Gewalt' },
  { name: 'Adler-Klippe', hazardHint: 'Beste Birdie-Chance auf den Back Nine' },
  { name: 'Bullen-Grün', hazardHint: 'Vorletztes Loch unter Flutlicht' },
  { name: 'Champions-Finish', hazardHint: 'Das große 18. Finale vor der Terrasse' },
];

// Par-Verteilung für 9 Löcher (Par 36: 2x Par 3, 5x Par 4, 2x Par 5)
const NINE_HOLE_PAR_TEMPLATE: (3 | 4 | 5)[] = [4, 4, 3, 4, 5, 3, 4, 5, 4];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shufflePars(template: (3 | 4 | 5)[]): (3 | 4 | 5)[] {
  const arr = [...template];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Generiert einen kompletten 18-Loch (Par 72) oder 9-Loch (Par 36) Golfkurs
 * mit realistischen, zufälligen 3-Dart-Lochdistanzen (55 m bis 300 m).
 */
export function generateGolfCourse(holesCount: GolfHolesCount = 18): GolfHoleDefinition[] {
  const frontNinePars = shufflePars(NINE_HOLE_PAR_TEMPLATE);
  const backNinePars = shufflePars(NINE_HOLE_PAR_TEMPLATE);
  const allPars =
    holesCount === 18 ? [...frontNinePars, ...backNinePars] : frontNinePars;

  let prevDist = 0;

  return allPars.map((par, idx) => {
    let dist = 140;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (par === 3) {
        dist = randomInt(55, 120);
      } else if (par === 4) {
        dist = randomInt(125, 210);
      } else {
        dist = randomInt(215, 300);
      }
      if (dist !== prevDist) break;
    }
    prevDist = dist;

    const meta = HOLE_NAMES_18[idx] || {
      name: `Bahn ${idx + 1}`,
      hazardHint: 'Spiele den Ball exakt auf 0 Meter',
    };

    return {
      holeNumber: idx + 1,
      par,
      startDistance: dist,
      name: meta.name,
      hazardHint: meta.hazardHint,
    };
  });
}

/**
 * Liefert die offizielle Golf-Bezeichnung für ein Lochergebnis.
 */
export function getGolfTermForScore(
  strokes: number,
  par: 3 | 4 | 5
): {
  term: string;
  shortLabel: string;
  toParLabel: string;
  colorClass: string;
  badgeStyle: 'double-circle' | 'circle' | 'neutral' | 'square' | 'double-square';
} {
  const diff = strokes - par;
  const toParLabel = diff === 0 ? 'E' : diff > 0 ? `+${diff}` : `${diff}`;

  if (strokes === 1) {
    return {
      term: 'HOLE-IN-ONE!',
      shortLabel: 'ACE',
      toParLabel,
      colorClass: 'text-amber-300 border-amber-300 bg-amber-500/25',
      badgeStyle: 'double-circle',
    };
  }
  if (diff <= -3) {
    return {
      term: 'Albatros',
      shortLabel: 'ALB',
      toParLabel,
      colorClass: 'text-amber-300 border-amber-300 bg-amber-500/25',
      badgeStyle: 'double-circle',
    };
  }
  if (diff === -2) {
    return {
      term: 'Eagle',
      shortLabel: 'EAG',
      toParLabel,
      colorClass: 'text-yellow-300 border-yellow-400 bg-yellow-500/20',
      badgeStyle: 'double-circle',
    };
  }
  if (diff === -1) {
    return {
      term: 'Birdie',
      shortLabel: 'BIR',
      toParLabel,
      colorClass: 'text-emerald-300 border-emerald-400 bg-emerald-500/20',
      badgeStyle: 'circle',
    };
  }
  if (diff === 0) {
    return {
      term: 'Par',
      shortLabel: 'PAR',
      toParLabel: 'E',
      colorClass: 'text-slate-200 border-white/20 bg-white/5',
      badgeStyle: 'neutral',
    };
  }
  if (diff === 1) {
    return {
      term: 'Bogey',
      shortLabel: 'BOG',
      toParLabel: '+1',
      colorClass: 'text-rose-300 border-rose-500/60 bg-rose-500/15',
      badgeStyle: 'square',
    };
  }
  if (diff === 2) {
    return {
      term: 'Double Bogey',
      shortLabel: '2BG',
      toParLabel: '+2',
      colorClass: 'text-red-300 border-red-500 bg-red-950/70',
      badgeStyle: 'double-square',
    };
  }
  return {
    term: `Triple Bogey (+${diff})`,
    shortLabel: `+${diff}`,
    toParLabel: `+${diff}`,
    colorClass: 'text-red-200 border-red-500 bg-red-950/90',
    badgeStyle: 'double-square',
  };
}

export function formatToPar(scoreToPar: number): string {
  if (scoreToPar === 0) return 'E';
  return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
}

export function createInitialGolfPlayerState(firstHoleDistance: number): GolfPlayerState {
  return {
    currentDistance: firstHoleDistance,
    currentHoleStrokes: 0,
    currentHoleOvershoots: 0,
    currentHoleHoledOut: false,
    currentHolePickedUp: false,
    currentTurnShots: [],
    currentHoleAllShots: [],
    completedHoles: [],
    totalStrokes: 0,
    totalParPlayed: 0,
    scoreToPar: 0,
    holesWon: 0,
    holeInOnes: 0,
    eaglesOrBetter: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubleBogeysOrWorse: 0,
    totalOvershoots: 0,
  };
}

export function cloneGolfPlayerState(s: GolfPlayerState): GolfPlayerState {
  return {
    ...s,
    currentTurnShots: Array.isArray(s.currentTurnShots)
      ? s.currentTurnShots.map((sh) => ({ ...sh }))
      : [],
    currentHoleAllShots: Array.isArray(s.currentHoleAllShots)
      ? s.currentHoleAllShots.map((sh) => ({ ...sh }))
      : [],
    completedHoles: Array.isArray(s.completedHoles)
      ? s.completedHoles.map((h) => ({
          ...h,
          shots: Array.isArray(h.shots) ? h.shots.map((sh) => ({ ...sh })) : [],
        }))
      : [],
  };
}

function clampToValidThreeDartScore(rawScore: number): number {
  let s = Math.max(0, Math.min(180, Math.round(rawScore)));
  while (IMPOSSIBLE_3DART_SCORES.has(s) && s > 0) {
    s -= 1;
  }
  return s;
}

/**
 * Simuliert eine komplette 3-Dart-Aufnahme (0–180) des Computer-Gegners
 * passend zum Handicap-Level – inklusive realistischem Checkout und gelegentlichem Überflug.
 */
export function simulateGolfBotVisit(
  distance: number,
  difficulty: GolfBotDifficulty
): { label: string; value: number } {
  const cfg = GOLF_BOT_CONFIGS[difficulty] || GOLF_BOT_CONFIGS.clubmeister;

  // 1. Checkout-Versuch wenn Restdistanz <= 170 und in einer Aufnahme erreichbar
  if (distance > 0 && distance <= 170 && isValidThreeDartScore(distance)) {
    const chkChance =
      distance <= 60
        ? cfg.checkoutChanceLow
        : distance <= 120
        ? cfg.checkoutChanceMid
        : cfg.checkoutChanceHigh;

    if (Math.random() < chkChance) {
      return { label: String(distance), value: distance };
    }
  }

  // 2. Gelegentlicher Luftschlag / Nuller
  if (Math.random() < cfg.missChance) {
    return { label: 'MISS', value: 0 };
  }

  // 3. Versehentlicher Überflug bei kurzer/mittlerer Distanz (z. B. Triple 20 statt Single 20)
  if (distance <= 55 && Math.random() < cfg.overshootChance) {
    const overChoices = [45, 55, 60, 66, 75, 80].filter((v) => v > distance);
    const pickedOver =
      overChoices[Math.floor(Math.random() * overChoices.length)] ??
      clampToValidThreeDartScore(distance + randomInt(12, 35));
    return { label: String(pickedOver), value: pickedOver };
  }

  // 4. Lange Distanz (> 120 m): Power-Scoring anhand Handicap-Durchschnitt
  let value: number;
  if (distance > 120) {
    const raw = randomInt(cfg.avgMin, cfg.avgMax) + randomInt(-10, 14);
    value = clampToValidThreeDartScore(raw);
    if (value > distance && Math.random() > cfg.overshootChance) {
      value = clampToValidThreeDartScore(distance - randomInt(8, 32));
    }
  } else if (distance > 40) {
    // 5. Mittlere Annäherung (41..120 m): Annähern auf machbaren Rest oder knapper Überflug
    if (Math.random() < cfg.overshootChance * 0.8) {
      value = clampToValidThreeDartScore(distance + randomInt(5, 28));
    } else {
      const leave = randomInt(4, Math.min(36, distance - 1));
      value = clampToValidThreeDartScore(distance - leave);
    }
  } else {
    // 6. Kurzer Putt (1..40 m) knapp vorbei ohne Überschießen
    const leave = randomInt(1, Math.max(1, distance - 1));
    value = clampToValidThreeDartScore(distance - leave);
  }

  return {
    label: value === 0 ? 'MISS' : String(value),
    value,
  };
}
