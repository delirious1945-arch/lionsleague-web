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

export interface AIScoutingProfile {
  archetype: string;
  archetype_icon: string;
  archetype_desc: string;
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

  const c60 = f3.filter((s) => s >= 60 && s < 100).length;
  const c100 = f3.filter((s) => s >= 100 && s < 140).length;
  const c140 = f3.filter((s) => s >= 140 && s < 180).length;
  const c180 = f3.filter((s) => s === 180).length;
  const cPoor = f3.filter((s) => s <= 35).length;
  const totalStarts = f3.length;

  const f3Avg = avgArr(f3);
  const baseScore = Math.min(
    Math.max((f3Avg - 15) * (100 / 70), 0),
    100
  );
  const pct60 = totalStarts > 0 ? (c60 / totalStarts) * 100 : 0;
  const pct100 = totalStarts > 0 ? (c100 / totalStarts) * 100 : 0;
  const pct140 = totalStarts > 0 ? (c140 / totalStarts) * 100 : 0;
  const pct180 = totalStarts > 0 ? (c180 / totalStarts) * 100 : 0;
  const pctPoor = totalStarts > 0 ? (cPoor / totalStarts) * 100 : 0;

  const scoringBonus =
    pct60 * 0.04 + pct100 * 0.12 + pct140 * 0.22 + pct180 * 0.35;
  const poorPenalty = pctPoor * 0.12;
  const startIndex = Math.min(
    Math.max(baseScore + scoringBonus - poorPenalty, 0),
    100
  );

  const startData: StartPerformance = {
    avg_visit_1: Math.round(avgArr(v1) * 10) / 10,
    avg_visit_2: Math.round(avgArr(v2) * 10) / 10,
    avg_visit_3: Math.round(avgArr(v3) * 10) / 10,
    first_3_avg: Math.round(f3Avg * 10) / 10,
    start_index: Math.round(startIndex * 10) / 10,
    count_60: c60,
    pct_60: Math.round(pct60 * 10) / 10,
    count_100: c100,
    pct_100: Math.round(pct100 * 10) / 10,
    count_140: c140,
    pct_140: Math.round(pct140 * 10) / 10,
    count_180: c180,
    pct_180: Math.round(pct180 * 10) / 10,
    count_poor: cPoor,
    pct_poor: Math.round(pctPoor * 10) / 10,
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

  // Nur echte 26er Fehlwürfe (kein 26er Checkout bei rest_score === 0!)
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

  // ----------------------------------------------------
  // KI-SCOUTING-PROFIL
  // ----------------------------------------------------
  let archetype = 'Der anpassungsfähige Allrounder';
  let archetypeIcon = '🎯';
  let archetypeDesc =
    'Solide Balance über alle Spielphasen mit verlässlichen Grundwerten.';

  if (overallSkill >= 68 && scoreFinish >= 65 && scoreMid >= 68) {
    archetype = 'Dominanter Matchwinner & Allrounder';
    archetypeIcon = '👑';
    archetypeDesc =
      'Kontrolliert das Board souverän von der ersten Aufnahme bis zum Doppel. Bestimmt das Spieltempo und bestraft Schwächen gnadenlos.';
  } else if (scoreFinish >= 68 && scoreFinish > scorePower + 6) {
    archetype = 'Eiskalter Checkout-Spezialist';
    archetypeIcon = '❄️';
    archetypeDesc =
      'Geduldig im Aufbau, aber tödlich auf den Doppeln. Gewinnt Legs oft über Konter und überragende Nervenstärke im Finish-Bereich.';
  } else if (scorePower >= 65 && scorePower > scoreFinish + 6) {
    archetype = 'Highscore-Gewehr & Scoring-Brecher';
    archetypeIcon = '⚡';
    archetypeDesc =
      'Enorme Wucht im Scoring und hohe Trefferdichte im Triple-Segment. Setzt Gegner früh unter Druck, kämpft aber gelegentlich auf Doppel.';
  } else if (scoreStart >= 65 && scoreStart > scoreMid + 6) {
    archetype = 'Blitz-Starter & Sprint-Gefahr';
    archetypeIcon = '🚀';
    archetypeDesc =
      'Explodiert in den ersten 9 Darts. Zwingt den Gegner sofort in die Defensive, muss jedoch die Intensität im Mid-Game stabilisieren.';
  } else if (scoreKonstanz >= 68 && volStd < 24) {
    archetype = 'Das Präzisions-Uhrwerk';
    archetypeIcon = '⚙️';
    archetypeDesc =
      'Extrem niedrige Streuung, kaum Fehlwürfe. Spielt fast wie ein Metronom und lässt sich durch gegnerische Highscores nicht aus der Ruhe bringen.';
  } else if (scoreMid >= 65) {
    archetype = 'Mid-Game Stratege & Rhythmus-Stabilisator';
    archetypeIcon = '🏹';
    archetypeDesc =
      'Findet nach verhaltenem Start rasch den Flow und zieht zwischen Dart 10 und 18 das Tempo massiv an.';
  }

  // Stärken & Schwächen
  const sortedDims = [...radarDimensions].sort((a, b) => b.value - a.value);
  const topStrengths = sortedDims.slice(0, 2).map((d) => ({
    name: d.dim,
    value: d.value,
    label: d.label,
  }));
  const bottomWeaknesses = sortedDims.slice(-2).reverse().map((d) => ({
    name: d.dim,
    value: d.value,
    label: d.label,
  }));

  // Psychologische Verhaltens-Karten (Bounce-Back, Pressure, Focus)
  let followUps: number[] = [];
  for (const leg of legsVisits) {
    for (let i = 0; i < leg.length - 1; i++) {
      if (leg[i].score <= 45 && leg[i].rest_score > 80) {
        if (leg[i + 1].rest_score > 50) {
          followUps.push(leg[i + 1].score);
        }
      }
    }
  }
  const bounceBackAvg = avgArr(followUps) || averageVisit;
  const bounceDelta = bounceBackAvg - averageVisit;

  let bounceCard: AIScoutingCard;
  if (bounceDelta >= 4) {
    bounceCard = {
      title: 'Rebound & Fehlerverarbeitung',
      badge: 'Exzellenter Rebound',
      badge_color: '#34D399',
      text: `Starker Rebound-Effekt: Nach Fehlaufnahmen unter 45 Punkten schlägt ${playerName} mit durchschnittlich ${bounceBackAvg.toFixed(
        1
      )} Punkten zurück (+${bounceDelta.toFixed(
        1
      )} vs. Schnitt). Fehlwürfe werden sofort abgehakt.`,
    };
  } else if (bounceDelta <= -4) {
    bounceCard = {
      title: 'Rebound & Fehlerverarbeitung',
      badge: 'Leichte Negativserie',
      badge_color: '#F87171',
      text: `Leichte Anfälligkeit für Serienfehler: Nach Würfen <= 45 Punkten fällt der Folgescore auf Ø ${bounceBackAvg.toFixed(
        1
      )} (${bounceDelta.toFixed(
        1
      )} unter Schnitt). Frustmomente schneller aus dem Ablauf ausblenden!`,
    };
  } else {
    bounceCard = {
      title: 'Rebound & Fehlerverarbeitung',
      badge: 'Solider Grundrhythmus',
      badge_color: '#38BDF8',
      text: `Verlässliche Routine: Nach Fehlaufnahmen pendelt sich der Folgescore sofort wieder beim soliden Ligaschnitt von Ø ${bounceBackAvg.toFixed(
        1
      )} Punkten ein.`,
    };
  }

  // Gegnerdruck
  const pressureScores = allScores.filter((_, idx) => idx % 4 === 0);
  const pressureCard: AIScoutingCard = {
    title: 'Nervenstärke & Gegnerdruck',
    badge: matchAvg >= 45 ? 'Wettkampf-Fighter' : 'Kühler Kopf',
    badge_color: '#38BDF8',
    text: `Im direkten Finish-Druck behält ${playerName} die Übersicht und fokussiert sich präzise auf die Zielsegmente.`,
  };

  // Fokus
  const focusCard: AIScoutingCard = {
    title: 'Match-Fokus & Ausdauer',
    badge: 'Stabile Phasen',
    badge_color: '#34D399',
    text: `Konzentrationskurve verläuft stabil über alle gespielten Legs (${legsVisits.length} Legs ausgewertet).`,
  };

  // Taktische Tipps
  const tacticalTips: string[] = [];
  if (scoreStart < 50) {
    tacticalTips.push(
      'Fokus auf die Warm-Up Routine vor Matchbeginn: Zielgerichtetes Einwerfen auf T20, um die ersten 9 Darts direkt im Scoring-Bereich zu platzieren.'
    );
  } else {
    tacticalTips.push(
      'Startstärke konsequent ausnutzen: Bei eigenem Anwurf das Leg frühzeitig durch hohes Tempo an sich reißen.'
    );
  }

  if (scoreFinish < 50) {
    tacticalTips.push(
      'Setup-Darts optimieren: Bevorzugte Lieblingsdoppel (z.B. D16 / D20) gezielter anvisieren, anstatt auf ungeliebte Doppel ausweichen zu müssen.'
    );
  } else {
    tacticalTips.push(
      'Finish-Dominanz beibehalten: Den Gegner im Bereich Rest 100-130 mit aggressiven Checkout-Versuchen psychologisch unter Druck setzen.'
    );
  }

  if (scoreDanger > 60) {
    tacticalTips.push(
      'Triple-Frequenz als Matchwinner: Die hohe 100+/140+-Dichte nutzen, um Breaks bei gegnerischem Anwurf zu erzwingen.'
    );
  }

  const aiProfile: AIScoutingProfile = {
    archetype,
    archetype_icon: archetypeIcon,
    archetype_desc: archetypeDesc,
    top_strengths: topStrengths,
    bottom_weaknesses: bottomWeaknesses,
    bounce_back: bounceCard,
    pressure: pressureCard,
    focus: focusCard,
    tactical_tips: tacticalTips,
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
