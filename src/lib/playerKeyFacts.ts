import type { DoublesMatchRow } from './data';
import type { PlayerDAEAnalytics } from './daeEngine';
import type { PlayerTrainingDoublesStats } from './playerDoublesStats';

export type TrafficLight = 'green' | 'yellow' | 'red';

export interface PlayerSingleMatchInput {
  id: number;
  match_date: string;
  opponent: string;
  legs_won: number;
  legs_lost: number;
  is_win?: boolean;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  scores_80?: number;
  scores_100?: number;
  scores_140?: number;
  scores_180?: number;
  high_finish?: number;
  high_finishes?: number;
  short_legs?: number;
  specials_count?: number;
}

export interface PlayerDoublesHistoryItem {
  id: number;
  match_date: string;
  raw_date: string;
  opponent: string;
  partner_name: string;
  legs_won: number;
  legs_lost: number;
  is_win: boolean;
  pair_avg: number;
  pair_avg_9: number;
  pair_avg_18: number;
  has_individual_stats: boolean;
  my_darts: number | null;
  my_avg: number | null;
  my_first9_avg: number | null;
  my_scores_80: number;
  my_scores_100: number;
  my_scores_140: number;
  my_scores_180: number;
  my_checkouts: number;
}

export interface DoublesSummary {
  games: number;
  wins: number;
  trackedGames: number;
  myAvg: number | null;
  myFirst9Avg: number | null;
  myCheckouts: number;
  pairAvg: number;
}

export interface KeyFactCardData {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  icon: string;
  label: string;
  headline: string;
  detail: string;
  badgeText: string;
  status: TrafficLight;
  actionHref?: string;
  actionLabel?: string;
}

export interface AmpelColumnData {
  id: string;
  title: string;
  subtitle: string;
  status: TrafficLight;
  statusLabel: string;
  facts: [KeyFactCardData, KeyFactCardData];
}

export interface PlayerPulseResult {
  columns: [AmpelColumnData, AmpelColumnData, AmpelColumnData];
  doublesSummary: DoublesSummary;
}

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase();
}

function formatDateDe(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
  }
  return raw;
}

function getOpponentShort(opponent: string): string {
  const trimmed = opponent.trim();
  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord || trimmed;
}

/**
 * Filtert alle Doppel-Ligapartien eines Spielers und ordnet ihm
 * seine persönlichen Einzelwerfer-Werte (falls vorhanden) eindeutig zu.
 */
export function getPlayerDoublesHistory(
  playerId: number,
  playerName: string,
  doublesMatches: DoublesMatchRow[]
): PlayerDoublesHistoryItem[] {
  const normTarget = normalizeName(playerName);
  const items: PlayerDoublesHistoryItem[] = [];

  for (const m of doublesMatches) {
    const isP1 = m.player1_id === playerId || normalizeName(m.p1_name) === normTarget;
    const isP2 = !isP1 && (m.player2_id === playerId || normalizeName(m.p2_name) === normTarget);

    if (!isP1 && !isP2) continue;

    const myAvg = isP1 ? (m.player1_avg ?? null) : (m.player2_avg ?? null);
    const myFirst9 = isP1 ? (m.player1_first9_avg ?? null) : (m.player2_first9_avg ?? null);
    const myDarts = isP1 ? (m.player1_darts ?? null) : (m.player2_darts ?? null);
    const my80 = (isP1 ? m.player1_scores_80 : m.player2_scores_80) ?? 0;
    const my100 = (isP1 ? m.player1_scores_100 : m.player2_scores_100) ?? 0;
    const my140 = (isP1 ? m.player1_scores_140 : m.player2_scores_140) ?? 0;
    const my180 = (isP1 ? m.player1_scores_180 : m.player2_scores_180) ?? 0;
    const myCheckouts = (isP1 ? m.player1_checkouts : m.player2_checkouts) ?? 0;
    const hasIndividual = myAvg !== null && myAvg > 0;

    items.push({
      id: m.id,
      match_date: formatDateDe(m.match_date),
      raw_date: m.match_date,
      opponent: m.opponent,
      partner_name: isP1 ? m.p2_name : m.p1_name,
      legs_won: m.legs_won,
      legs_lost: m.legs_lost,
      is_win: m.legs_won > m.legs_lost,
      pair_avg: m.avg_total,
      pair_avg_9: m.avg_9,
      pair_avg_18: m.avg_18,
      has_individual_stats: hasIndividual,
      my_darts: myDarts,
      my_avg: myAvg,
      my_first9_avg: myFirst9,
      my_scores_80: my80,
      my_scores_100: my100,
      my_scores_140: my140,
      my_scores_180: my180,
      my_checkouts: myCheckouts,
    });
  }

  return items;
}

function summarizeDoubles(doublesHistory: PlayerDoublesHistoryItem[]): DoublesSummary {
  const games = doublesHistory.length;
  const wins = doublesHistory.filter((d) => d.is_win).length;
  const pairAvg =
    games > 0 ? doublesHistory.reduce((acc, d) => acc + d.pair_avg, 0) / games : 0;

  const tracked = doublesHistory.filter((d) => d.has_individual_stats && d.my_avg !== null);
  const trackedGames = tracked.length;

  let myAvg: number | null = null;
  if (trackedGames > 0) {
    const totalDarts = tracked.reduce((acc, d) => acc + (d.my_darts || 0), 0);
    if (totalDarts > 0 && tracked.every((d) => (d.my_darts || 0) > 0)) {
      const weightedSum = tracked.reduce(
        (acc, d) => acc + (d.my_avg || 0) * (d.my_darts || 0),
        0
      );
      myAvg = Math.round((weightedSum / totalDarts) * 100) / 100;
    } else {
      myAvg =
        Math.round(
          (tracked.reduce((acc, d) => acc + (d.my_avg || 0), 0) / trackedGames) * 100
        ) / 100;
    }
  }

  const withFirst9 = tracked.filter((d) => d.my_first9_avg !== null && d.my_first9_avg > 0);
  const myFirst9Avg =
    withFirst9.length > 0
      ? Math.round(
          (withFirst9.reduce((acc, d) => acc + (d.my_first9_avg || 0), 0) /
            withFirst9.length) *
            10
        ) / 10
      : null;

  const myCheckouts = tracked.reduce((acc, d) => acc + d.my_checkouts, 0);

  return {
    games,
    wins,
    trackedGames,
    myAvg,
    myFirst9Avg,
    myCheckouts,
    pairAvg: Math.round(pairAvg * 10) / 10,
  };
}

function combineTrafficLight(statuses: TrafficLight[]): TrafficLight {
  if (statuses.includes('red')) return 'red';
  if (statuses.every((s) => s === 'green')) return 'green';
  return 'yellow';
}

function getStatusLabel(status: TrafficLight, context: 'form' | 'fix' | 'focus'): string {
  if (context === 'form') {
    if (status === 'green') return 'Starke Form';
    if (status === 'yellow') return 'Solide Basis';
    return 'Formschwäche';
  }
  if (context === 'fix') {
    if (status === 'green') return 'Stark abgesichert';
    if (status === 'yellow') return 'Feinschliff nötig';
    return 'Akute Baustelle';
  }
  if (status === 'green') return 'Auf Kurs';
  if (status === 'yellow') return 'Konkreter Fokus';
  return 'Dringend trainieren';
}

interface BottleneckRecommendation {
  fact: KeyFactCardData;
  trainingHref: string;
  trainingLabel: string;
  trainingHeadline: string;
  trainingDetail: string;
  trainingBadge: string;
}

function buildFact1(
  singleMatches: PlayerSingleMatchInput[],
  doublesSummary: DoublesSummary,
  daeAnalytics?: PlayerDAEAnalytics | null
): { fact: KeyFactCardData; seasonAvg: number; winRate: number; avg9: number } {
  const matchCount = singleMatches.length;
  const seasonAvg =
    matchCount > 0
      ? singleMatches.reduce((acc, m) => acc + m.avg_total, 0) / matchCount
      : 0;
  const avg9 =
    matchCount > 0 ? singleMatches.reduce((acc, m) => acc + m.avg_9, 0) / matchCount : 0;
  const wins = singleMatches.filter((m) => m.is_win ?? m.legs_won > m.legs_lost).length;
  const winRate = matchCount > 0 ? wins / matchCount : 0;

  if (matchCount === 0) {
    if (doublesSummary.myAvg !== null) {
      return {
        seasonAvg: 0,
        winRate: 0,
        avg9: doublesSummary.myFirst9Avg || 0,
        fact: {
          number: 1,
          icon: '📈',
          label: 'Aktuelle Form',
          headline: `${doublesSummary.myAvg.toFixed(1)} Doppel-Avg`,
          detail: `Noch keine Saison-Einzel gespielt, aber im Doppel bereits mit ${doublesSummary.wins}/${doublesSummary.games} Siegen aktiv.`,
          badgeText: 'Nur Doppel',
          status: doublesSummary.myAvg >= 45 ? 'green' : 'yellow',
        },
      };
    }

    if (daeAnalytics && !daeAnalytics.isSimulated && daeAnalytics.legs_count > 0) {
      const mAvg = daeAnalytics.visit_stats.match_average;
      return {
        seasonAvg: mAvg,
        winRate: 0,
        avg9: daeAnalytics.first_n.first_9_avg,
        fact: {
          number: 1,
          icon: '📈',
          label: 'Aktuelle Form',
          headline: `${mAvg.toFixed(1)} DAE-Avg`,
          detail: `Noch keine Einzel in dieser Saison, aber ${daeAnalytics.legs_count} erfasste Legs im Archiv.`,
          badgeText: 'Archiv-Basis',
          status: mAvg >= 45 ? 'green' : 'yellow',
        },
      };
    }

    return {
      seasonAvg: 0,
      winRate: 0,
      avg9: 0,
      fact: {
        number: 1,
        icon: '📈',
        label: 'Aktuelle Form',
        headline: 'Noch keine Einzel',
        detail: 'Für diese Saison liegen noch keine absolvierten Einzel-Ligapartien vor.',
        badgeText: 'Saisonstart offen',
        status: 'yellow',
      },
    };
  }

  const recentCount = Math.min(3, matchCount);
  const recent = singleMatches.slice(0, recentCount);
  const recentAvg = recent.reduce((acc, m) => acc + m.avg_total, 0) / recentCount;
  const recentWins = recent.filter((m) => m.is_win ?? m.legs_won > m.legs_lost).length;
  const delta = recentAvg - seasonAvg;
  const recentPreview = recent
    .map((m) => `${m.avg_total.toFixed(1)} (${getOpponentShort(m.opponent)})`)
    .join(' · ');

  let status: TrafficLight = 'yellow';
  let badgeText = '→ Konstant';

  if (matchCount >= 4) {
    if (delta >= 1.5 || (delta >= -0.5 && recentWins >= 2 && recentAvg >= 45)) {
      status = 'green';
      badgeText = delta >= 1.5 ? `↗ +${delta.toFixed(1)} Aufwärtstrend` : '🟢 Starke Serie';
    } else if (delta <= -2.5 || (recentWins === 0 && recentAvg < 42)) {
      status = 'red';
      badgeText = `↘ ${delta.toFixed(1)} Unter Schnitt`;
    } else {
      status = 'yellow';
      badgeText = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} im Korridor`;
    }
  } else {
    if (recentWins >= Math.ceil(recentCount * 0.6) && recentAvg >= 43) {
      status = 'green';
      badgeText = `${recentWins}/${recentCount} Siege`;
    } else if (recentWins === 0 && recentAvg < 40) {
      status = 'red';
      badgeText = 'Schwerer Start';
    } else {
      badgeText = `${recentWins}/${recentCount} Siege`;
    }
  }

  const headline =
    matchCount >= 4
      ? `${recentAvg.toFixed(1)} Avg (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`
      : `${recentAvg.toFixed(1)} Avg (${recentWins}/${recentCount} Siege)`;

  return {
    seasonAvg,
    winRate,
    avg9,
    fact: {
      number: 1,
      icon: '📈',
      label: 'Aktuelle Form',
      headline,
      detail: `Letzte ${recentCount} Einzel: ${recentPreview}. Saison-Schnitt über ${matchCount} Spiele: ${seasonAvg.toFixed(1)}.`,
      badgeText,
      status,
    },
  };
}

function buildFact2(
  singleMatches: PlayerSingleMatchInput[],
  doublesHistory: PlayerDoublesHistoryItem[],
  doublesSummary: DoublesSummary,
  seasonAvg: number,
  winRate: number,
  avg9: number,
  trainingStats?: PlayerTrainingDoublesStats | null,
  daeAnalytics?: PlayerDAEAnalytics | null
): KeyFactCardData {
  const recent3 = singleMatches.slice(0, 3);
  const recent180s = recent3.reduce((acc, m) => acc + (m.scores_180 || 0), 0);
  const season180s = singleMatches.reduce((acc, m) => acc + (m.scores_180 || 0), 0);
  const seasonShortLegs = singleMatches.reduce((acc, m) => acc + (m.short_legs || 0), 0);
  const maxHf = singleMatches.reduce(
    (max, m) => Math.max(max, m.high_finish || m.high_finishes || 0),
    0
  );
  const peakSingle = singleMatches.reduce(
    (best, m) => (m.avg_total > best.avg_total ? m : best),
    singleMatches[0]
  );

  // Prüfe die markantesten Stärken nach Priorität
  if (singleMatches.length >= 2 && avg9 >= 54 && (recent180s > 0 || seasonShortLegs > 0 || maxHf >= 100)) {
    const highlightBits: string[] = [];
    if (season180s > 0) highlightBits.push(`${season180s}× 180er`);
    if (seasonShortLegs > 0) highlightBits.push(`${seasonShortLegs}× Short-Leg`);
    if (maxHf >= 100) highlightBits.push(`HF ${maxHf}`);
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `First-9: ${avg9.toFixed(1)} · ${highlightBits.slice(0, 2).join(' & ')}`,
      detail: `Hohes Scoring direkt ab Dart 1 (+${(avg9 - seasonAvg).toFixed(1)} über Match-Schnitt), gekrönt von ${highlightBits.join(', ')}.`,
      badgeText: 'Top-Waffe Scoring',
      status: 'green',
    };
  }

  if (singleMatches.length >= 3 && winRate >= 0.7 && seasonAvg >= 44) {
    const wins = singleMatches.filter((m) => m.is_win ?? m.legs_won > m.legs_lost).length;
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `${Math.round(winRate * 100)}% Einzel-Siegquote`,
      detail: `${wins} von ${singleMatches.length} Einzeln gewonnen (First-9 Ø ${avg9.toFixed(1)}${peakSingle ? `, Peak ${peakSingle.avg_total.toFixed(1)}` : ''}).`,
      badgeText: 'Match-Winner',
      status: 'green',
    };
  }

  if (daeAnalytics && !daeAnalytics.isSimulated && daeAnalytics.ai_profile.mental_metrics.clutch_delta >= 2.0) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `Nervenstark (+${daeAnalytics.ai_profile.mental_metrics.clutch_delta.toFixed(1)} Druck-Avg)`,
      detail: `Steigert den Score, wenn der Gegner im Finish-Bereich drückt (${daeAnalytics.legs_count} Legs ausgewertet).`,
      badgeText: 'Clutch-Spieler',
      status: 'green',
    };
  }

  if (singleMatches.length >= 1 && avg9 - seasonAvg >= 5 && avg9 >= 48) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `Starker Anwurf (${avg9.toFixed(1)} First-9)`,
      detail: `Die ersten 9 Darts liegen +${(avg9 - seasonAvg).toFixed(1)} Punkte über dem Gesamtschnitt${peakSingle ? ` (Saison-Bestwert: ${peakSingle.avg_total.toFixed(1)} Avg)` : ''}.`,
      badgeText: 'Schnellstarter',
      status: 'green',
    };
  }

  if (doublesSummary.myAvg !== null && doublesSummary.myAvg >= 45 && doublesSummary.wins > 0) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `${doublesSummary.myAvg.toFixed(1)} Doppel-Werfer-Avg`,
      detail: `Starke Teamleistung im Doppel (${doublesSummary.wins}/${doublesSummary.games} Siege, ${doublesSummary.myCheckouts}× selbst gecheckt).`,
      badgeText: 'Doppel-Stütze',
      status: 'green',
    };
  }

  if (trainingStats && trainingStats.hasTrainingData && trainingStats.totalDoubleQuote >= 16) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `${trainingStats.totalDoubleQuote.toFixed(1)}% Trainings-Doppel`,
      detail: `Starke Präzision auf die äußeren Ringe (${trainingStats.totalDoubleHits}/${trainingStats.totalDoubleDarts} Treffer über ${trainingStats.totalTrainingGames} Spiele).`,
      badgeText: 'Doppel-Stärke',
      status: 'green',
    };
  }

  if (peakSingle) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `Peak ${peakSingle.avg_total.toFixed(1)} vs. ${getOpponentShort(peakSingle.opponent)}`,
      detail: `Bestes Saison-Einzel mit ${peakSingle.legs_won}:${peakSingle.legs_lost} Legs${peakSingle.avg_9 > 0 ? ` und ${peakSingle.avg_9.toFixed(1)} First-9` : ''}.`,
      badgeText: 'Saison-Peak',
      status: peakSingle.avg_total >= 45 ? 'green' : 'yellow',
    };
  }

  const latestDouble = doublesHistory[0];
  if (latestDouble) {
    return {
      number: 2,
      icon: '🌟',
      label: 'Was lief richtig gut?',
      headline: `Doppel mit ${latestDouble.partner_name.split(' ')[0]} (${latestDouble.legs_won}:${latestDouble.legs_lost})`,
      detail: `Paar-Average ${latestDouble.pair_avg.toFixed(1)} gegen ${latestDouble.opponent}.`,
      badgeText: 'Doppel-Einsatz',
      status: latestDouble.is_win ? 'green' : 'yellow',
    };
  }

  return {
    number: 2,
    icon: '🌟',
    label: 'Was lief richtig gut?',
    headline: 'Datenbasis im Aufbau',
    detail: 'Nach den ersten Ligaspielen oder Trainingseinheiten erscheint hier deine Top-Stärke.',
    badgeText: 'Noch offen',
    status: 'yellow',
  };
}

function getWeakestCheckoutSegment(trainingStats?: PlayerTrainingDoublesStats | null): {
  name: string;
  quote: number;
  darts: number;
} | null {
  if (!trainingStats || trainingStats.checkoutBattle.darts < 20) return null;
  const segments = [
    { name: 'D20', ...trainingStats.checkoutBattle.d20 },
    { name: 'D16', ...trainingStats.checkoutBattle.d16 },
    { name: 'D10', ...trainingStats.checkoutBattle.d10 },
    { name: 'D8', ...trainingStats.checkoutBattle.d8 },
    { name: 'D4', ...trainingStats.checkoutBattle.d4 },
  ].filter((s) => s.darts >= 10);

  if (segments.length === 0) return null;
  segments.sort((a, b) => a.quote - b.quote);
  return { name: segments[0].name, quote: segments[0].quote, darts: segments[0].darts };
}

function buildFact3AndFact6(
  singleMatches: PlayerSingleMatchInput[],
  seasonAvg: number,
  avg9: number,
  trainingStats?: PlayerTrainingDoublesStats | null,
  daeAnalytics?: PlayerDAEAnalytics | null
): BottleneckRecommendation {
  const hasRealVisits = Boolean(daeAnalytics && !daeAnalytics.isSimulated && daeAnalytics.legs_count >= 3);
  const weakSegment = getWeakestCheckoutSegment(trainingStats);

  // 1. Akute Doppel-Schwäche im Training (< 13% bei >= 30 Darts)
  if (trainingStats && trainingStats.totalDoubleDarts >= 30 && trainingStats.totalDoubleQuote < 13) {
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `Doppelquote bei ${trainingStats.totalDoubleQuote.toFixed(1)}%`,
        detail: `${trainingStats.totalDoubleHits}/${trainingStats.totalDoubleDarts} Treffer auf Doppel${weakSegment ? ` – besonders ${weakSegment.name} (${weakSegment.quote.toFixed(1)}%) bremst noch` : ''}.`,
        badgeText: 'Doppel-Hebel',
        status: 'red',
      },
      trainingHref: '/doppelquote',
      trainingLabel: '🎯 Checkout-Battle starten →',
      trainingHeadline: 'Checkout-Battle (D20/D16/D8)',
      trainingDetail: `Gezieltes Doppeltraining baut Muskelgedächtnis auf. Ziel: Von ${trainingStats.totalDoubleQuote.toFixed(1)}% über 15% klettern.`,
      trainingBadge: 'Modul: Checkout-Battle',
    };
  }

  // 2. Hoher Ausreißer-Anteil in echten Visits (>= 28% Aufnahmen <= 30 Pkt)
  if (hasRealVisits && daeAnalytics!.ai_profile.mental_metrics.instability_index >= 28) {
    const inst = daeAnalytics!.ai_profile.mental_metrics.instability_index;
    const count26 = daeAnalytics!.leg_anatomy.count_26;
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `${inst.toFixed(1)}% Aufnahmen ≤ 30 Pkt`,
        detail: `Zu viele Ausrutscher ins Nachbarfeld (${count26}× 26er in ${daeAnalytics!.legs_count} Legs) drücken den Schnitt.`,
        badgeText: inst >= 36 ? 'Hohe Streuung' : 'Konstanz-Hebel',
        status: inst >= 36 ? 'red' : 'yellow',
      },
      trainingHref: '/training/pdc-challenge',
      trainingLabel: '🏆 PDC Challenge starten →',
      trainingHeadline: 'PDC Challenge (Konstanz)',
      trainingDetail: 'Reduziert Ausreißer auf die 1 & 5 durch strukturiertes Scoring auf 20, 19 und Bull.',
      trainingBadge: 'Modul: PDC Challenge',
    };
  }

  // 3. Spürbarer Late-Leg Drop / Ziellinien-Hänger aus Visits oder Saison-9D vs Gesamt
  const avgDropLeague = avg9 > 0 && seasonAvg > 0 ? avg9 - seasonAvg : 0;
  const lateLegDrop = hasRealVisits ? daeAnalytics!.ai_profile.mental_metrics.late_leg_drop : 0;
  if ((hasRealVisits && lateLegDrop >= 9) || (singleMatches.length >= 3 && avgDropLeague >= 7.5)) {
    const dropVal = hasRealVisits && lateLegDrop >= 9 ? lateLegDrop : avgDropLeague;
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `Late-Game Drop (-${dropVal.toFixed(1)} Pkt)`,
        detail: `Nach starkem Start (First-9: ${avg9.toFixed(1)}) kostet der Übergang ins Checken im Finish-Bereich zu viele Darts.`,
        badgeText: 'Finish-Übergang',
        status: dropVal >= 12 ? 'red' : 'yellow',
      },
      trainingHref: '/training/stellen-checken',
      trainingLabel: '🎲 Stellen & Checken starten →',
      trainingHeadline: 'Stellen & Checken (3–101 Rest)',
      trainingDetail: 'Trainiert gezielt das schnelle Umstellen und Zumachen ab 101 Rest ohne Umweg-Darts.',
      trainingBadge: 'Modul: Stellen & Checken',
    };
  }

  // 4. Stellen & Checken Quote im Training niedrig (< 22% bei >= 30 Finishes)
  if (trainingStats && trainingStats.stellenChecken.rounds >= 30 && trainingStats.stellenChecken.quote < 22) {
    const scQ = trainingStats.stellenChecken.quote;
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `Finish-Quote ${scQ.toFixed(1)}% (Stellen & Checken)`,
        detail: `${trainingStats.stellenChecken.checks} von ${trainingStats.stellenChecken.rounds} Finishes gelöscht (${trainingStats.stellenChecken.gamesCount} Sequenzen) – hier liegt direktes Sieg-Potenzial.`,
        badgeText: 'Stellen & Checken',
        status: scQ < 14 ? 'red' : 'yellow',
      },
      trainingHref: '/training/stellen-checken',
      trainingLabel: '🎲 Stellen & Checken starten →',
      trainingHeadline: '2× Stellen & Checken pro Woche',
      trainingDetail: `Steigert die Finish-Quote über 25% und hilft, enge 5-Leg-Spiele sicher zuzumachen.`,
      trainingBadge: 'Modul: Stellen & Checken',
    };
  }

  // 5. Schwächstes Checkout-Segment unter den 5 Kern-Doppeln
  if (weakSegment && weakSegment.quote < 18) {
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `Segment ${weakSegment.name} nur ${weakSegment.quote.toFixed(1)}%`,
        detail: `Während dein Gesamtschnitt stimmt, fällt ${weakSegment.name} im Checkout-Battle ab – im Match auf dieses Doppel ausweichen oder trainieren.`,
        badgeText: 'Segment-Lücke',
        status: weakSegment.quote < 10 ? 'red' : 'yellow',
      },
      trainingHref: '/doppelquote',
      trainingLabel: '🎯 Checkout-Battle starten →',
      trainingHeadline: `Fokus-Check: ${weakSegment.name} stabilisieren`,
      trainingDetail: `1 Runde Checkout-Battle mit bewusstem Nachhalten auf ${weakSegment.name} spielen.`,
      trainingBadge: 'Modul: Checkout-Battle',
    };
  }

  // 6. Unter Gegnerdruck verliert der Spieler Score (Clutch Delta < -2)
  if (hasRealVisits && daeAnalytics!.ai_profile.mental_metrics.clutch_delta <= -2.5) {
    const cd = daeAnalytics!.ai_profile.mental_metrics.clutch_delta;
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: `Druck-Delta ${cd.toFixed(1)} Pkt`,
        detail: `Wenn der Gegner im Finish steht, sinkt dein Score leicht. Kopf hoch und im Trainingsduell Matchdruck simulieren.`,
        badgeText: 'Matchdruck',
        status: 'yellow',
      },
      trainingHref: '/training/fussball',
      trainingLabel: '⚽ Fußball Darts starten →',
      trainingHeadline: 'Fußball Darts gegen KI / 1vs1',
      trainingDetail: 'Simuliert direkte Tor- und Finish-Situationen unter Gegendruck.',
      trainingBadge: 'Modul: Fußball Darts',
    };
  }

  // 7. Keine akute Baustelle -> Geringstes Trainingspensum oder Feinschliff empfehlen
  if (!trainingStats || !trainingStats.hasTrainingData) {
    return {
      fact: {
        number: 3,
        icon: '⚠️',
        label: 'Woran hapert es gerade?',
        headline: 'Keine Trainings-Messwerte',
        detail: 'Es liegen noch keine Trainingsspiele vor, um Doppel- und Finish-Quoten exakt zu vermessen.',
        badgeText: 'Messlücke',
        status: 'yellow',
      },
      trainingHref: '/doppelquote',
      trainingLabel: '🎯 Checkout-Battle starten →',
      trainingHeadline: 'Basis-Check: Checkout-Battle',
      trainingDetail: 'Mit nur einem 5-Doppel-Durchlauf wird deine empirische Doppel-DNA automatisch berechnet.',
      trainingBadge: 'Modul: Checkout-Battle',
    };
  }

  // Alles stabil/grün -> Feinschliff-Empfehlung nach niedrigster Spielzahl
  const counts = [
    {
      n: trainingStats.stellenChecken.gamesCount,
      href: '/training/stellen-checken',
      label: '🎲 Stellen & Checken starten →',
      headline: 'Feinschliff: Stellen & Checken',
      detail: 'Alle Basiswerte sind im grünen Bereich – mit Stellen & Checken schärfst du 2-Dart-Finishes unter Matchtempo.',
      badge: 'Modul: Stellen & Checken',
    },
    {
      n: trainingStats.fussball.gamesCount,
      href: '/training/fussball',
      label: '⚽ Fußball Darts starten →',
      headline: 'Matchhärte: Fußball Darts',
      detail: 'Starke Grundform – halte den Wettkampfdruck mit einem schnellen Tor-Duell hoch.',
      badge: 'Modul: Fußball Darts',
    },
    {
      n: trainingStats.checkoutBattle.gamesCount,
      href: '/doppelquote',
      label: '🎯 Checkout-Battle starten →',
      headline: 'Doppel-Routine: Checkout-Battle',
      detail: 'Sehr runde Werte – halte deine 5 Kern-Doppel D20 bis D4 mit einem kurzen Durchgang warm.',
      badge: 'Modul: Checkout-Battle',
    },
  ].sort((a, b) => a.n - b.n);

  const pick = counts[0];
  return {
    fact: {
      number: 3,
      icon: '⚠️',
      label: 'Woran hapert es gerade?',
      headline: 'Keine akute Baustelle',
      detail: 'Keine kritischen Einbrüche erkennbar – Fokus liegt auf Feinschliff bei hohen 2-Dart-Finishes.',
      badgeText: 'Alles stabil',
      status: 'green',
    },
    trainingHref: pick.href,
    trainingLabel: pick.label,
    trainingHeadline: pick.headline,
    trainingDetail: pick.detail,
    trainingBadge: pick.badge,
  };
}

function buildFact4(
  doublesSummary: DoublesSummary,
  trainingStats?: PlayerTrainingDoublesStats | null
): KeyFactCardData {
  if (trainingStats && trainingStats.hasTrainingData && trainingStats.totalDoubleDarts > 0) {
    const q = trainingStats.totalDoubleQuote;
    const status: TrafficLight = q >= 18 ? 'green' : q >= 12 ? 'yellow' : 'red';
    const tier =
      q >= 20
        ? 'Elite-Klasse'
        : q >= 15
        ? 'Ligaklasse'
        : q >= 10
        ? 'Bezirksklasse'
        : 'Aufbautraining';
    const weak = getWeakestCheckoutSegment(trainingStats);
    const bestBit =
      trainingStats.checkoutBattle.bestDouble !== '-'
        ? ` · Top: ${trainingStats.checkoutBattle.bestDouble}`
        : '';
    const weakBit = weak ? ` · Schwächstes: ${weak.name} (${weak.quote.toFixed(1)}%)` : '';
    const leagueBit =
      doublesSummary.myCheckouts > 0
        ? ` · Liga-Doppel: ${doublesSummary.myCheckouts}× Check`
        : '';

    return {
      number: 4,
      icon: '🎯',
      label: 'Echte Doppel-DNA',
      headline: `${q.toFixed(1)}% Gesamtquote`,
      detail: `${trainingStats.totalDoubleHits}/${trainingStats.totalDoubleDarts} Treffer im Training${bestBit}${weakBit}${leagueBit}.`,
      badgeText: tier,
      status,
    };
  }

  if (trainingStats && trainingStats.stellenChecken.rounds > 0) {
    const q = trainingStats.stellenChecken.quote;
    return {
      number: 4,
      icon: '🎯',
      label: 'Echte Doppel-DNA',
      headline: `${q.toFixed(1)}% Finish-Quote`,
      detail: `${trainingStats.stellenChecken.checks}/${trainingStats.stellenChecken.rounds} Finishes in Stellen & Checken (noch keine reinen Doppelspiele).`,
      badgeText: 'Stellen & Checken',
      status: q >= 22 ? 'green' : q >= 14 ? 'yellow' : 'red',
    };
  }

  return {
    number: 4,
    icon: '🎯',
    label: 'Echte Doppel-DNA',
    headline: 'Noch ohne Trainingsdaten',
    detail: 'Spiele ein Checkout-Battle oder Fußball-Match, um deine empirische Doppelquote freizuschalten.',
    badgeText: 'Daten offen',
    status: 'yellow',
  };
}

function buildFact5(
  seasonAvg: number,
  doublesSummary: DoublesSummary,
  doublesSpecialsCount: number
): KeyFactCardData {
  if (doublesSummary.trackedGames > 0 && doublesSummary.myAvg !== null) {
    const diff = seasonAvg > 0 ? doublesSummary.myAvg - seasonAvg : 0;
    const status: TrafficLight =
      seasonAvg <= 0
        ? doublesSummary.myAvg >= 45
          ? 'green'
          : 'yellow'
        : doublesSummary.myAvg >= seasonAvg - 1.5 && doublesSummary.wins >= doublesSummary.games / 2
        ? 'green'
        : doublesSummary.myAvg >= seasonAvg - 5
        ? 'yellow'
        : 'red';

    const badgeText =
      seasonAvg <= 0
        ? `${doublesSummary.trackedGames}× erfasst`
        : diff >= 1
        ? `+${diff.toFixed(1)} im Doppel stärker`
        : diff >= -2.5
        ? 'Auf Einzel-Niveau'
        : `${diff.toFixed(1)} unter Einzel`;

    return {
      number: 5,
      icon: '🤝',
      label: 'Einzel vs. Doppel (Werfer)',
      headline: `${doublesSummary.myAvg.toFixed(1)} Doppel-Avg`,
      detail: `100%-Werferwerte (${doublesSummary.trackedGames} Partien): First-9 ${doublesSummary.myFirst9Avg?.toFixed(1) || '-'} · ${doublesSummary.myCheckouts}× Checks vs. Einzel-Ø ${seasonAvg > 0 ? seasonAvg.toFixed(1) : '-'} (${doublesSummary.wins}/${doublesSummary.games} Doppel-Siege).`,
      badgeText,
      status,
    };
  }

  if (doublesSummary.games > 0) {
    const winRate = doublesSummary.wins / doublesSummary.games;
    return {
      number: 5,
      icon: '🤝',
      label: 'Einzel vs. Doppel',
      headline: `${doublesSummary.wins}/${doublesSummary.games} Doppel-Siege`,
      detail: `Paar-Average ${doublesSummary.pairAvg.toFixed(1)} (${doublesSpecialsCount}× Doppel-Specials). Einzelwerfer-Spalten greifen ab neuer Spieltag-Software.`,
      badgeText: `Team-Ø ${doublesSummary.pairAvg.toFixed(1)}`,
      status: winRate >= 0.5 ? 'green' : 'yellow',
    };
  }

  return {
    number: 5,
    icon: '🤝',
    label: 'Einzel vs. Doppel',
    headline: 'Noch kein Doppel',
    detail: 'In dieser Saison wurden noch keine Doppelpartien für diesen Spieler erfasst.',
    badgeText: 'Nur Einzel',
    status: 'yellow',
  };
}

/**
 * Berechnet aus Einzel-, Doppel-Werfer-, Visit- und Trainingsdaten
 * das kompakte 3-Säulen-Ampelsystem mit genau 6 Key Facts.
 */
export function computePlayerPulse({
  singleMatches,
  doublesHistory,
  doublesSpecialsCount,
  trainingStats,
  daeAnalytics,
}: {
  playerName: string;
  singleMatches: PlayerSingleMatchInput[];
  doublesHistory: PlayerDoublesHistoryItem[];
  doublesSpecialsCount: number;
  trainingStats?: PlayerTrainingDoublesStats | null;
  daeAnalytics?: PlayerDAEAnalytics | null;
}): PlayerPulseResult {
  const doublesSummary = summarizeDoubles(doublesHistory);

  const { fact: fact1, seasonAvg, winRate, avg9 } = buildFact1(
    singleMatches,
    doublesSummary,
    daeAnalytics
  );

  const fact2 = buildFact2(
    singleMatches,
    doublesHistory,
    doublesSummary,
    seasonAvg,
    winRate,
    avg9,
    trainingStats,
    daeAnalytics
  );

  const bottleneck = buildFact3AndFact6(
    singleMatches,
    seasonAvg,
    avg9,
    trainingStats,
    daeAnalytics
  );
  const fact3 = bottleneck.fact;
  const fact4 = buildFact4(doublesSummary, trainingStats);
  const fact5 = buildFact5(seasonAvg, doublesSummary, doublesSpecialsCount);

  const fact6: KeyFactCardData = {
    number: 6,
    icon: '🏋️',
    label: 'Dein #1 Trainings-Fokus',
    headline: bottleneck.trainingHeadline,
    detail: bottleneck.trainingDetail,
    badgeText: bottleneck.trainingBadge,
    status: fact3.status === 'red' ? 'yellow' : fact3.status,
    actionHref: bottleneck.trainingHref,
    actionLabel: bottleneck.trainingLabel,
  };

  const col1Status = combineTrafficLight([fact1.status, fact2.status]);
  const col2Status = combineTrafficLight([fact3.status, fact4.status]);
  const col3Status = combineTrafficLight([fact5.status, fact6.status]);

  const columns: [AmpelColumnData, AmpelColumnData, AmpelColumnData] = [
    {
      id: 'form-strength',
      title: '1. Form & Top-Stärke',
      subtitle: 'Aktueller Trend & beste Waffe',
      status: col1Status,
      statusLabel: getStatusLabel(col1Status, 'form'),
      facts: [fact1, fact2],
    },
    {
      id: 'bottleneck-doubles',
      title: '2. Baustelle & Doppel-DNA',
      subtitle: 'Größter Hebel & Checkout-Quote',
      status: col2Status,
      statusLabel: getStatusLabel(col2Status, 'fix'),
      facts: [fact3, fact4],
    },
    {
      id: 'teamplay-focus',
      title: '3. Einzel vs. Doppel & Fokus',
      subtitle: 'Werfer-Check & Trainingsempfehlung',
      status: col3Status,
      statusLabel: getStatusLabel(col3Status, 'focus'),
      facts: [fact5, fact6],
    },
  ];

  return { columns, doublesSummary };
}
