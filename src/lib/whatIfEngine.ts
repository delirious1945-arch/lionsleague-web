/**
 * What-if- und Prognose-Modul der Dart Analytics Engine (TypeScript-Portierung).
 * 
 * Zeigt, wie sich der Average eines Spielers verbessern würde, wenn er z. B. seine
 * Doppelquote steigert oder weniger Darts in der Setup-Phase braucht.
 * 
 * Modell (bewusst transparent und nachvollziehbar):
 *     Darts pro Leg  = S + 1 / p
 *     Average        = (Startscore / Darts pro Leg) * 3
 * mit
 *     S = Setup-Darts (Darts bis zur Finish-Zone, Restscore <= FINISH_REST_THRESHOLD)
 *     p = Doppelquote pro Dart auf Doppel (0 < p <= 1)
 */

export const FINISH_REST_THRESHOLD = 170;
export const WHATIF_START_SCORE = 501;
export const WHATIF_MIN_DARTS_PER_LEG = 9;
export const WHATIF_MIN_LEGS = 10;
export const WHATIF_CONFIDENCE_Z = 1.96;

export interface PredictAverageResult {
  valid: boolean;
  hinweis?: string;
  setup_darts?: number;
  double_rate?: number;
  double_darts?: number;
  darts_per_leg?: number;
  average?: number;
}

export interface ScenarioResult {
  valid: boolean;
  hinweis?: string;
  baseline?: PredictAverageResult;
  scenario?: PredictAverageResult;
  delta_average?: number;
  delta_darts_per_leg?: number;
}

export interface RequiredDoubleRateResult {
  valid: boolean;
  hinweis?: string;
  required_double_rate?: number;
  darts_per_leg_target?: number;
}

export interface RequiredSetupDartsResult {
  valid: boolean;
  hinweis?: string;
  max_setup_darts?: number;
  darts_per_leg_target?: number;
}

export interface EstimateSetupDartsResult {
  sufficient: boolean;
  sample_legs: number;
  hinweis?: string;
  setup_darts_mean?: number;
  setup_darts_low?: number;
  setup_darts_high?: number;
}

export interface AverageBandResult {
  valid: boolean;
  hinweis?: string;
  average_low?: number;
  average_high?: number;
}

function isValidDoubleRate(p: number | undefined | null): boolean {
  return p !== undefined && p !== null && !isNaN(p) && p > 0.0 && p <= 1.0;
}

export function calculate3DartAverage(points: number, darts: number): number {
  if (darts <= 0) return 0;
  return Number(((points / darts) * 3).toFixed(2));
}

/**
 * Prognostiziert Darts pro Leg und 3-Dart-Average aus Setup-Darts und Doppelquote.
 * doubleRate als Anteil (0.20 = 20 %).
 */
export function predictAverage(
  setupDarts: number,
  doubleRate: number,
  startScore: number = WHATIF_START_SCORE
): PredictAverageResult {
  if (setupDarts === undefined || setupDarts === null || isNaN(setupDarts) || setupDarts < 0 || !isValidDoubleRate(doubleRate)) {
    return {
      valid: false,
      hinweis: 'Ungültige Eingabe: Setup-Darts müssen >= 0 und die Doppelquote muss > 0 und <= 100 % sein.',
    };
  }

  const doubleDarts = 1.0 / doubleRate;
  const dartsPerLeg = setupDarts + doubleDarts;
  if (dartsPerLeg < WHATIF_MIN_DARTS_PER_LEG) {
    return {
      valid: false,
      hinweis: `Unrealistisch: weniger als ${WHATIF_MIN_DARTS_PER_LEG} Darts pro Leg sind bei ${startScore} Punkten nicht möglich.`,
    };
  }

  const average = calculate3DartAverage(startScore, dartsPerLeg);
  return {
    valid: true,
    setup_darts: Number(setupDarts.toFixed(2)),
    double_rate: doubleRate,
    double_darts: Number(doubleDarts.toFixed(2)),
    darts_per_leg: Number(dartsPerLeg.toFixed(2)),
    average,
  };
}

/**
 * Vergleicht den Ist-Zustand mit einem Szenario.
 * setupDartsDelta ist negativ, wenn der Spieler weniger Setup-Darts braucht (z. B. -2).
 */
export function simulateScenario(
  setupDarts: number,
  doubleRate: number,
  newDoubleRate?: number | null,
  setupDartsDelta: number = 0.0,
  startScore: number = WHATIF_START_SCORE
): ScenarioResult {
  const baseline = predictAverage(setupDarts, doubleRate, startScore);
  if (!baseline.valid) {
    return { valid: false, hinweis: baseline.hinweis };
  }

  const scenarioRate = newDoubleRate !== undefined && newDoubleRate !== null ? newDoubleRate : doubleRate;
  const targetSetup = Math.max(setupDarts + setupDartsDelta, 0.0);
  const scenario = predictAverage(targetSetup, scenarioRate, startScore);
  if (!scenario.valid) {
    return { valid: false, hinweis: scenario.hinweis };
  }

  return {
    valid: true,
    baseline,
    scenario,
    delta_average: Number(((scenario.average || 0) - (baseline.average || 0)).toFixed(2)),
    delta_darts_per_leg: Number(((scenario.darts_per_leg || 0) - (baseline.darts_per_leg || 0)).toFixed(2)),
  };
}

/**
 * Umkehrrechnung: Welche Doppelquote braucht es für einen Ziel-Average bei gegebenen Setup-Darts?
 */
export function requiredDoubleRate(
  targetAverage: number,
  setupDarts: number,
  startScore: number = WHATIF_START_SCORE
): RequiredDoubleRateResult {
  if (targetAverage <= 0 || setupDarts < 0) {
    return { valid: false, hinweis: 'Ungültige Eingabe für die Umkehrrechnung.' };
  }

  const dartsNeeded = (startScore * 3.0) / targetAverage;
  const doubleDarts = dartsNeeded - setupDarts;
  if (doubleDarts < 1.0) {
    return {
      valid: false,
      hinweis: 'Mit diesen Setup-Darts ist das Ziel im Modell nicht erreichbar, selbst bei 100 % Doppelquote. Setup-Darts müssen sinken.',
    };
  }

  return {
    valid: true,
    required_double_rate: Number((1.0 / doubleDarts).toFixed(4)),
    darts_per_leg_target: Number(dartsNeeded.toFixed(2)),
  };
}

/**
 * Umkehrrechnung: Wie viele Setup-Darts dürfen es höchstens sein, um den Ziel-Average zu erreichen?
 */
export function requiredSetupDarts(
  targetAverage: number,
  doubleRate: number,
  startScore: number = WHATIF_START_SCORE
): RequiredSetupDartsResult {
  if (targetAverage <= 0 || !isValidDoubleRate(doubleRate)) {
    return { valid: false, hinweis: 'Ungültige Eingabe für die Umkehrrechnung.' };
  }

  const dartsNeeded = (startScore * 3.0) / targetAverage;
  const setup = dartsNeeded - 1.0 / doubleRate;
  if (setup < 0 || dartsNeeded < WHATIF_MIN_DARTS_PER_LEG) {
    return {
      valid: false,
      hinweis: 'Mit dieser Doppelquote ist das Ziel im Modell nicht erreichbar.',
    };
  }

  return {
    valid: true,
    max_setup_darts: Number(setup.toFixed(2)),
    darts_per_leg_target: Number(dartsNeeded.toFixed(2)),
  };
}

/**
 * Schätzt Setup-Darts aus Leg-Visits:
 * Darts bis die Finish-Zone (Restscore <= FINISH_REST_THRESHOLD) erreicht wurde.
 */
export function estimateSetupDartsFromLegs(
  legsVisits: Array<Array<{ score: number; rest_score: number }>>
): EstimateSetupDartsResult {
  const setupDartCounts: number[] = [];

  for (const leg of legsVisits) {
    let visitsBeforeFinish = 0;
    let reached = false;
    for (const v of leg) {
      const scoreBefore = (v.rest_score ?? WHATIF_START_SCORE) + (v.score ?? 0);
      if (scoreBefore <= FINISH_REST_THRESHOLD) {
        reached = true;
        break;
      }
      visitsBeforeFinish++;
    }
    if (reached) {
      setupDartCounts.push(visitsBeforeFinish * 3);
    }
  }

  const n = setupDartCounts.length;
  if (n < WHATIF_MIN_LEGS) {
    return {
      sufficient: false,
      sample_legs: n,
      hinweis: `Zu wenig Daten (${n} Legs mit erreichter Finish-Zone, mindestens ${WHATIF_MIN_LEGS} nötig). Es wird keine verlässliche Zahl ausgewiesen.`,
    };
  }

  const mean = setupDartCounts.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1
    ? setupDartCounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1)
    : 0;
  const std = Math.sqrt(variance);
  const margin = (WHATIF_CONFIDENCE_Z * std) / Math.sqrt(n);

  return {
    sufficient: true,
    sample_legs: n,
    setup_darts_mean: Number(mean.toFixed(2)),
    setup_darts_low: Number(Math.max(mean - margin, 0.0).toFixed(2)),
    setup_darts_high: Number((mean + margin).toFixed(2)),
  };
}

/**
 * Bandbreite des prognostizierten Averages bei statistischer Streuung der Setup-Darts.
 */
export function averageBand(
  setupDartsLow: number,
  setupDartsHigh: number,
  doubleRate: number,
  startScore: number = WHATIF_START_SCORE
): AverageBandResult {
  const best = predictAverage(setupDartsLow, doubleRate, startScore);
  const worst = predictAverage(setupDartsHigh, doubleRate, startScore);
  if (!best.valid || !worst.valid) {
    return { valid: false, hinweis: 'Bandbreite nicht berechenbar (ungültige Eingabe).' };
  }
  return {
    valid: true,
    average_low: worst.average,
    average_high: best.average,
  };
}
