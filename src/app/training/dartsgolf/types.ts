export type GolfGameMode = '1vsComputer' | '1vs1';
export type GolfHolesCount = 18 | 9;
export type GolfBotDifficulty = 'caddy' | 'clubmeister' | 'tourpro' | 'legend';

export const MAX_STROKES_PER_HOLE = 9;

export interface GolfBotConfig {
  id: GolfBotDifficulty;
  name: string;
  handicapLabel: string;
  subtitle: string;
  badgeColor: string;
  exactCheckoutChance: number;
  goodDriveChance: number;
  accidentalTripleChance: number;
  missChance: number;
}

export const GOLF_BOT_CONFIGS: Record<GolfBotDifficulty, GolfBotConfig> = {
  caddy: {
    id: 'caddy',
    name: 'Platz-Caddy',
    handicapLabel: 'HCP 36',
    subtitle: 'Einsteiger · Streut öfter & fliegt gelegentlich übers Grün',
    badgeColor: 'text-emerald-300 border-emerald-400/40 bg-emerald-500/15',
    exactCheckoutChance: 0.28,
    goodDriveChance: 0.48,
    accidentalTripleChance: 0.16,
    missChance: 0.22,
  },
  clubmeister: {
    id: 'clubmeister',
    name: 'Club-Golfer',
    handicapLabel: 'HCP 18',
    subtitle: 'Fortgeschritten · Solide Annäherung & sichere Single-Putts',
    badgeColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-500/15',
    exactCheckoutChance: 0.48,
    goodDriveChance: 0.68,
    accidentalTripleChance: 0.1,
    missChance: 0.12,
  },
  tourpro: {
    id: 'tourpro',
    name: 'PGA Tour-Pro',
    handicapLabel: 'HCP 0',
    subtitle: 'Profi · Starke Triple-Drives & hohe Checkout-Quote',
    badgeColor: 'text-amber-300 border-amber-400/40 bg-amber-500/15',
    exactCheckoutChance: 0.68,
    goodDriveChance: 0.82,
    accidentalTripleChance: 0.05,
    missChance: 0.06,
  },
  legend: {
    id: 'legend',
    name: 'Green-Jacket Legende',
    handicapLabel: 'Plus-HCP',
    subtitle: 'Weltklasse · Laser-Drives & eiskalte Finishes aus bis zu 60 m',
    badgeColor: 'text-rose-300 border-rose-400/40 bg-rose-500/15',
    exactCheckoutChance: 0.84,
    goodDriveChance: 0.92,
    accidentalTripleChance: 0.02,
    missChance: 0.03,
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
  strokeNumber: number; // 1..9 an diesem Loch
  dartInTurn: 1 | 2 | 3;
  label: string; // z. B. "T20", "S15", "D18", "BULL", "MISS"
  value: number; // 0..60
  distanceBefore: number;
  distanceAfter: number;
  overshot: boolean; // true wenn value > distanceBefore
  holedOut: boolean; // true wenn distanceAfter === 0
  pickedUp?: boolean; // true wenn Max-Schläge (9) erreicht ohne Einlochen
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
  { name: 'Lions-Allee', hazardHint: 'Langes Par 5 – hier zählt jeder Meter' },
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
 * mit realistischen, zufälligen Loch-Distanzen in Metern.
 */
export function generateGolfCourse(holesCount: GolfHolesCount = 18): GolfHoleDefinition[] {
  const frontNinePars = shufflePars(NINE_HOLE_PAR_TEMPLATE);
  const backNinePars = shufflePars(NINE_HOLE_PAR_TEMPLATE);
  const allPars =
    holesCount === 18 ? [...frontNinePars, ...backNinePars] : frontNinePars;

  let prevDist = 0;

  return allPars.map((par, idx) => {
    let dist = 80;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      if (par === 3) {
        // 40 bis 60 Meter (Checkbar mit 1 starken Dart oder 2 leichten Schlägen)
        dist = randomInt(40, 60);
      } else if (par === 4) {
        // 68 bis 116 Meter
        dist = randomInt(68, 116);
      } else {
        // Par 5: 122 bis 168 Meter
        dist = randomInt(122, 168);
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
 * Prüft, ob eine Restdistanz mit exakt einem einzigen Dart (Single, Double, Triple, 25, 50)
 * auf 0 gecheckt (eingelocht) werden kann, und liefert alle möglichen Zielfelder.
 */
export function getDirectCheckoutOptions(distance: number): {
  canCheckoutInOne: boolean;
  primaryLabel: string;
  allOptionsText: string;
  value: number;
} {
  if (distance <= 0 || distance > 60) {
    return {
      canCheckoutInOne: false,
      primaryLabel: '',
      allOptionsText: '',
      value: distance,
    };
  }

  const options: string[] = [];

  if (distance === 50) {
    options.push('BULLSEYE (50)');
  }
  if (distance === 25) {
    options.push('SINGLE BULL (25)');
  }
  if (distance >= 1 && distance <= 20) {
    options.push(`Single ${distance}`);
  }
  if (distance % 2 === 0 && distance / 2 >= 1 && distance / 2 <= 20) {
    options.push(`D${distance / 2}`);
  }
  if (distance % 3 === 0 && distance / 3 >= 1 && distance / 3 <= 20) {
    options.push(`T${distance / 3}`);
  }

  if (options.length === 0) {
    return {
      canCheckoutInOne: false,
      primaryLabel: '',
      allOptionsText: '',
      value: distance,
    };
  }

  return {
    canCheckoutInOne: true,
    primaryLabel: options[0],
    allOptionsText: options.join(' · '),
    value: distance,
  };
}

/**
 * Gibt einen intelligenten Schläger-/Wurf-Tipp für die aktuelle Restdistanz zurück.
 */
export function getCaddyAdvice(distance: number): string {
  const chk = getDirectCheckoutOptions(distance);
  if (chk.canCheckoutInOne) {
    return `⛳ Putt zum Einlochen (${distance} m): ${chk.allOptionsText}!`;
  }
  if (distance > 60) {
    const afterT20 = Math.abs(distance - 60);
    const afterS20 = Math.abs(distance - 20);
    if (distance >= 70) {
      return `🏌️‍♂️ Driver: T20 (60 m) legt den Ball auf ${afterT20} m Rest (S20 → ${afterS20} m).`;
    }
    // 61..69m: T20 lässt 1..9m Putt übrig!
    return `🏌️‍♂️ Fairway-Holz: T20 (60 m) lässt ${afterT20} m Putt · BULL (50 m) lässt ${distance - 50} m!`;
  }
  // distance < 60, aber nicht direkt in 1 Dart checkbar (z.B. 59, 58, 56, 55, 53, 52, 49, 47, 46, 44, 43, 41, 37, 35, 31, 29, 23)
  if (distance > 40) {
    const layup20 = distance - 20;
    const layup25 = distance - 25;
    return `🎯 Annäherung (Chip): Single 20 → ${layup20} m Rest oder Bull (25) → ${layup25} m Rest! Vorsicht vor Triple-Überflug!`;
  }
  // 23, 29, 31, 35, 37
  const to16 = distance - 16;
  const to20 = distance - 20;
  if (to16 >= 1 && to16 <= 20) {
    return `🎯 Chip aufs Grün: Single ${to16} legt auf 16 m (D8/S16) · Single 20 legt auf ${to20} m!`;
  }
  return `🎯 Annäherung: Single ${to20} legt den Ball auf 20 m Rest!`;
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

/**
 * Simuliert einen einzelnen Dartwurf des Computer-Gegners anhand der Restdistanz
 * und des gewählten Bot-Handicaps (inkl. realistischer Annäherung, Putt & Überflug-Risiko).
 */
export function simulateGolfBotDart(
  distance: number,
  difficulty: GolfBotDifficulty
): { label: string; value: number } {
  const cfg = GOLF_BOT_CONFIGS[difficulty] || GOLF_BOT_CONFIGS.clubmeister;
  const roll = Math.random();

  // 1. Falls direkt mit 1 Dart checkbar
  const chk = getDirectCheckoutOptions(distance);
  if (chk.canCheckoutInOne) {
    // Leichter bei Single (1..20) als bei Triple/Bullseye
    const isEasySingle = distance >= 1 && distance <= 20;
    const hitProb = isEasySingle
      ? Math.min(0.95, cfg.exactCheckoutChance + 0.22)
      : cfg.exactCheckoutChance;

    if (roll < hitProb) {
      return { label: chk.primaryLabel.replace('Single ', 'S'), value: distance };
    }

    // Verfehlt beim Putt:
    // Chance auf versehentliches Doppel/Triple (Overshoot!)
    if (isEasySingle && Math.random() < cfg.accidentalTripleChance) {
      const mult = Math.random() < 0.55 ? 2 : 3;
      const val = distance * mult;
      return { label: `${mult === 2 ? 'D' : 'T'}${distance}`, value: val };
    }

    // Oder trifft Single statt Doppel/Triple (Annäherung ohne Überflug)
    if (!isEasySingle && distance % 2 === 0 && distance / 2 <= 20 && Math.random() < 0.65) {
      const half = distance / 2;
      return { label: `S${half}`, value: half };
    }
    if (!isEasySingle && distance % 3 === 0 && distance / 3 <= 20 && Math.random() < 0.7) {
      const third = distance / 3;
      return { label: `S${third}`, value: third };
    }
    if (distance === 50 && Math.random() < 0.65) {
      return { label: '25', value: 25 };
    }

    // Oder verfehlt am Draht vorbei (0m) oder kleines Nachbarfeld
    if (Math.random() < 0.55) {
      return { label: 'MISS', value: 0 };
    }
    const neighbor = Math.max(1, Math.min(20, distance <= 20 ? distance : 12));
    return { label: `S${neighbor}`, value: neighbor };
  }

  // 2. Langer Schlag (Distance > 60m)
  if (distance > 60) {
    if (Math.random() < cfg.missChance * 0.4) {
      return { label: 'S5', value: 5 };
    }
    if (Math.random() < cfg.goodDriveChance) {
      // Starker Drive: T20 (60), T19 (57), T18 (54) oder Bullseye (50)
      const drives = [
        { label: 'T20', value: 60 },
        { label: 'T19', value: 57 },
        { label: 'T18', value: 54 },
        { label: 'BULL', value: 50 },
      ];
      // Wähle Drive, der möglichst gut auf <= 20m oder gerade Zahl stellt
      const bestDrive =
        drives.find((d) => distance - d.value >= 1 && distance - d.value <= 20) ||
        drives[0];
      return bestDrive;
    }
    // Normaler Single-Drive (S20 oder S19)
    return Math.random() < 0.7
      ? { label: 'S20', value: 20 }
      : { label: 'S19', value: 19 };
  }

  // 3. Mittlere Annäherung (21..59m, nicht in 1 Dart checkbar)
  // Ziel: Ein Single treffen, sodass 1..20m Rest bleibt!
  const desiredLeave = distance > 36 ? 20 : 16;
  const neededSingle = Math.max(1, Math.min(20, distance - desiredLeave));

  if (Math.random() < cfg.missChance) {
    return { label: 'MISS', value: 0 };
  }

  // Versehentlicher Triple-Treffer beim Annähern -> Überflug!
  if (Math.random() < cfg.accidentalTripleChance) {
    return { label: `T${neededSingle}`, value: neededSingle * 3 };
  }

  if (Math.random() < cfg.goodDriveChance) {
    return { label: `S${neededSingle}`, value: neededSingle };
  }

  return { label: 'S20', value: 20 };
}
