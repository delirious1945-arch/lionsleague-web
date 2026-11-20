export type RudolphFinalTarget = 'BULL' | 'BULLSEYE' | 'D20';

export const RUDOLPH_TOTAL_STEPS = 12;

export type RudolphZoneType =
  | 'outer_single'
  | 'inner_single'
  | 'double'
  | 'triple'
  | 'bull';

export type RudolphDifficulty = 'Klassisch' | 'Knackig' | 'Profi-Flug';

export function getRudolphZoneMeta(zoneType: RudolphZoneType): {
  badge: string;
  shortTag: string;
} {
  switch (zoneType) {
    case 'outer_single':
      return { badge: '⬜ GROSSES SINGLE (AUSSEN)', shortTag: 'AUSSEN' };
    case 'inner_single':
      return { badge: '🔹 KLEINES SINGLE (INNEN)', shortTag: 'INNEN' };
    case 'double':
      return { badge: '🔴 DOPPEL-FELD', shortTag: 'DOPPEL' };
    case 'triple':
      return { badge: '🔥 TRIPLE-FELD', shortTag: 'TRIPLE' };
    case 'bull':
      return { badge: '🎯 BULL-ZONE', shortTag: 'BULL' };
  }
}

export interface RudolphCheckpoint {
  step: number; // 1 bis 12
  location: string;
  title: string;
  icon: string;
  targetLabel: string;
  ruleHint: string;
  zoneType: RudolphZoneType;
  zoneBadge: string;
  zoneShort: string;
  specialType?: 'thaw' | 'trap' | 'shield' | 'finish';
  specialBadge?: string;
}

export interface RudolphStageSpec {
  targetLabel: string;
  zoneType: RudolphZoneType;
  ruleHint: string;
}

export interface RudolphRouteDefinition {
  id: string;
  index: number;
  name: string;
  icon: string;
  difficulty: RudolphDifficulty;
  tagline: string;
  stages: RudolphStageSpec[]; // 11 Etappen (Station 1 bis 11)
}

interface BaseStationMeta {
  step: number;
  location: string;
  title: string;
  icon: string;
  specialType?: 'thaw' | 'trap' | 'shield';
  specialBadge?: string;
}

const BASE_STATIONS: BaseStationMeta[] = [
  { step: 1, location: 'Nordpol', title: 'Startrampe', icon: '🛫' },
  { step: 2, location: 'Wichtel-Werkstatt', title: 'Geschenke aufladen', icon: '🧝' },
  { step: 3, location: 'Lebkuchen-Bäckerei', title: 'Plätzchen-Proviant', icon: '🍪' },
  {
    step: 4,
    location: 'Glühwein-Tanke',
    title: 'Heißer Boxenstopp',
    icon: '🍷',
    specialType: 'thaw',
    specialBadge: '🍷 TAUT EIS AUF',
  },
  { step: 5, location: 'Eisregen-Gipfel', title: 'Glatte Wolken', icon: '❄️' },
  {
    step: 6,
    location: 'Knecht Ruprecht',
    title: 'Ruten-Kontrolle',
    icon: '🧦',
    specialType: 'trap',
    specialBadge: '⚠️ 3× MISS = -1',
  },
  { step: 7, location: 'Tannenwald', title: 'Baumspitzen-Slalom', icon: '🎄' },
  { step: 8, location: 'Schneemann-Kreisel', title: 'Eisige Kurve', icon: '☃️' },
  {
    step: 9,
    location: 'Wichtel-Schleuder',
    title: 'Schild-Bonus',
    icon: '🎁',
    specialType: 'shield',
    specialBadge: '🛡️ GIBT SCHILD',
  },
  {
    step: 10,
    location: 'Grinch-Hinterhalt',
    title: 'Grinch-Falle',
    icon: '👹',
    specialType: 'trap',
    specialBadge: '⚠️ 3× MISS = -1',
  },
  { step: 11, location: 'Pechvogel-Wolke', title: 'Letzte Hürde', icon: '⚡' },
];

const outerSingle = (num: number): RudolphStageSpec => ({
  targetLabel: `${num} AUSSEN`,
  zoneType: 'outer_single',
  ruleHint: `Nur das große äußere Single-Feld der ${num} (zwischen Doppel & Triple) — kein Doppel/Triple!`,
});

const innerSingle = (num: number): RudolphStageSpec => ({
  targetLabel: `${num} INNEN`,
  zoneType: 'inner_single',
  ruleHint: `Nur das kleine innere Single-Feld der ${num} (zwischen Bull & Triple) — kein Doppel/Triple!`,
});

const dbl = (num: number): RudolphStageSpec => ({
  targetLabel: `D${num}`,
  zoneType: 'double',
  ruleHint: `Exakt Doppel ${num} (schmaler Außenring der ${num}) treffen!`,
});

const anyDouble = (): RudolphStageSpec => ({
  targetLabel: 'BEL. DOPPEL',
  zoneType: 'double',
  ruleHint: 'Beliebiges Doppel-Feld (D1–D20) treffen — Single zählt nicht!',
});

const redDouble = (): RudolphStageSpec => ({
  targetLabel: 'ROTES DOPPEL',
  zoneType: 'double',
  ruleHint: 'Beliebiges rotes Doppel-Feld treffen — Single/Triple zählt nicht!',
});

const greenDouble = (): RudolphStageSpec => ({
  targetLabel: 'GRÜNES DOPPEL',
  zoneType: 'double',
  ruleHint: 'Beliebiges grünes Doppel-Feld treffen — Single/Triple zählt nicht!',
});

const tpl = (num: number): RudolphStageSpec => ({
  targetLabel: `T${num}`,
  zoneType: 'triple',
  ruleHint: `Exakt Triple ${num} (schmaler Innenring der ${num}) treffen!`,
});

const anyTriple = (): RudolphStageSpec => ({
  targetLabel: 'BEL. TRIPLE',
  zoneType: 'triple',
  ruleHint: 'Beliebiges Triple-Feld (T1–T20) treffen — kein Single/Doppel!',
});

const redTriple = (): RudolphStageSpec => ({
  targetLabel: 'ROTES TRIPLE',
  zoneType: 'triple',
  ruleHint: 'Beliebiges rotes Triple-Feld treffen — Single/Doppel zählt nicht!',
});

const greenTriple = (): RudolphStageSpec => ({
  targetLabel: 'GRÜNES TRIPLE',
  zoneType: 'triple',
  ruleHint: 'Beliebiges grünes Triple-Feld treffen — kein Single/Doppel!',
});

const singleBull = (): RudolphStageSpec => ({
  targetLabel: 'SINGLE BULL (25)',
  zoneType: 'bull',
  ruleHint: 'Exakt das grüne Single Bull (25) treffen — rotes Bullseye zählt hier nicht!',
});

export const RUDOLPH_ROUTES: RudolphRouteDefinition[] = [
  {
    id: 'route_1',
    index: 1,
    name: 'Polar-Express',
    icon: '🛷',
    difficulty: 'Klassisch',
    tagline: 'Abwechslungsreicher Mix aus Außen-/Innen-Singles, Doppeln & grünem Triple',
    stages: [
      outerSingle(20),
      innerSingle(19),
      dbl(18),
      redDouble(),
      innerSingle(17),
      outerSingle(16),
      greenTriple(),
      innerSingle(15),
      outerSingle(14),
      dbl(16),
      innerSingle(13),
    ],
  },
  {
    id: 'route_2',
    index: 2,
    name: 'Glühwein-Slalom',
    icon: '🍷',
    difficulty: 'Knackig',
    tagline: 'Enger Slalom über Triple, rotes Triple, Single Bull & Doppel 8',
    stages: [
      innerSingle(20),
      outerSingle(18),
      anyTriple(),
      redTriple(),
      outerSingle(12),
      dbl(10),
      greenDouble(),
      innerSingle(19),
      singleBull(),
      innerSingle(14),
      dbl(8),
    ],
  },
  {
    id: 'route_3',
    index: 3,
    name: 'Grinch-Sturmflug',
    icon: '👹',
    difficulty: 'Profi-Flug',
    tagline: 'Vollgas-Auftakt mit T20 und harter Doppel-/Triple-Dichte',
    stages: [
      tpl(20),
      outerSingle(19),
      innerSingle(16),
      redDouble(),
      dbl(12),
      innerSingle(15),
      greenTriple(),
      innerSingle(18),
      dbl(16),
      anyTriple(),
      outerSingle(13),
    ],
  },
  {
    id: 'route_4',
    index: 4,
    name: 'Wichtel-Präzision',
    icon: '🧝',
    difficulty: 'Knackig',
    tagline: 'Millimeter-Arbeit auf kleinen Singles, T19 & Single Bull',
    stages: [
      outerSingle(19),
      innerSingle(20),
      dbl(20),
      redDouble(),
      outerSingle(17),
      tpl(19),
      innerSingle(14),
      dbl(14),
      innerSingle(16),
      singleBull(),
      anyTriple(),
    ],
  },
  {
    id: 'route_5',
    index: 5,
    name: 'Schneesturm-Zickzack',
    icon: '❄️',
    difficulty: 'Klassisch',
    tagline: 'Quer übers ganze Board mit T18 als letzte Hürde vor Weyhausen',
    stages: [
      outerSingle(18),
      dbl(9),
      innerSingle(17),
      redTriple(),
      innerSingle(20),
      anyDouble(),
      outerSingle(15),
      innerSingle(11),
      greenDouble(),
      innerSingle(13),
      tpl(18),
    ],
  },
  {
    id: 'route_6',
    index: 6,
    name: 'Glocken-Doppel-Tour',
    icon: '🔔',
    difficulty: 'Knackig',
    tagline: 'Doppel-lastige Route von Tops bis Single Bull',
    stages: [
      dbl(20),
      outerSingle(16),
      innerSingle(14),
      redDouble(),
      anyTriple(),
      innerSingle(19),
      greenDouble(),
      innerSingle(12),
      outerSingle(20),
      dbl(8),
      singleBull(),
    ],
  },
  {
    id: 'route_7',
    index: 7,
    name: 'Nordlicht-Express',
    icon: '✨',
    difficulty: 'Klassisch',
    tagline: 'Unterhalb und quer — jede Aufnahme fordert einen neuen Ring',
    stages: [
      outerSingle(17),
      innerSingle(15),
      outerSingle(19),
      redDouble(),
      dbl(16),
      innerSingle(18),
      greenTriple(),
      innerSingle(20),
      dbl(10),
      innerSingle(16),
      anyTriple(),
    ],
  },
  {
    id: 'route_8',
    index: 8,
    name: 'Plätzchen-Parcours',
    icon: '🍪',
    difficulty: 'Klassisch',
    tagline: 'Süße Singles treffen auf knusprige Doppel und Triple 17',
    stages: [
      outerSingle(15),
      innerSingle(13),
      dbl(12),
      redTriple(),
      innerSingle(19),
      outerSingle(14),
      greenDouble(),
      innerSingle(17),
      tpl(17),
      dbl(6),
      innerSingle(20),
    ],
  },
  {
    id: 'route_9',
    index: 9,
    name: 'Ruprechts Härteprüfung',
    icon: '🧦',
    difficulty: 'Profi-Flug',
    tagline: 'T19, T15, D18 & D4 — hier trennt sich Rudolph vom Elch!',
    stages: [
      innerSingle(20),
      tpl(19),
      dbl(16),
      redTriple(),
      innerSingle(14),
      dbl(18),
      innerSingle(16),
      singleBull(),
      tpl(15),
      dbl(4),
      innerSingle(18),
    ],
  },
  {
    id: 'route_10',
    index: 10,
    name: 'Tannenbaum-Sturzflug',
    icon: '🎄',
    difficulty: 'Knackig',
    tagline: 'Grünes Triple im Tannenwald und D20 im Grinch-Hinterhalt',
    stages: [
      outerSingle(16),
      innerSingle(18),
      anyTriple(),
      redDouble(),
      innerSingle(19),
      innerSingle(12),
      greenTriple(),
      dbl(10),
      innerSingle(17),
      dbl(20),
      innerSingle(15),
    ],
  },
];

export function getRudolphRouteById(routeId?: string): RudolphRouteDefinition {
  if (routeId) {
    const found = RUDOLPH_ROUTES.find((r) => r.id === routeId);
    if (found) return found;
  }
  return RUDOLPH_ROUTES[0];
}

export function pickRandomRudolphRoute(excludeRouteId?: string): RudolphRouteDefinition {
  const candidates =
    excludeRouteId && RUDOLPH_ROUTES.length > 1
      ? RUDOLPH_ROUTES.filter((r) => r.id !== excludeRouteId)
      : RUDOLPH_ROUTES;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] || RUDOLPH_ROUTES[0];
}

export function getRudolphCheckpoints(
  finalTarget: RudolphFinalTarget,
  routeId?: string
): RudolphCheckpoint[] {
  const route = getRudolphRouteById(routeId);

  const stages1to11: RudolphCheckpoint[] = BASE_STATIONS.map((station, i) => {
    const spec = route.stages[i] || route.stages[0];
    const zoneMeta = getRudolphZoneMeta(spec.zoneType);

    let extraHint = '';
    if (station.specialType === 'thaw') {
      extraHint = ' Taut vereiste Kufen sofort auf!';
    } else if (station.specialType === 'trap') {
      extraHint = ' Achtung: 3× Miss = -1 Etappe zurück!';
    } else if (station.specialType === 'shield') {
      extraHint = ' Schenkt dir ein 🛡️ Wichtel-Schild!';
    }

    return {
      step: station.step,
      location: station.location,
      title: station.title,
      icon: station.icon,
      targetLabel: spec.targetLabel,
      ruleHint: `${spec.ruleHint}${extraHint}`,
      zoneType: spec.zoneType,
      zoneBadge: zoneMeta.badge,
      zoneShort: zoneMeta.shortTag,
      specialType: station.specialType,
      specialBadge: station.specialBadge,
    };
  });

  const finishZoneType: RudolphZoneType = finalTarget === 'D20' ? 'double' : 'bull';
  const finishZoneMeta = getRudolphZoneMeta(finishZoneType);

  const finalCheckpoint: RudolphCheckpoint = {
    step: 12,
    location: 'Weyhausen',
    title: 'Lions-Landebahn',
    icon: '🏟️',
    targetLabel:
      finalTarget === 'D20'
        ? 'D20'
        : finalTarget === 'BULLSEYE'
        ? 'BULLSEYE (50)'
        : 'BULL (25/50)',
    ruleHint:
      finalTarget === 'D20'
        ? 'Exakt Doppel 20 (Tops) für die Landung im Vereinsheim!'
        : finalTarget === 'BULLSEYE'
        ? 'Exakt das innere rote Bullseye (50) für die Landung im Vereinsheim!'
        : 'Bullseye (50) oder Single Bull (25) für die Landung im Vereinsheim!',
    zoneType: finishZoneType,
    zoneBadge: finishZoneMeta.badge,
    zoneShort: finishZoneMeta.shortTag,
    specialType: 'finish',
    specialBadge: '🏆 ZIEL',
  };

  return [...stages1to11, finalCheckpoint];
}

export interface RudolphDartEvent {
  kind: 'hit' | 'turbo' | 'sabotage' | 'crash' | 'trap' | 'shield' | 'win' | 'miss';
  checkpointStep?: number;
  label: string;
  subLabel: string;
}

export interface RudolphPlayerState {
  completedSteps: number; // 0 bis 12 (12 = Landung in Weyhausen)
  dartsThrown: number;
  roundsPlayed: number;
  bestTurnSteps: number;
  currentTurnDarts: RudolphDartEvent[];
  isFrozen: boolean;
  hasShield: boolean;
  sabotagesLanded: number;
  crashesCaused: number;
  sabotagedThisTurn: boolean;
}

export interface RudolphLastActionBanner {
  id: number;
  tone: 'hit' | 'turbo' | 'sabotage' | 'crash' | 'trap' | 'shield' | 'win' | 'miss' | 'info';
  icon: string;
  headline: string;
  subline: string;
  actorPlayer: 1 | 2;
}

export interface RudolphLiveData {
  finalTarget: RudolphFinalTarget;
  chaosEnabled: boolean;
  routeId: string;
  routeName: string;
  routeDifficulty: RudolphDifficulty;
  roundNumber: number;
  p1: RudolphPlayerState;
  p2: RudolphPlayerState;
  lastAction?: RudolphLastActionBanner | null;
  winnerPlayer?: 1 | 2 | null;
  winnerName?: string | null;
}

export function createInitialRudolphPlayerState(): RudolphPlayerState {
  return {
    completedSteps: 0,
    dartsThrown: 0,
    roundsPlayed: 0,
    bestTurnSteps: 0,
    currentTurnDarts: [],
    isFrozen: false,
    hasShield: false,
    sabotagesLanded: 0,
    crashesCaused: 0,
    sabotagedThisTurn: false,
  };
}

export function cloneRudolphPlayerState(s: RudolphPlayerState): RudolphPlayerState {
  return {
    completedSteps: s.completedSteps ?? 0,
    dartsThrown: s.dartsThrown ?? 0,
    roundsPlayed: s.roundsPlayed ?? 0,
    bestTurnSteps: s.bestTurnSteps ?? 0,
    currentTurnDarts: Array.isArray(s.currentTurnDarts)
      ? s.currentTurnDarts.map((ev) => ({ ...ev }))
      : [],
    isFrozen: Boolean(s.isFrozen),
    hasShield: Boolean(s.hasShield),
    sabotagesLanded: s.sabotagesLanded ?? 0,
    crashesCaused: s.crashesCaused ?? 0,
    sabotagedThisTurn: Boolean(s.sabotagedThisTurn),
  };
}
