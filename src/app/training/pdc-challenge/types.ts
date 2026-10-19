export type DartMultiplier = 0 | 1 | 2 | 3;

export interface DartThrow {
  multiplier: DartMultiplier;
  score: number;
}

export interface RoundHitEntry {
  multiplier: number; // 0..9 Treffer in den 3 Darts
  isShanghai: boolean; // true, wenn die 6 per Shanghai (S + D + T) geworfen wurde
}

export interface ShanghaiTargetRound {
  target: number; // z.B. 10..15 oder 15..20
  multiplier: number; // 0..9
  roundScore: number;
  isShanghai: boolean;
}

export interface DoubleTargetRound {
  target: string; // 'D1' ... 'D20', 'Bull'
  targetNumber: number; // 1..20, 25
  isHit: boolean | null; // true, false oder null
  score: number; // 50, 100 oder 0
}

export const PART1_TARGETS = [10, 11, 12, 13, 14, 15];
export const PART2_TARGETS = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10',
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D19', 'D20',
  'Bull'
];
export const PART3_TARGETS = [15, 16, 17, 18, 19, 20];

export interface PdcBadgeInfo {
  name: string;
  icon: string;
  title: string;
  shortTitle: string;
  subTitle: string;
  colorHex: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  bgGlowClass: string;
  min: number;
  max: number;
  nextThreshold: number | null;
}

export const PDC_BADGES_LIST: PdcBadgeInfo[] = [
  {
    name: 'Gold',
    icon: '🏆',
    title: 'PDC-Profi / Tourcard-Niveau',
    shortTitle: 'PDC-Profi',
    subTitle: 'Tourcard / Weltklasse',
    colorHex: '#f59e0b',
    badgeClass: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/40 border border-amber-300',
    borderClass: 'border-amber-400',
    textClass: 'text-amber-300',
    bgGlowClass: 'from-amber-500/20 to-yellow-500/10',
    min: 1250,
    max: 9999,
    nextThreshold: null,
  },
  {
    name: 'Schwarz',
    icon: '⚫',
    title: 'Elite / Landesliga',
    shortTitle: 'Elite',
    subTitle: 'Landesliga / Top-Amateur',
    colorHex: '#0f172a',
    badgeClass: 'bg-slate-900 text-slate-100 font-black shadow-lg shadow-black/60 border border-slate-600',
    borderClass: 'border-slate-500',
    textClass: 'text-slate-200',
    bgGlowClass: 'from-slate-800/40 to-slate-950/60',
    min: 850,
    max: 1249,
    nextThreshold: 1250,
  },
  {
    name: 'Rot',
    icon: '🔴',
    title: 'Top-Niveau / Verbandsliga',
    shortTitle: 'Top-Niveau',
    subTitle: 'Verbandsliga / Leistungsspitze',
    colorHex: '#ef4444',
    badgeClass: 'bg-gradient-to-r from-red-600 to-rose-700 text-white font-black shadow-lg shadow-red-600/40 border border-red-400',
    borderClass: 'border-red-400',
    textClass: 'text-red-400',
    bgGlowClass: 'from-red-500/20 to-rose-950/30',
    min: 700,
    max: 849,
    nextThreshold: 850,
  },
  {
    name: 'Blau',
    icon: '🔵',
    title: 'Starker Stammspieler (Oberliga)',
    shortTitle: 'Stammspieler',
    subTitle: 'Oberliga / Stammkraft',
    colorHex: '#3b82f6',
    badgeClass: 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black shadow-lg shadow-blue-600/40 border border-blue-400',
    borderClass: 'border-blue-400',
    textClass: 'text-blue-400',
    bgGlowClass: 'from-blue-500/20 to-indigo-950/30',
    min: 600,
    max: 699,
    nextThreshold: 700,
  },
  {
    name: 'Grün',
    icon: '🟢',
    title: 'Ambitionierter Ligaspieler (Bezirksliga)',
    shortTitle: 'Ligaspieler',
    subTitle: 'Bezirksliga / Ambitioniert',
    colorHex: '#22c55e',
    badgeClass: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black shadow-lg shadow-emerald-600/40 border border-emerald-400',
    borderClass: 'border-emerald-400',
    textClass: 'text-emerald-400',
    bgGlowClass: 'from-emerald-500/20 to-teal-950/30',
    min: 450,
    max: 599,
    nextThreshold: 600,
  },
  {
    name: 'Gelb',
    icon: '🟡',
    title: 'Solider Vereinsspieler (Kreisklasse / Freizeit)',
    shortTitle: 'Vereinsspieler',
    subTitle: 'Kreisklasse / Freizeit',
    colorHex: '#eab308',
    badgeClass: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-yellow-500/40 border border-yellow-300',
    borderClass: 'border-yellow-400',
    textClass: 'text-amber-400',
    bgGlowClass: 'from-yellow-500/20 to-amber-950/30',
    min: 300,
    max: 449,
    nextThreshold: 450,
  },
  {
    name: 'Lila',
    icon: '🟣',
    title: 'Fortgeschrittener Einsteiger',
    shortTitle: 'Fortgeschritten',
    subTitle: 'Erste Ligaerfahrung',
    colorHex: '#a855f7',
    badgeClass: 'bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white font-black shadow-lg shadow-purple-600/40 border border-purple-400',
    borderClass: 'border-purple-400',
    textClass: 'text-purple-400',
    bgGlowClass: 'from-purple-500/20 to-fuchsia-950/30',
    min: 150,
    max: 299,
    nextThreshold: 300,
  },
  {
    name: 'Weiß',
    icon: '⚪',
    title: 'Einsteiger (Grundlagenaufbau)',
    shortTitle: 'Einsteiger',
    subTitle: 'Grundlagenaufbau',
    colorHex: '#f8fafc',
    badgeClass: 'bg-slate-200 text-slate-900 font-black shadow-lg shadow-white/20 border border-white',
    borderClass: 'border-slate-300',
    textClass: 'text-slate-300',
    bgGlowClass: 'from-slate-700/20 to-slate-900/30',
    min: 0,
    max: 149,
    nextThreshold: 150,
  },
];

export function getPdcBadge(score: number): PdcBadgeInfo {
  for (const badge of PDC_BADGES_LIST) {
    if (score >= badge.min) {
      return badge;
    }
  }
  return PDC_BADGES_LIST[PDC_BADGES_LIST.length - 1];
}
