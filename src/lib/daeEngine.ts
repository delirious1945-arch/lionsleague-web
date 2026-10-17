import { RawLegVisit } from './data';

export interface VisitStats {
  total_visits: number;
  total_score: number;
  average_visit: number;
  match_average: number;
  median_score: number;
  volatility_std: number;
  min_score: number;
  max_score: number;
  won_legs_count: number;
  total_legs_count: number;
  darts_per_leg: number;
  best_leg_darts: number;
  konstanz_label: string;
  konstanz_color: string;
  korridor_min: number;
  korridor_max: number;
}

export interface FirstNAverages {
  first_9_avg: number;
  first_12_avg: number;
  first_15_avg: number;
  first_18_avg: number;
}

export interface ScoreDistribution {
  buckets: Record<string, { count: number; pct: number }>;
  thresholds: Record<string, { count: number; pct: number; rate_per_100: number }>;
  total_visits: number;
}

export interface StartPerformance {
  avg_visit_1: number;
  avg_visit_2: number;
  avg_visit_3: number;
  first_3_avg: number;
  start_index: number;
  count_60: number;
  pct_60: number;
  count_100: number;
  pct_100: number;
  count_140: number;
  pct_140: number;
  count_180: number;
  pct_180: number;
  count_poor: number;
  pct_poor: number;
}

export interface PhaseSummary {
  average: number;
  volatility_std: number;
  sample_count: number;
  rate_100_pct: number;
}

export interface LegPhases {
  opening: PhaseSummary;
  mid_game: PhaseSummary;
  finish: PhaseSummary;
  phase_trend: string;
}

export interface RadarDimension {
  dim: string;
  key: string;
  value: number;
  label: string;
  desc: string;
}

export interface RadarMetrics {
  dimensions: RadarDimension[];
  overall_skill: number;
  overall_label: string;
}

export interface LegTrendPoint {
  index: number;
  leg_avg: number;
  is_win: boolean;
  darts_thrown: number;
  checkout: number | null;
  match_date: string;
  moving_avg_3: number;
}

export interface DartsToWinCategory {
  count: number;
  pct: number;
}

export interface DartsToWinEfficiency {
  elite: DartsToWinCategory; // <= 18
  liga_top: DartsToWinCategory; // 19-24
  norm: DartsToWinCategory; // 25-30
  arbeit: DartsToWinCategory; // 31-42
  zitter: DartsToWinCategory; // 43+
  best_leg: number;
  avg_darts: number;
  total_won_legs: number;
}

export interface LegAnatomy {
  power_pct: number;
  solid_pct: number;
  low_pct: number;
  finish_pct: number;
  count_26: number;
}

export interface AIScoutingCard {
  title: string;
  badge: string;
  badge_color: string;
  text: string;
}

// ----------------------------------------------------
// PSYCHOLOGIE & DRUCKMODELL (DAE 2.0 ARCHITECT)
// ----------------------------------------------------

export interface MentalSchoolGrade {
  dimension: string;
  grade: number; // 1.0 (sehr gut) bis 6.0 (ungenügend)
  grade_label: string; // 'Sehr gut', 'Gut', 'Befriedigend', etc.
  stars: number; // 1 bis 5 Sterne
  color: string;
  detail: string;
}

export interface PsychologicalMetrics {
  clutch_delta: number; // Differenz Druck-Average vs Baseline
  pressure_average: number;
  baseline_average: number;
  pressure_visits_count: number;
  tilt_index: number; // 0-100 (Mix aus A, B, C: Fehlwurf-Folgen, Miss-Doppel, 26er/Busts)
  instability_index: number; // 0-100 (% der Aufnahmen <= 30)
  score_ratio_60_to_sub40: number; // 60+ Aufnahmen geteilt durch <40 Aufnahmen
  lead_choke_count: number; // Verspielte Führungen (z.B. 2:0 -> 2:3)
  double_trouble_count: number; // Legs mit >9 Darts auf Doppel
  late_leg_drop: number; // First-9 vs Rest-of-Leg Differenz
  opponent_adaptation_factor: number; // Wie stark spiegelt der Spieler den Gegner?
  opponent_adaptation_label: string;
  short_legs_under_pressure: number;
  high_finishes_count: number;
  school_grades: MentalSchoolGrade[];
}

export interface DualArchetype {
  mental_type: string;
  mental_icon: string;
  mental_desc: string;
  team_role: 'Leader' | 'Punktegarant' | 'Joker' | 'Aufbau-Spieler';
  role_badge_color: string;
  role_desc: string;
}

export interface TrainingImpulse {
  title: string;
  focus: string;
  exercise: string;
  goal: string;
}

export interface MatchplanAdvice {
  board_recommendation: string;
  single_slot_recommendation: string;
  double_partner_profile: string;
}

export interface AIScoutingToneTexts {
  scout_mode: {
    pressure_summary: string;
    choke_analysis: string;
    consistency_verdict: string;
    hard_truth: string;
  };
  coach_mode: {
    pressure_summary: string;
    choke_analysis: string;
    consistency_verdict: string;
    motivational_boost: string;
  };
}

export interface AIScoutingProfile {
  archetype: string;
  archetype_icon: string;
  archetype_desc: string;
  dual_archetype: DualArchetype;
  mental_metrics: PsychologicalMetrics;
  scouting_texts: AIScoutingToneTexts;
  training_impulses: TrainingImpulse[];
  matchplan_advice: MatchplanAdvice;
  top_strengths: { name: string; value: number; label: string }[];
  bottom_weaknesses: { name: string; value: number; label: string }[];
  bounce_back: AIScoutingCard;
  pressure: AIScoutingCard;
  focus: AIScoutingCard;
  tactical_tips: string[];
}

export interface PlayerDAEAnalytics {
  playerId: number;
  playerName: string;
  isSimulated?: boolean;
  visit_stats: VisitStats;
  first_n: FirstNAverages;
  dist_data: ScoreDistribution;
  start_data: StartPerformance;
  phases: LegPhases;
  radar_metrics: RadarMetrics;
  leg_trend: LegTrendPoint[];
  darts_to_win: DartsToWinEfficiency;
  leg_anatomy: LegAnatomy;
  ai_profile: AIScoutingProfile;
  legs_count: number;
}

// ----------------------------------------------------
// BERECHNUNGS-ENGINE
// ----------------------------------------------------

export function computePlayerAnalytics(
  playerId: number,
  playerName: string,
  legsVisits: RawLegVisit[][]
): PlayerDAEAnalytics {
  const allScores: number[] = [];
  const legsPlainScores: number[][] = [];
  let wonLegsDarts: number[] = [];
  let bestLegDarts = 999;
  let wonLegsCount = 0;
  let totalDartsAll = 0;

  for (const leg of legsVisits) {
    if (!leg || leg.length === 0) continue;
    const scores = leg.map((v) => v.score);
    legsPlainScores.push(scores);
    allScores.push(...scores);

    const lastVisit = leg[leg.length - 1];
    const isWinner = lastVisit.winner_player_id === playerId;
    const actualDarts =
      lastVisit.darts_thrown && lastVisit.darts_thrown > 0
        ? lastVisit.darts_thrown
        : leg.length * 3;

    totalDartsAll += actualDarts;

    if (isWinner) {
      wonLegsCount++;
      wonLegsDarts.push(actualDarts);
      if (actualDarts < bestLegDarts) {
        bestLegDarts = actualDarts;
      }
    }
  }

  if (bestLegDarts === 999) bestLegDarts = 0;

  // Visit-Statistiken
  const totalVisits = allScores.length;
  const totalScore = allScores.reduce((a, b) => a + b, 0);
  const averageVisit = totalVisits > 0 ? totalScore / totalVisits : 0;
  const matchAvg =
    totalDartsAll > 0 ? (totalScore / totalDartsAll) * 3 : averageVisit;

  // Median & StdDev
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const medianScore =
    totalVisits > 0
      ? totalVisits % 2 === 0
        ? (sortedScores[totalVisits / 2 - 1] + sortedScores[totalVisits / 2]) / 2
        : sortedScores[Math.floor(totalVisits / 2)]
      : 0;

  const variance =
    totalVisits > 0
      ? allScores.reduce((acc, s) => acc + Math.pow(s - averageVisit, 2), 0) /
        totalVisits
      : 0;
  const volStd = Math.sqrt(variance);

  const dartsPerLeg =
    wonLegsDarts.length > 0
      ? wonLegsDarts.reduce((a, b) => a + b, 0) / wonLegsDarts.length
      : 0;

  let konstanzLabel = 'Ausgeglichen';
  let konstanzColor = '#FBBF24';
  if (volStd < 20) {
    konstanzLabel = 'Sehr stabil';
    konstanzColor = '#34D399';
  } else if (volStd < 28) {
    konstanzLabel = 'Solide';
    konstanzColor = '#38BDF8';
  } else if (volStd >= 35) {
    konstanzLabel = 'Volatil';
    konstanzColor = '#F87171';
  }

  const korridorMin = Math.max(0, Math.round(matchAvg - volStd));
  const korridorMax = Math.min(180, Math.round(matchAvg + volStd));

  const visitStats: VisitStats = {
    total_visits: totalVisits,
    total_score: totalScore,
    average_visit: Math.round(averageVisit * 10) / 10,
    match_average: Math.round(matchAvg * 10) / 10,
    median_score: Math.round(medianScore * 10) / 10,
    volatility_std: Math.round(volStd * 10) / 10,
    min_score: sortedScores.length > 0 ? sortedScores[0] : 0,
    max_score: sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0,
    won_legs_count: wonLegsCount,
    total_legs_count: legsVisits.length,
    darts_per_leg: Math.round(dartsPerLeg * 10) / 10,
    best_leg_darts: bestLegDarts,
    konstanz_label: konstanzLabel,
    konstanz_color: konstanzColor,
    korridor_min: korridorMin,
    korridor_max: korridorMax,
  };

  // First N Averages
  const f9: number[] = [];
  const f12: number[] = [];
  const f15: number[] = [];
  const f18: number[] = [];
  for (const leg of legsPlainScores) {
    f9.push(...leg.slice(0, 3));
    f12.push(...leg.slice(0, 4));
    f15.push(...leg.slice(0, 5));
    f18.push(...leg.slice(0, 6));
  }
  const avgArr = (arr: number[]) =>
    arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const firstN: FirstNAverages = {
    first_9_avg: Math.round(avgArr(f9) * 10) / 10,
    first_12_avg: Math.round(avgArr(f12) * 10) / 10,
    first_15_avg: Math.round(avgArr(f15) * 10) / 10,
    first_18_avg: Math.round(avgArr(f18) * 10) / 10,
  };

  // Score Distribution
  const bCounts: Record<string, number> = {
    '0-60': 0,
    '61-99': 0,
    '100-119': 0,
    '120-139': 0,
    '140-179': 0,
    '180': 0,
  };
  const tCounts: Record<string, number> = {
    '60+': 0,
    '80+': 0,
    '100+': 0,
    '140+': 0,
    '180': 0,
  };
  for (const s of allScores) {
    if (s <= 60) bCounts['0-60']++;
    else if (s <= 99) bCounts['61-99']++;
    else if (s <= 119) bCounts['100-119']++;
    else if (s <= 139) bCounts['120-139']++;
    else if (s <= 179) bCounts['140-179']++;
    else if (s === 180) bCounts['180']++;

    if (s >= 60) tCounts['60+']++;
    if (s >= 80) tCounts['80+']++;
    if (s >= 100) tCounts['100+']++;
    if (s >= 140) tCounts['140+']++;
    if (s === 180) tCounts['180']++;
  }

  const buckets: Record<string, { count: number; pct: number }> = {};
  for (const [k, v] of Object.entries(bCounts)) {
    buckets[k] = {
      count: v,
      pct: totalVisits > 0 ? Math.round((v / totalVisits) * 1000) / 10 : 0,
    };
  }

  const thresholds: Record<
    string,
    { count: number; pct: number; rate_per_100: number }
  > = {};
  for (const [k, v] of Object.entries(tCounts)) {
    thresholds[k] = {
      count: v,
      pct: totalVisits > 0 ? Math.round((v / totalVisits) * 1000) / 10 : 0,
      rate_per_100:
        totalVisits > 0 ? Math.round((v / totalVisits) * 1000) / 10 : 0,
    };
  }

  const distData: ScoreDistribution = {
    buckets,
    thresholds,
    total_visits: totalVisits,
  };

  // Start Performance
  const v1: number[] = [];
  const v2: number[] = [];
  const v3: number[] = [];
  const f3: number[] = [];
  for (const leg of legsVisits) {
    for (let i = 0; i < leg.length; i++) {
      const order = leg[i].visit_order || i + 1;
      const s = leg[i].score;
      if (order === 1) {
        v1.push(s);
        f3.push(s);
      } else if (order === 2) {
        v2.push(s);
        f3.push(s);
      } else if (order === 3) {
        v3.push(s);
        f3.push(s);
      }
    }
  }

  const avgV1 = avgArr(v1);
  const avgV2 = avgArr(v2);
  const avgV3 = avgArr(v3);
  const f3Avg = avgArr(f3);

  const c60 = f3.filter((s) => s >= 60).length;
  const c100 = f3.filter((s) => s >= 100).length;
  const c140 = f3.filter((s) => s >= 140).length;
  const c180 = f3.filter((s) => s === 180).length;
  const cPoor = f3.filter((s) => s <= 40).length;
  const f3Tot = f3.length;

  const startIndex = Math.round(
    Math.min(
      Math.max(
        (f3Avg > 0 ? f3Avg * 0.7 : 30) +
          (f3Tot > 0 ? (c100 / f3Tot) * 30 : 0) -
          (f3Tot > 0 ? (cPoor / f3Tot) * 20 : 0),
        10
      ),
      100
    )
  );

  const startData: StartPerformance = {
    avg_visit_1: Math.round(avgV1 * 10) / 10,
    avg_visit_2: Math.round(avgV2 * 10) / 10,
    avg_visit_3: Math.round(avgV3 * 10) / 10,
    first_3_avg: Math.round(f3Avg * 10) / 10,
    start_index: startIndex,
    count_60: c60,
    pct_60: f3Tot > 0 ? Math.round((c60 / f3Tot) * 1000) / 10 : 0,
    count_100: c100,
    pct_100: f3Tot > 0 ? Math.round((c100 / f3Tot) * 1000) / 10 : 0,
    count_140: c140,
    pct_140: f3Tot > 0 ? Math.round((c140 / f3Tot) * 1000) / 10 : 0,
    count_180: c180,
    pct_180: f3Tot > 0 ? Math.round((c180 / f3Tot) * 1000) / 10 : 0,
    count_poor: cPoor,
    pct_poor: f3Tot > 0 ? Math.round((cPoor / f3Tot) * 1000) / 10 : 0,
  };

  // Leg-Phasen
  const opScores: number[] = [];
  const midScores: number[] = [];
  const finScores: number[] = [];

  for (const leg of legsVisits) {
    for (let i = 0; i < leg.length; i++) {
      const v = leg[i];
      const order = v.visit_order || i + 1;
      const s = v.score;
      if (order <= 3) {
        opScores.push(s);
      } else if (order <= 6) {
        midScores.push(s);
      } else {
        finScores.push(s);
      }
    }
  }

  const makePhaseSummary = (sc: number[]): PhaseSummary => {
    if (sc.length === 0) {
      return { average: 0, volatility_std: 0, sample_count: 0, rate_100_pct: 0 };
    }
    const avg = avgArr(sc);
    const vr =
      sc.reduce((acc, s) => acc + Math.pow(s - avg, 2), 0) / sc.length;
    return {
      average: Math.round(avg * 10) / 10,
      volatility_std: Math.round(Math.sqrt(vr) * 10) / 10,
      sample_count: sc.length,
      rate_100_pct:
        Math.round((sc.filter((s) => s >= 100).length / sc.length) * 1000) / 10,
    };
  };

  const opSum = makePhaseSummary(opScores);
  const midSum = makePhaseSummary(midScores);
  const finSum = makePhaseSummary(finScores);

  let phaseTrend = 'Konstanter Phasen-Verlauf';
  if (opSum.average > 0 && finSum.average > 0) {
    const delta = finSum.average - opSum.average;
    if (delta > 8) phaseTrend = 'Starker Finisher (steigert sich zum Leg-Ende)';
    else if (delta < -8)
      phaseTrend = 'Starker Starter / Fader (baut nach starkem Start ab)';
  }

  const phases: LegPhases = {
    opening: opSum,
    mid_game: midSum,
    finish: finSum,
    phase_trend: phaseTrend,
  };

  // Skill-Radar (6 Dimensionen)
  const scoreStart = Math.min(Math.max(startIndex * 1.15, 0), 100);
  const scoreMid =
    midSum.average > 0
      ? Math.min(Math.max(15 + (midSum.average - 20) * 1.6, 10), 100)
      : 0;
  const scorePower =
    matchAvg > 0
      ? Math.min(Math.max(15 + (matchAvg - 20) * 2.2, 10), 100)
      : 0;
  const scoreKonstanz =
    volStd > 0
      ? Math.min(Math.max(100 - (volStd - 12) * 1.8, 20), 100)
      : 50;
  const scoreFinish =
    dartsPerLeg > 0
      ? Math.min(Math.max(100 - (dartsPerLeg - 21) * 2.5, 15), 100)
      : 40;

  const r100 = thresholds['100+']?.rate_per_100 || 0;
  const r140 = thresholds['140+']?.rate_per_100 || 0;
  const r180 = thresholds['180']?.rate_per_100 || 0;
  const scoreDanger = Math.min(
    Math.max(20 + r100 * 3.5 + r140 * 10.0 + r180 * 20.0, 10),
    100
  );

  const getRatingLabel = (v: number) => {
    if (v >= 80) return 'Herausragend';
    if (v >= 65) return 'Stark';
    if (v >= 50) return 'Solide';
    if (v >= 35) return 'Ausbaufähig';
    return 'Basis-Niveau';
  };

  const radarDimensions: RadarDimension[] = [
    {
      dim: '🏹 Start-Stärke',
      key: 'start',
      value: Math.round(scoreStart * 10) / 10,
      label: getRatingLabel(scoreStart),
      desc: 'Auftaktstärke & Druck in Visits 1–3',
    },
    {
      dim: '⚔️ Mid-Game',
      key: 'mid',
      value: Math.round(scoreMid * 10) / 10,
      label: getRatingLabel(scoreMid),
      desc: 'Konstanz & Scoring in Visits 4–6',
    },
    {
      dim: '🎯 Power-Scoring',
      key: 'power',
      value: Math.round(scorePower * 10) / 10,
      label: getRatingLabel(scorePower),
      desc: 'Gesamt-Durchschnitt & Wurfgewalt',
    },
    {
      dim: '🔥 Highscore-Gefahr',
      key: 'danger',
      value: Math.round(scoreDanger * 10) / 10,
      label: getRatingLabel(scoreDanger),
      desc: 'Frequenz von 100+, 140+ und 180ern',
    },
    {
      dim: '⚡ Wurfkonstanz',
      key: 'konstanz',
      value: Math.round(scoreKonstanz * 10) / 10,
      label: getRatingLabel(scoreKonstanz),
      desc: 'Geringe Streuung & Wiederholgenauigkeit',
    },
    {
      dim: '🏁 Finish-Effizienz',
      key: 'finish',
      value: Math.round(scoreFinish * 10) / 10,
      label: getRatingLabel(scoreFinish),
      desc: 'Effizienz auf Doppel & Darts per Leg',
    },
  ];

  const overallSkill =
    Math.round(
      (radarDimensions.reduce((a, b) => a + b.value, 0) /
        radarDimensions.length) *
        10
    ) / 10;

  const radarMetrics: RadarMetrics = {
    dimensions: radarDimensions,
    overall_skill: overallSkill,
    overall_label: getRatingLabel(overallSkill),
  };

  // ----------------------------------------------------
  // GRAFIK 1: Chronologischer Leg-Average-Trend
  // ----------------------------------------------------
  const legTrend: LegTrendPoint[] = [];
  const recentAvgs: number[] = [];

  legsVisits.forEach((leg, idx) => {
    if (!leg || leg.length === 0) return;
    const scores = leg.map((v) => v.score);
    const lastVisit = leg[leg.length - 1];
    const isWin = lastVisit.winner_player_id === playerId;
    const darts =
      lastVisit.darts_thrown && lastVisit.darts_thrown > 0
        ? lastVisit.darts_thrown
        : leg.length * 3;
    const legPts = scores.reduce((a, b) => a + b, 0);
    const legAvg = darts > 0 ? (legPts / darts) * 3 : 0;

    recentAvgs.push(legAvg);
    const last3 = recentAvgs.slice(-3);
    const movingAvg3 = last3.reduce((a, b) => a + b, 0) / last3.length;

    legTrend.push({
      index: idx + 1,
      leg_avg: Math.round(legAvg * 10) / 10,
      is_win: isWin,
      darts_thrown: darts,
      checkout: lastVisit.checkout || null,
      match_date: lastVisit.match_date || '',
      moving_avg_3: Math.round(movingAvg3 * 10) / 10,
    });
  });

  // ----------------------------------------------------
  // GRAFIK 2: Darts-to-Win Effizienz & Leg-Längen
  // ----------------------------------------------------
  let cElite = 0;
  let cLigaTop = 0;
  let cNorm = 0;
  let cArbeit = 0;
  let cZitter = 0;

  for (const d of wonLegsDarts) {
    if (d <= 18) cElite++;
    else if (d <= 24) cLigaTop++;
    else if (d <= 30) cNorm++;
    else if (d <= 42) cArbeit++;
    else cZitter++;
  }

  const wTotal = wonLegsDarts.length;
  const dartsToWin: DartsToWinEfficiency = {
    elite: {
      count: cElite,
      pct: wTotal > 0 ? Math.round((cElite / wTotal) * 1000) / 10 : 0,
    },
    liga_top: {
      count: cLigaTop,
      pct: wTotal > 0 ? Math.round((cLigaTop / wTotal) * 1000) / 10 : 0,
    },
    norm: {
      count: cNorm,
      pct: wTotal > 0 ? Math.round((cNorm / wTotal) * 1000) / 10 : 0,
    },
    arbeit: {
      count: cArbeit,
      pct: wTotal > 0 ? Math.round((cArbeit / wTotal) * 1000) / 10 : 0,
    },
    zitter: {
      count: cZitter,
      pct: wTotal > 0 ? Math.round((cZitter / wTotal) * 1000) / 10 : 0,
    },
    best_leg: bestLegDarts,
    avg_darts: Math.round(dartsPerLeg * 10) / 10,
    total_won_legs: wTotal,
  };

  // ----------------------------------------------------
  // GRAFIK 3: Leg-Anatomie & Scoring Breakdown
  // ----------------------------------------------------
  const powerCount = allScores.filter((s) => s >= 100).length;
  const solidCount = allScores.filter((s) => s >= 60 && s < 100).length;
  const lowCount = allScores.filter((s) => s < 60).length;

  let count26 = 0;
  for (const leg of legsVisits) {
    for (const v of leg) {
      if (v.score === 26 && v.rest_score > 0) {
        count26++;
      }
    }
  }

  const legAnatomy: LegAnatomy = {
    power_pct: totalVisits > 0 ? Math.round((powerCount / totalVisits) * 1000) / 10 : 0,
    solid_pct: totalVisits > 0 ? Math.round((solidCount / totalVisits) * 1000) / 10 : 0,
    low_pct: totalVisits > 0 ? Math.round((lowCount / totalVisits) * 1000) / 10 : 0,
    finish_pct:
      totalVisits > 0 ? Math.round((finScores.length / totalVisits) * 1000) / 10 : 0,
    count_26: count26,
  };

  // =========================================================================
  // DAE 2.0 PSYCHOLOGY & PRESSURE ARCHITECT ENGINE (DEINE 30 FRAGEN & NOTIZEN)
  // =========================================================================

  // 1. Definition von Druck (Q1: Dynamisch progressiv & Q2: Gestaffelt <=40 / 41-100 / 101-170)
  const pressureScores: number[] = [];
  const baselineScores: number[] = [];
  let shortLegsUnderPressure = 0;
  let highFinishesCount = 0;

  for (const leg of legsVisits) {
    const isDecider = leg.length > 0 && leg[0].leg_num >= 5;
    const legWon = leg.length > 0 && leg[leg.length - 1].winner_player_id === playerId;
    const legDarts = leg.length > 0 && leg[leg.length - 1].darts_thrown ? leg[leg.length - 1].darts_thrown! : leg.length * 3;
    const checkout = leg.length > 0 ? leg[leg.length - 1].checkout : null;

    if (legWon && checkout && checkout >= 80) {
      highFinishesCount++;
    }
    if (legWon && isDecider && legDarts <= 21) {
      shortLegsUnderPressure++;
    }

    for (let i = 0; i < leg.length; i++) {
      const v = leg[i];
      const oppRest = v.opponent_rest || 999;
      const myRest = v.rest_score;
      const order = v.visit_order || i + 1;

      // Gestaffelter Druck nach Q2
      const isExtremeOppPressure = oppRest <= 40;
      const isModerateOppPressure = oppRest > 40 && oppRest <= 100;
      const isLightOppPressure = oppRest > 100 && oppRest <= 170;

      // Dynamischer Leg-Druck nach Q1: Höher je später im Leg und Match
      const isLateLegPressure = order >= 6 && myRest <= 170;
      const isPressure =
        isExtremeOppPressure ||
        (isModerateOppPressure && order >= 4) ||
        (isLightOppPressure && isDecider) ||
        isLateLegPressure;

      if (isPressure) {
        pressureScores.push(v.score);
      } else {
        baselineScores.push(v.score);
      }
    }
  }

  const pressureAvg = pressureScores.length > 0 ? avgArr(pressureScores) : averageVisit;
  const baselineAvg = baselineScores.length > 0 ? avgArr(baselineScores) : averageVisit;
  const clutchDelta = Math.round((pressureAvg - baselineAvg) * 10) / 10;

  // 2. Tilt-Indikator: Mix aus A, B und C (Q11 Nutzerwunsch!)
  // Komponente A: Reaktion nach Low-Scores (<= 45)
  // Komponente B: Reaktion nach verpassten Doppeln (Aufnahme nach rest <= 50 ohne Check)
  // Komponente C: Häufung von 26ern und 0ern
  let lowScoreFollowUps: number[] = [];
  let missedDoubleFollowUps: number[] = [];

  for (const leg of legsVisits) {
    for (let i = 0; i < leg.length - 1; i++) {
      const cur = leg[i];
      const next = leg[i + 1];

      // Komponente A: Rebound nach Low-Score
      if (cur.score <= 45 && cur.rest_score > 80 && next.rest_score > 50) {
        lowScoreFollowUps.push(next.score);
      }

      // Komponente B: Folgeaufnahme nach verpasstem Doppel
      if (cur.rest_score <= 50 && cur.score === 0 && next.rest_score <= 50) {
        missedDoubleFollowUps.push(next.score);
      }
    }
  }

  const avgLowFollow = lowScoreFollowUps.length > 0 ? avgArr(lowScoreFollowUps) : averageVisit;
  const avgDoubleMissFollow = missedDoubleFollowUps.length > 0 ? avgArr(missedDoubleFollowUps) : averageVisit;

  // Tilt-Score berechnen (0 bis 100, wobei < 25 = extrem stabil, > 45 = anfällig)
  const dropLowScore = Math.max(0, averageVisit - avgLowFollow);
  const dropMissedDouble = Math.max(0, averageVisit - avgDoubleMissFollow);
  const rate26AndBust = totalVisits > 0 ? (count26 / totalVisits) * 100 : 0;

  const tiltIndex = Math.round(
    Math.min(
      Math.max(
        dropLowScore * 2.2 + dropMissedDouble * 2.0 + rate26AndBust * 3.5,
        5
      ),
      95
    )
  );

  // 3. Konstanz & Streuung (Q16, Q17, Q18)
  const sub40ScoresCount = allScores.filter((s) => s < 40).length;
  const count60Plus = thresholds['60+']?.count || 0;
  const scoreRatio60ToSub40 =
    sub40ScoresCount > 0
      ? Math.round((count60Plus / sub40ScoresCount) * 10) / 10
      : count60Plus > 0
      ? 10
      : 1;

  const sub30ScoresCount = allScores.filter((s) => s <= 30).length;
  const instabilityIndex =
    totalVisits > 0 ? Math.round((sub30ScoresCount / totalVisits) * 1000) / 10 : 0;

  // 4. Führungs-Verwaltung & Choke (Q4, Q12, Q13, Q14)
  // Double-Trouble: Aufnahmen im Rest <= 50 über mehr als 3 Aufnahmen
  let doubleTroubleCount = 0;
  for (const leg of legsVisits) {
    let visitsInDoubleZone = 0;
    for (const v of leg) {
      if (v.rest_score <= 50) {
        visitsInDoubleZone++;
      }
    }
    if (visitsInDoubleZone >= 3) {
      doubleTroubleCount++;
    }
  }

  // Late-Leg Hesitation: First-9 vs Rest-of-Leg (Q14)
  const first9Avg = firstN.first_9_avg;
  const restOfLegScores: number[] = [];
  for (const leg of legsPlainScores) {
    if (leg.length > 3) {
      restOfLegScores.push(...leg.slice(3));
    }
  }
  const restOfLegAvg = restOfLegScores.length > 0 ? avgArr(restOfLegScores) : averageVisit;
  const lateLegDrop = Math.round((first9Avg - restOfLegAvg) * 10) / 10;

  // Lead Choke: 2:0 Führung verspielt? (Q12)
  let leadChokeCount = 0;
  const matchesMap = new Map<number, RawLegVisit[][]>();
  for (const leg of legsVisits) {
    if (leg.length > 0) {
      const mid = leg[0].match_id;
      if (!matchesMap.has(mid)) matchesMap.set(mid, []);
      matchesMap.get(mid)!.push(leg);
    }
  }

  matchesMap.forEach((mLegs) => {
    if (mLegs.length >= 4) {
      const firstTwoWon =
        mLegs[0]?.[mLegs[0].length - 1]?.winner_player_id === playerId &&
        mLegs[1]?.[mLegs[1].length - 1]?.winner_player_id === playerId;
      const matchWon =
        mLegs.filter((l) => l[l.length - 1]?.winner_player_id === playerId).length >
        mLegs.length / 2;
      if (firstTwoWon && !matchWon) {
        leadChokeCount++;
      }
    }
  });

  // 5. Gegnerstärke-Korrektur (Q10 Notiz: Leistung passt sich dem Gegner an!)
  // Berechnen, ob Average in Legs mit hohem Gegner-Druck steigt oder sinkt
  let opponentAdaptationFactor = 0;
  if (pressureAvg > baselineAvg + 3) {
    opponentAdaptationFactor = 1.3; // Wächst an großen Herausforderungen
  } else if (pressureAvg < baselineAvg - 4) {
    opponentAdaptationFactor = -1.2; // Lässt sich runterziehen / verkrampft
  } else {
    opponentAdaptationFactor = 0.2; // Neutral / spielt sein Spiel
  }

  let opponentAdaptationLabel = 'Fokusiert auf eigenes Spiel';
  if (opponentAdaptationFactor > 0.8) {
    opponentAdaptationLabel = 'Wächst mit Gegnerstärke (Match-Fighter)';
  } else if (opponentAdaptationFactor < -0.8) {
    opponentAdaptationLabel = 'Leistungsabfall bei Störfaktoren / schwachen Gegnern';
  }

  // 6. SCHULNOTEN (1.0 bis 6.0) & STERNE (1 bis 5) (Q26)
  const calcGrade = (
    scoreVal: number,
    optMin = 0,
    optMax = 100,
    invert = false
  ): { grade: number; label: string; stars: number; color: string } => {
    let norm = (scoreVal - optMin) / (optMax - optMin);
    norm = Math.min(Math.max(norm, 0), 1);
    if (invert) norm = 1 - norm;

    // Schulnote 1.0 (beste) bis 6.0 (schlechteste)
    const grade = Math.round((6.0 - norm * 5.0) * 10) / 10;
    let label = 'Ausreichend';
    let stars = 2;
    let color = '#F59E0B';

    if (grade <= 1.5) {
      label = 'Sehr gut';
      stars = 5;
      color = '#10B981';
    } else if (grade <= 2.5) {
      label = 'Gut';
      stars = 4;
      color = '#34D399';
    } else if (grade <= 3.5) {
      label = 'Befriedigend';
      stars = 3;
      color = '#38BDF8';
    } else if (grade <= 4.5) {
      label = 'Ausreichend';
      stars = 2;
      color = '#F59E0B';
    } else {
      label = 'Mangelhaft';
      stars = 1;
      color = '#EF4444';
    }

    return { grade, label, stars, color };
  };

  // 5 Dimensionen Schulnoten:
  // 1. Nervenstärke / Clutch
  const clutchScoreNorm = Math.min(Math.max(50 + clutchDelta * 5 + highFinishesCount * 12, 10), 100);
  const gClutch = calcGrade(clutchScoreNorm, 20, 95);

  // 2. Tilt-Resistenz & Fehlerverarbeitung
  const gTilt = calcGrade(tiltIndex, 10, 75, true);

  // 3. Wurfkonstanz & Korridor-Stabilität
  const gKonstanz = calcGrade(scoreRatio60ToSub40 * 10 - instabilityIndex * 0.8, 5, 50);

  // 4. Ziellinien-Souveränität (Kein Late-Leg Choke)
  const finishHesitationScore = Math.max(0, 80 - lateLegDrop * 2.5 - doubleTroubleCount * 8 - leadChokeCount * 15);
  const gFinishSouveraen = calcGrade(finishHesitationScore, 20, 90);

  // 5. Kaltstart & Anwurf-Mentalität
  const gKaltstart = calcGrade(startIndex, 20, 85);

  const schoolGrades: MentalSchoolGrade[] = [
    {
      dimension: 'Nervenstärke (Clutch)',
      grade: gClutch.grade,
      grade_label: gClutch.label,
      stars: gClutch.stars,
      color: gClutch.color,
      detail:
        clutchDelta >= 0
          ? `+${clutchDelta.toFixed(1)} Pkt unter Druck`
          : `${clutchDelta.toFixed(1)} Pkt unter Druck`,
    },
    {
      dimension: 'Tilt-Resistenz',
      grade: gTilt.grade,
      grade_label: gTilt.label,
      stars: gTilt.stars,
      color: gTilt.color,
      detail: `Tilt-Index: ${tiltIndex} (Fehlwurf-Verarbeitung)`,
    },
    {
      dimension: 'Wurf-Konstanz',
      grade: gKonstanz.grade,
      grade_label: gKonstanz.label,
      stars: gKonstanz.stars,
      color: gKonstanz.color,
      detail: `60+ / <40 Ratio: ${scoreRatio60ToSub40.toFixed(1)}`,
    },
    {
      dimension: 'Ziellinien-Souveränität',
      grade: gFinishSouveraen.grade,
      grade_label: gFinishSouveraen.label,
      stars: gFinishSouveraen.stars,
      color: gFinishSouveraen.color,
      detail:
        lateLegDrop > 15
          ? `Zögern vor Finish (-${lateLegDrop.toFixed(1)} Pkt)`
          : `Konstant bis zum Checkout`,
    },
    {
      dimension: 'Kaltstart & Anwurf',
      grade: gKaltstart.grade,
      grade_label: gKaltstart.label,
      stars: gKaltstart.stars,
      color: gKaltstart.color,
      detail: `Start-Index: ${startIndex}/100`,
    },
  ];

  const psychologicalMetrics: PsychologicalMetrics = {
    clutch_delta: clutchDelta,
    pressure_average: Math.round(pressureAvg * 10) / 10,
    baseline_average: Math.round(baselineAvg * 10) / 10,
    pressure_visits_count: pressureScores.length,
    tilt_index: tiltIndex,
    instability_index: instabilityIndex,
    score_ratio_60_to_sub40: scoreRatio60ToSub40,
    lead_choke_count: leadChokeCount,
    double_trouble_count: doubleTroubleCount,
    late_leg_drop: lateLegDrop,
    opponent_adaptation_factor: opponentAdaptationFactor,
    opponent_adaptation_label: opponentAdaptationLabel,
    short_legs_under_pressure: shortLegsUnderPressure,
    high_finishes_count: highFinishesCount,
    school_grades: schoolGrades,
  };

  // 7. DOPPELTER ARCHETYP: Psychologie-Typ + Team-Rolle (Q27: C & D)
  let mentalType = 'Der anpassungsfähige Allrounder';
  let mentalIcon = '🎯';
  let mentalDesc = 'Ausgeglichenes Nervenkostüm ohne extreme Ausreißer nach oben oder unten.';

  if (clutchDelta >= 3 && gClutch.grade <= 2.0) {
    mentalType = 'Der Eiskalte Vollstrecker';
    mentalIcon = '❄️';
    mentalDesc =
      'Je höher der Puls am Board, desto präziser die Darts. Sucht aktiv den Druck und schaltet Konkurrenten im Decider eiskalt aus.';
  } else if (tiltIndex <= 20 && volStd <= 22) {
    mentalType = 'Das Präzisions-Uhrwerk';
    mentalIcon = '⚙️';
    mentalDesc =
      'Stoische Ruhe. Reagiert auf gegnerische 180er oder eigene Fehlwürfe mit exakt gleichem Rhythmus wie ein Schweizer Uhrwerk.';
  } else if (scoreDanger >= 60 && instabilityIndex >= 25) {
    mentalType = 'Die Highscore-Wundertüte';
    mentalIcon = '⚡';
    mentalDesc =
      'Explosives Scoring mit maximaler Triple-Gefahr, kämpft jedoch mit gelegentlichen Ausreißern in 26er-Zonen. Ein emotionaler Spielmacher.';
  } else if (opSum.average < finSum.average - 6) {
    mentalType = 'Der Spätzünder & Kämpfer';
    mentalIcon = '🔥';
    mentalDesc =
      'Braucht oft 1–2 Aufnahmen zum Einwerfen, steigert sich aber kontinuierlich und dreht im Finish-Bereich massiv auf.';
  } else if (lateLegDrop >= 18 || doubleTroubleCount >= 2) {
    mentalType = 'Der sensible Rhythmuswerfer';
    mentalIcon = '🏹';
    mentalDesc =
      'Starkes Grundpotenzial bei freiem Kopf, gerät jedoch bei verpassten Checkout-Chancen leicht ins Grübeln.';
  }

  // Team-Rolle nach Q27
  let teamRole: 'Leader' | 'Punktegarant' | 'Joker' | 'Aufbau-Spieler' = 'Punktegarant';
  let roleBadgeColor = '#38BDF8';
  let roleDesc = 'Liefert kontinuierlich wichtige Zähler für den Spieltags-Sieg.';

  if (matchAvg >= 50 && gClutch.grade <= 2.2) {
    teamRole = 'Leader';
    roleBadgeColor = '#F59E0B';
    roleDesc = 'Geht voran, setzt in engen Spielsituationen die Glanzpunkte und stabilisiert das Team.';
  } else if (scoreKonstanz >= 65 && matchAvg >= 45) {
    teamRole = 'Punktegarant';
    roleBadgeColor = '#10B981';
    roleDesc = 'Extrem verlässlich in Einzel und Doppel. Gewinnt die Pflichtspiele gegen jeden Gegner.';
  } else if (scoreDanger >= 55 || clutchDelta >= 4) {
    teamRole = 'Joker';
    roleBadgeColor = '#A855F7';
    roleDesc = 'Kann an Spitzentagen jeden Gegner an die Wand spielen. Perfekt für taktische Überraschungen.';
  } else {
    teamRole = 'Aufbau-Spieler';
    roleBadgeColor = '#06B6D4';
    roleDesc = 'Wertvolles Fundament mit solider Entwicklungskurve; profitiert von mentaler Entlastung.';
  }

  const dualArchetype: DualArchetype = {
    mental_type: mentalType,
    mental_icon: mentalIcon,
    mental_desc: mentalDesc,
    team_role: teamRole,
    role_badge_color: roleBadgeColor,
    role_desc: roleDesc,
  };

  // 8. TONALITÄT & SPRACHE (Q28: Umschaltbar Scout vs. Coach)
  const scoutingTexts: AIScoutingToneTexts = {
    scout_mode: {
      pressure_summary:
        clutchDelta >= 2
          ? `Gnadenlose Wettkampfhärte: Unter gegnerischem Druck steigt der Schnitt von ${baselineAvg.toFixed(
              1
            )} auf ${pressureAvg.toFixed(1)} Punkte (+${clutchDelta.toFixed(
              1
            )}). Bestraft Nachlässigkeiten des Gegners konsequent.`
          : clutchDelta <= -3
          ? `Deutliches Nerven-Problem: Bei gegnerischem Druck bricht der Average von ${baselineAvg.toFixed(
              1
            )} auf ${pressureAvg.toFixed(1)} ein (${clutchDelta.toFixed(
              1
            )}). Verliert im direkten Finish-Duell die Wurflinie.`
          : `Neutrale Druck-Kurve: Hält das Niveau unter Druck stabil bei ${pressureAvg.toFixed(
              1
            )} Punkten. Weder Steigerung noch Nervenflattern.`,
      choke_analysis:
        lateLegDrop > 18
          ? `Akute Ziellinien-Hemmung: Fällt nach Dart 9 um ${lateLegDrop.toFixed(
              1
            )} Punkte ab. Doppel-Krise in ${doubleTroubleCount} Legs registriert. Das muss im Matchplan gnadenlos attackiert werden.`
          : doubleTroubleCount > 0
          ? `Gelegentliches Feststecken im Checkout-Bereich (${doubleTroubleCount}x >9 Darts auf Doppel), aber ohne chronisches Choke-Muster.`
          : `Keine Ziellinien-Schwäche erkennbar: Schließt Legs ohne Zögern ab.`,
      consistency_verdict:
        instabilityIndex > 20
          ? `Mangelnde Grundkonstanz: ${instabilityIndex.toFixed(
              1
            )} % aller Würfe landen bei <= 30 Punkten. Das Verhältnis 60+ zu <40 ist mit ${scoreRatio60ToSub40.toFixed(
              1
            )} zu instabil für sichere Führungen.`
          : `Verlässliches Fundament: Nur ${instabilityIndex.toFixed(
              1
            )} % Fehlerquote bei Aufnahmen <= 30. Hohe Wiederholgenauigkeit.`,
      hard_truth:
        tiltIndex > 40
          ? `Ungeschminkte Wahrheit: ${playerName} lässt sich von Fehlwürfen zu lange mental ausbremsen (Tilt-Index ${tiltIndex}). Frust führt direkt zu Folge-Fehlern.`
          : `Ungeschminkte Wahrheit: Ein mental gefestigter Akteur, der auch in hitziger Atmosphäre seinen Stiefel runterspielt.`,
    },
    coach_mode: {
      pressure_summary:
        clutchDelta >= 0
          ? `Hervorragende mentale Basis: ${playerName} mobilisiert unter Druck zusätzliche Fokus-Ressourcen (+${clutchDelta.toFixed(
              1
            )} Schnitt-Steigerung). Dieses Selbstvertrauen aktiv für die Teamführung nutzen!`
          : `Entwicklungschance unter Druck: Bei gegnerischem Rest <= 100 hilft eine bewusst verlängerte Atem-Routine vor dem Gang ans Oche, um den Puls um 10 Schläge zu senken.`,
      choke_analysis:
        lateLegDrop > 15
          ? `Lernfeld Ziellinie: Der Übergang von Scoring auf Finish gelingt mit gezieltem 121er-Training. Wenn der Setup-Dart sitzt, fällt der finale Check leicht.`
          : `Souveränes Match-Management: Behält die Nerven in den entscheidenden Aufnahmen und trifft mutige Entscheidungen.`,
      consistency_verdict:
        instabilityIndex > 20
          ? `Wachstumspotenzial Streuung: Der Fokus liegt im Training auf dem Halten des 20er-Felds (auch S20 statt T20) – das eliminiert 26er sofort und hebt den Schnitt um 6–8 Punkte an.`
          : `Exzellente Grundkonstanz: Eine tragende Säule im Team, die für Ruhe und Berechenbarkeit sorgt.`,
      motivational_boost: `Mit der richtigen Warm-Up-Routine und klaren Zielbildern am Board gehört ${playerName} zu den verlässlichsten Spielern der gesamten Liga!`,
    },
  };

  // 9. MASSGESCHNEIDERTE TRAININGSIMPULSE (Q29)
  const trainingImpulses: TrainingImpulse[] = [];
  if (gFinishSouveraen.grade >= 3.0 || doubleTroubleCount > 0) {
    trainingImpulses.push({
      title: 'Finish-Druck & Ziellinien-Souveränität',
      focus: 'Lieblingsdoppel D16 / D20 unter Wettkampf-Bedingungen',
      exercise: 'Bob\'s 27 oder "501 Double-Out mit maximal 6 Check-Darts"',
      goal: 'Eliminierung von Double-Trouble Phasen und Festigung des 1. Matchdarts',
    });
  }

  if (instabilityIndex > 18 || count26 > 1) {
    trainingImpulses.push({
      title: 'Streuungs-Reduktion & 26er-Bann',
      focus: 'Schmale Gruppierung im Single-20 Segment',
      exercise: '100 Darts auf die 20 – Jeder Treffer in 1 oder 5 gibt 0 Punkte, nur Single/Triple zählt',
      goal: 'Instabilitäts-Index unter 12 % drücken für verlässliche 60er Grund-Aufnahmen',
    });
  }

  if (gKaltstart.grade >= 3.0 || startIndex < 50) {
    trainingImpulses.push({
      title: 'Kaltstart-Routine für Anwurf-Vorteil',
      focus: 'Sofortige Betriebstemperatur in den Visits 1–3',
      exercise: '5x 9-Darts Sprint aus der kalten Hose – Ziel: Mindestens 180 Punkte in den ersten 9 Darts',
      goal: 'Sichern des eigenen Anwurfs ab Dart 1 ohne Anlaufzeit',
    });
  }

  if (trainingImpulses.length < 2) {
    trainingImpulses.push({
      title: 'Decider & Nervenstärke-Simulation',
      focus: 'Clutch-Performance bei Gleichstand',
      exercise: 'Catch 40: Alle Finishes von 61 bis 100 mit jeweils 2 oder 3 Darts checken',
      goal: 'Ausbau des Clutch-Vorteils zu einer uneinnehmbaren Festung',
    });
  }

  // 10. MATCHPLAN- & AUFSTELLUNGS-BERATER (Q30: B & C)
  let boardRec = 'Board 1 oder 2 gleichermaßen geeignet';
  if (volStd <= 22) {
    boardRec = 'Board 1 (Präsentations-Board): Lässt sich von Umgebungsgeräuschen und Zuschauern nicht irritieren.';
  } else {
    boardRec = 'Board 2 (Ruhigeres Board): Profitiert von fokussierter Atmosphäre und weniger Ablenkung.';
  }

  let singleSlot = 'Block 1 (Spiele 1–4): Startet engagiert und setzt frühe Team-Akzente.';
  if (clutchDelta >= 2 && gClutch.grade <= 2.2) {
    singleSlot = 'Schluss-Block oder Decider-Position: Höchste Nervenstärke unter Druck, ideal für knappe Schlussphasen.';
  } else if (gKaltstart.grade > 3.0) {
    singleSlot = 'Block 2 (Spiele 5–8): Gibt Zeit zum Einwerfen und akklimatisieren.';
  }

  let doublePartner = 'Ausgeglichener Partner';
  if (scoreDanger >= 60 && instabilityIndex > 15) {
    doublePartner = 'Stoischer Doppel-Partner mit hoher Finish-Quote (gleicht Scoring-Schwankungen aus).';
  } else if (scoreFinish >= 65 && scorePower < 50) {
    doublePartner = 'Aggressiver Power-Scorer (schafft schnellen Vorsprung, den dieser Spieler veredelt).';
  } else {
    doublePartner = 'Kommunikativer Rhythmus-Spieler zur gemeinsamen Rhythmus-Stabilisierung.';
  }

  const matchplanAdvice: MatchplanAdvice = {
    board_recommendation: boardRec,
    single_slot_recommendation: singleSlot,
    double_partner_profile: doublePartner,
  };

  // Backwards-compatible Scouting Cards
  const bounceCard: AIScoutingCard = {
    title: 'Rebound & Fehlerverarbeitung',
    badge: tiltIndex <= 25 ? 'Eiskalter Rebound' : tiltIndex >= 45 ? 'Tilt-Gefahr' : 'Solide Routine',
    badge_color: tiltIndex <= 25 ? '#34D399' : tiltIndex >= 45 ? '#F87171' : '#38BDF8',
    text:
      tiltIndex <= 25
        ? `Fehlwürfe werden mental in Sekundenschnelle gelöscht. Folgescore nach Patzern: Ø ${avgLowFollow.toFixed(
            1
          )} Pkt.`
        : tiltIndex >= 45
        ? `Neigt nach Fehlern zu Frust-Wurfserien (Tilt-Index ${tiltIndex}). Folgescore bricht um -${dropLowScore.toFixed(
            1
          )} Pkt ein.`
        : `Verlässliche Routine: Nach Fehlaufnahmen fängt sich der Spieler rasch wieder bei soliden Ø ${avgLowFollow.toFixed(
            1
          )} Pkt.`,
  };

  const pressureCard: AIScoutingCard = {
    title: 'Nervenstärke & Gegnerdruck',
    badge: clutchDelta >= 2 ? 'Wettkampf-Monster' : clutchDelta <= -3 ? 'Druck-Anfällig' : 'Kühler Kopf',
    badge_color: clutchDelta >= 2 ? '#34D399' : clutchDelta <= -3 ? '#F87171' : '#38BDF8',
    text:
      clutchDelta >= 0
        ? `Unter gegnerischem Druck steigt die Konzentration (+${clutchDelta.toFixed(
            1
          )} Pkt vs. Baseline).`
        : `Unter gegnerischem Druck schleicht sich Hektik ein (${clutchDelta.toFixed(
            1
          )} Pkt vs. Baseline).`,
  };

  const focusCard: AIScoutingCard = {
    title: 'Match-Fokus & Ausdauer',
    badge: lateLegDrop > 18 ? 'Ziellinien-Hesitation' : 'Fokus Stabil',
    badge_color: lateLegDrop > 18 ? '#F59E0B' : '#34D399',
    text:
      lateLegDrop > 18
        ? `Leichtes Stocken vor der Ziellinie: Fällt im Finish-Bereich um ${lateLegDrop.toFixed(
            1
          )} Pkt gegenüber den First-9 ab.`
        : `Konzentrationskurve verläuft stabil über alle gespielten Legs (${legsVisits.length} Legs ausgewertet).`,
  };

  const aiProfile: AIScoutingProfile = {
    archetype: mentalType,
    archetype_icon: mentalIcon,
    archetype_desc: mentalDesc,
    dual_archetype: dualArchetype,
    mental_metrics: psychologicalMetrics,
    scouting_texts: scoutingTexts,
    training_impulses: trainingImpulses,
    matchplan_advice: matchplanAdvice,
    top_strengths: [
      { name: radarDimensions[0].dim, value: radarDimensions[0].value, label: radarDimensions[0].label },
      { name: radarDimensions[1].dim, value: radarDimensions[1].value, label: radarDimensions[1].label },
    ],
    bottom_weaknesses: [
      { name: radarDimensions[4].dim, value: radarDimensions[4].value, label: radarDimensions[4].label },
      { name: radarDimensions[5].dim, value: radarDimensions[5].value, label: radarDimensions[5].label },
    ],
    bounce_back: bounceCard,
    pressure: pressureCard,
    focus: focusCard,
    tactical_tips: [
      scoutingTexts.coach_mode.pressure_summary,
      scoutingTexts.coach_mode.consistency_verdict,
      matchplanAdvice.single_slot_recommendation,
    ],
  };

  return {
    playerId,
    playerName,
    visit_stats: visitStats,
    first_n: firstN,
    dist_data: distData,
    start_data: startData,
    phases,
    radar_metrics: radarMetrics,
    leg_trend: legTrend,
    darts_to_win: dartsToWin,
    leg_anatomy: legAnatomy,
    ai_profile: aiProfile,
    legs_count: legsVisits.length,
  };
}

// ----------------------------------------------------
// SIMULATION (Probabilistischer Modus für neue Spieler)
// ----------------------------------------------------
export function generateSimulatedLegVisits(
  playerId: number,
  targetAvg: number
): RawLegVisit[][] {
  const legs: RawLegVisit[][] = [];
  const legCount = 4;

  for (let l = 1; l <= legCount; l++) {
    const visits: RawLegVisit[] = [];
    let rest = 501;
    const visitsCount = Math.max(5, Math.round(501 / (targetAvg * 0.95)));

    for (let v = 1; v <= visitsCount; v++) {
      let score: number;
      const rand = Math.random();
      if (rand < 0.12) score = 100;
      else if (rand < 0.17) score = 140;
      else if (rand < 0.45) score = Math.floor(Math.random() * 30) + 60; // 60-90
      else if (rand < 0.75) score = Math.floor(Math.random() * 30) + 30; // 30-60
      else score = 26; // gelegentlicher 26er

      if (v === visitsCount) {
        score = rest <= 170 ? rest : 40;
        rest = 0;
      } else {
        rest = Math.max(2, rest - score);
      }

      visits.push({
        id: l * 100 + v,
        leg_id: l,
        visit_order: v,
        score,
        rest_score: rest,
        opponent_rest: 100 + Math.floor(Math.random() * 200),
        leg_num: l,
        match_id: 999,
        starter_player_id: playerId,
        winner_player_id: l % 2 === 1 ? playerId : 0,
        darts_thrown: v === visitsCount ? v * 3 : null,
        checkout: v === visitsCount && l % 2 === 1 ? score : null,
        is_break: false,
        match_date: 'Simuliert',
      });

      if (rest === 0) break;
    }
    legs.push(visits);
  }

  return legs;
}
