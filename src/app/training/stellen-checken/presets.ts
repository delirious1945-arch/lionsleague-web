import { StellenCheckenPreset, getPointsForTarget } from './types';

/**
 * Deterministischer Zufallsgenerator (Mulberry32), damit jede Preset-ID (1 bis 200)
 * auf allen Geräten und zu jeder Zeit exakt dieselbe 15-Zahlen-Reihenfolge liefert.
 */
function createSeededRandom(seed: number): () => number {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Erstellt die 200 festen Zufalls-Reihenfolgen (#001 bis #200) aus den Zahlen 3 bis 101.
 * Jede Reihenfolge umfasst genau 15 verschiedene Zahlen:
 * - 6 Zahlen aus dem Bereich 3–60 (je 1 Punkt)
 * - 5 Zahlen aus dem Bereich 61–80 (je 2 Punkte)
 * - 4 Zahlen aus dem Bereich 81–101 (je 3 Punkte)
 * Anschließend werden die 15 Zahlen in eine zufällige Reihenfolge gemischt.
 * Dadurch hat jedes der 200 Presets exakt 28 mögliche Maximalpunkte und ist 100 % fair vergleichbar.
 */
function buildAll200Presets(): StellenCheckenPreset[] {
  const tier1Pool: number[] = []; // 3..60
  const tier2Pool: number[] = []; // 61..80
  const tier3Pool: number[] = []; // 81..101

  for (let n = 3; n <= 60; n++) tier1Pool.push(n);
  for (let n = 61; n <= 80; n++) tier2Pool.push(n);
  for (let n = 81; n <= 101; n++) tier3Pool.push(n);

  const presets: StellenCheckenPreset[] = [];

  for (let id = 1; id <= 200; id++) {
    const rng = createSeededRandom(id * 9973 + 1337);
    const pickedTier1 = shuffleWithRng(tier1Pool, rng).slice(0, 6);
    const pickedTier2 = shuffleWithRng(tier2Pool, rng).slice(0, 5);
    const pickedTier3 = shuffleWithRng(tier3Pool, rng).slice(0, 4);

    const combined = shuffleWithRng(
      [...pickedTier1, ...pickedTier2, ...pickedTier3],
      rng
    );

    const maxPoints = combined.reduce((sum, num) => sum + getPointsForTarget(num), 0);

    presets.push({
      id,
      code: `#${String(id).padStart(3, '0')}`,
      targets: combined,
      maxPoints,
    });
  }

  return presets;
}

export const STELLEN_CHECKEN_PRESETS: StellenCheckenPreset[] = buildAll200Presets();

export function getPresetById(id: number): StellenCheckenPreset {
  const idx = Math.max(1, Math.min(200, Math.round(id))) - 1;
  return STELLEN_CHECKEN_PRESETS[idx];
}

export function getRandomPresetId(): number {
  return Math.floor(Math.random() * 200) + 1;
}

/**
 * Liefert für jede Zahl zwischen 3 und 101 einen empfohlenen Stell- und Checkout-Weg.
 */
const STANDARD_HINTS: Record<number, string> = {
  3: 'S1 ➔ D1',
  4: 'D2 (oder S2 ➔ D1)',
  5: 'S1 ➔ D2',
  6: 'D3 (oder S2 ➔ D2)',
  7: 'S3 ➔ D2',
  8: 'D4 (oder S4 ➔ D2)',
  9: 'S1 ➔ D4',
  10: 'D5 (oder S2 ➔ D4)',
  11: 'S3 ➔ D4',
  12: 'D6 (oder S4 ➔ D4)',
  13: 'S5 ➔ D4',
  14: 'D7 (oder S6 ➔ D4)',
  15: 'S7 ➔ D4',
  16: 'D8 (oder S8 ➔ D4)',
  17: 'S1 ➔ D8 (oder S9 ➔ D4)',
  18: 'D9 (oder S2 ➔ D8)',
  19: 'S3 ➔ D8',
  20: 'D10 (oder S4 ➔ D8)',
  21: 'S5 ➔ D8',
  22: 'D11 (oder S6 ➔ D8)',
  23: 'S7 ➔ D8',
  24: 'D12 (oder S8 ➔ D8)',
  25: 'S9 ➔ D8',
  26: 'D13 (oder S10 ➔ D8)',
  27: 'S11 ➔ D8 (oder S19 ➔ D4)',
  28: 'D14 (oder S12 ➔ D8)',
  29: 'S13 ➔ D8',
  30: 'D15 (oder S14 ➔ D8)',
  31: 'S15 ➔ D8',
  32: 'D16 (oder S16 ➔ D8)',
  33: 'S1 ➔ D16 (oder S17 ➔ D8)',
  34: 'D17 (oder S2 ➔ D16)',
  35: 'S3 ➔ D16',
  36: 'D18 (oder S4 ➔ D16)',
  37: 'S5 ➔ D16',
  38: 'D19 (oder S6 ➔ D16)',
  39: 'S7 ➔ D16',
  40: 'D20 (oder S8 ➔ D16)',
  41: 'S9 ➔ D16 (oder S1 ➔ D20)',
  42: 'S10 ➔ D16 (oder S2 ➔ D20)',
  43: 'S11 ➔ D16 (oder S3 ➔ D20)',
  44: 'S12 ➔ D16 (oder S4 ➔ D20)',
  45: 'S13 ➔ D16 (oder S5 ➔ D20)',
  46: 'S14 ➔ D16 (oder S6 ➔ D20)',
  47: 'S15 ➔ D16 (oder S7 ➔ D20)',
  48: 'S16 ➔ D16 (oder S8 ➔ D20)',
  49: 'S17 ➔ D16 (oder S9 ➔ D20)',
  50: 'Bullseye (oder S18 ➔ D16)',
  51: 'S19 ➔ D16 (oder S11 ➔ D20)',
  52: 'S20 ➔ D16 (oder S12 ➔ D20)',
  53: 'S13 ➔ D20',
  54: 'S14 ➔ D20',
  55: 'S15 ➔ D20',
  56: 'S16 ➔ D20 (oder T16 ➔ D4)',
  57: 'S17 ➔ D20',
  58: 'S18 ➔ D20',
  59: 'S19 ➔ D20',
  60: 'S20 ➔ D20',
  61: 'T15 ➔ D8 (oder S25 ➔ D18)',
  62: 'T10 ➔ D16 (oder S12 ➔ Bull)',
  63: 'T13 ➔ D12',
  64: 'T16 ➔ D8 (oder T14 ➔ D11)',
  65: 'S25 ➔ D20 (oder T19 ➔ D4)',
  66: 'T10 ➔ D18 (oder T14 ➔ D12)',
  67: 'T17 ➔ D8 (oder T9 ➔ D20)',
  68: 'T20 ➔ D4 (oder T16 ➔ D10)',
  69: 'T19 ➔ D6 (oder T15 ➔ D12)',
  70: 'T18 ➔ D8 (oder T20 ➔ D5)',
  71: 'T13 ➔ D16 (oder T17 ➔ D10)',
  72: 'T16 ➔ D12 (oder T20 ➔ D6)',
  73: 'T19 ➔ D8',
  74: 'T14 ➔ D16',
  75: 'T17 ➔ D12 (oder S25 ➔ Bull)',
  76: 'T20 ➔ D8',
  77: 'T19 ➔ D10',
  78: 'T18 ➔ D12',
  79: 'T19 ➔ D11 (oder T13 ➔ D20)',
  80: 'T20 ➔ D10 (oder D20 ➔ D20)',
  81: 'T19 ➔ D12 (oder T15 ➔ D18)',
  82: 'Bull ➔ D16 (oder T14 ➔ D20)',
  83: 'T17 ➔ D16',
  84: 'T20 ➔ D12 (oder T16 ➔ D18)',
  85: 'T15 ➔ D20 (oder T19 ➔ D14)',
  86: 'T18 ➔ D16',
  87: 'T17 ➔ D18',
  88: 'T20 ➔ D14 (oder T16 ➔ D20)',
  89: 'T19 ➔ D16',
  90: 'T20 ➔ D15 (oder T18 ➔ D18)',
  91: 'T17 ➔ D20',
  92: 'T20 ➔ D16',
  93: 'T19 ➔ D18',
  94: 'T18 ➔ D20',
  95: 'T19 ➔ D19 (oder S19 ➔ T20 ➔ D8)',
  96: 'T20 ➔ D18',
  97: 'T19 ➔ D20',
  98: 'T20 ➔ D19',
  99: 'T19 ➔ S10 ➔ D16',
  100: 'T20 ➔ D20',
  101: 'T20 ➔ S9 ➔ D16 (oder T17 ➔ Bull)',
};

export function getSetupCheckoutHint(target: number): string {
  return STANDARD_HINTS[target] || 'Stellen ➔ Doppel';
}
