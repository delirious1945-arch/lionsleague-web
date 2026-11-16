import type { DoublesMatchRow, DoublesSpecialRow, MatchRow } from './data';
import {
  calculateMatchPerformance,
  getPointsForAverage,
  getPointsForHighScores,
  getPointsForWinRatio,
  Settings,
} from './scoring';

export type SynergyTone = 'emerald' | 'cyan' | 'amber' | 'slate';

export interface ThrowerMatchBreakdown {
  playerId: number;
  playerName: string;
  avg: number;
  first9Avg: number;
  darts: number;
  scores80: number;
  scores100: number;
  scores140: number;
  scores180: number;
  scoresTotal: number;
  checkouts: number;
  checkoutSharePct: number;
  individualIndex: number;
  baseIndex: number;
  closerBonus: number;
  isScoringLeader: boolean;
  isCloser: boolean;
}

export interface AnalyzedDoublesMatch {
  id: number;
  matchDate: string;
  formattedDate: string;
  team: string;
  opponent: string;
  p1Id: number;
  p2Id: number;
  p1Name: string;
  p2Name: string;
  legsWon: number;
  legsLost: number;
  isWin: boolean;
  pairAvg: number;
  pairAvg9: number;
  pairAvg18: number;
  scores80: number;
  scores100: number;
  scores140: number;
  scores180: number;
  scoresTotal: number;
  specialsCount: number;
  pairRating: number;
  pairRatingWithSpecials: number;
  ratingStatus: 'green' | 'yellow' | 'red';
  hasIndividualStats: boolean;
  synergy: {
    label: string;
    tone: SynergyTone;
    desc: string;
  };
  p1Breakdown: ThrowerMatchBreakdown | null;
  p2Breakdown: ThrowerMatchBreakdown | null;
  specialsInMatch: DoublesSpecialRow[];
}

export interface DoublesThrowerLeaderboardEntry {
  playerId: number;
  playerName: string;
  team: string;
  gamesTotal: number;
  winsTotal: number;
  gamesTracked: number;
  trackedWins: number;
  totalDarts: number;
  trackedAvg: number | null;
  trackedFirst9Avg: number | null;
  singlesAvg: number | null;
  deltaVsSingles: number | null;
  totalCheckouts: number;
  scores80: number;
  scores100: number;
  scores140: number;
  scores180: number;
  avgIndividualIndex: number | null;
  avgPairAvgAll: number;
}

export interface DoublesPairSummary {
  pairKey: string;
  playerAName: string;
  playerBName: string;
  team: string;
  games: number;
  wins: number;
  winRatePct: number;
  legsWon: number;
  legsLost: number;
  avgTotal: number;
  avg9: number;
  avg18: number;
  specialsCount: number;
  avgPairRating: number;
  trackedGames: number;
}

function formatIsoDateToDe(raw: string): string {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}.${m}.${y}`;
  }
  return raw;
}

function normalizeName(name: string): string {
  return name.normalize('NFC').trim().toLowerCase();
}

function computeIndividualThrowerIndex(params: {
  isWin: boolean;
  legsPlayed: number;
  legsWon: number;
  myAvg: number;
  myFirst9Avg: number;
  myScoresTotal: number;
  myCheckouts: number;
  settings: Settings;
}): { total: number; base: number; closerBonus: number } {
  const {
    isWin,
    legsPlayed,
    myAvg,
    myFirst9Avg,
    myScoresTotal,
    myCheckouts,
    settings,
  } = params;

  const ptsWin = getPointsForWinRatio(isWin ? 100 : 0);
  const ptsAvg = getPointsForAverage(myAvg);
  const ptsFirst9 = getPointsForAverage(myFirst9Avg > 0 ? myFirst9Avg : myAvg);
  // Im Doppel wirft jeder Spieler ~50% der Aufnahmen eines Legs -> x2 normiert auf Einzel-Skala
  const normalizedScoresPerLeg =
    legsPlayed > 0 ? (myScoresTotal * 2) / legsPlayed : 0;
  const ptsScores = getPointsForHighScores(normalizedScoresPerLeg);

  const avgPlusMidWeight =
    (settings.avg_weight + settings.avg18_weight) / 100.0;

  const base =
    ptsWin * (settings.win_weight / 100.0) +
    ptsAvg * avgPlusMidWeight +
    ptsFirst9 * (settings.avg9_weight / 100.0) +
    ptsScores * (settings.scores_weight / 100.0);

  // Closer-Bonus: +0.15 pro eigenem Doppel-Checkout auf Doppel-Out
  const closerBonus = myCheckouts * 0.15;
  return {
    base: Math.round(base * 100) / 100,
    closerBonus: Math.round(closerBonus * 100) / 100,
    total: Math.round((base + closerBonus) * 100) / 100,
  };
}

export function analyzeDoublesMatches(params: {
  doublesMatches: DoublesMatchRow[];
  singleMatches: MatchRow[];
  doublesSpecials: DoublesSpecialRow[];
  playersTeamMap: Record<string, string>;
  settings: Settings;
}): {
  analyzedMatches: AnalyzedDoublesMatch[];
  throwerLeaderboard: DoublesThrowerLeaderboardEntry[];
  pairSummaries: DoublesPairSummary[];
} {
  const {
    doublesMatches,
    singleMatches,
    doublesSpecials,
    playersTeamMap,
    settings,
  } = params;

  // Einzel-Average pro Spieler für direkten Vergleich (Δ Doppel vs. Einzel)
  const singlesAgg: Record<string, { sum: number; count: number }> = {};
  for (const m of singleMatches) {
    const key = normalizeName(m.player_name);
    if (!singlesAgg[key]) singlesAgg[key] = { sum: 0, count: 0 };
    singlesAgg[key].sum += Number(m.avg_total) || 0;
    singlesAgg[key].count += 1;
  }

  const analyzedMatches: AnalyzedDoublesMatch[] = [];

  for (const m of doublesMatches) {
    const isWin = m.legs_won > m.legs_lost;
    const legsPlayed = m.legs_won + m.legs_lost;

    const perf = calculateMatchPerformance(
      {
        legs_won: m.legs_won,
        legs_lost: m.legs_lost,
        avg_total: m.avg_total,
        avg_9: m.avg_9,
        avg_18: m.avg_18,
        scores_80: m.scores_80,
        scores_100: m.scores_100,
        scores_140: m.scores_140,
        scores_180: m.scores_180,
        specials_count: m.specials_count,
      },
      settings
    );

    const hasIndividualStats =
      m.player1_avg !== null &&
      m.player1_avg !== undefined &&
      m.player1_avg > 0 &&
      m.player2_avg !== null &&
      m.player2_avg !== undefined &&
      m.player2_avg > 0;

    let p1Breakdown: ThrowerMatchBreakdown | null = null;
    let p2Breakdown: ThrowerMatchBreakdown | null = null;
    let synergy: AnalyzedDoublesMatch['synergy'] = {
      label: '📊 Alt-Software (Paar-Summe)',
      tone: 'slate',
      desc: 'Gegner-Software ohne 100%-Einzelwerfer-Export',
    };

    if (hasIndividualStats) {
      const p1Avg = Number(m.player1_avg || 0);
      const p2Avg = Number(m.player2_avg || 0);
      const p1F9 = Number(m.player1_first9_avg || 0);
      const p2F9 = Number(m.player2_first9_avg || 0);
      const p1Darts = Number(m.player1_darts || 0);
      const p2Darts = Number(m.player2_darts || 0);
      const p1S80 = Number(m.player1_scores_80 || 0);
      const p2S80 = Number(m.player2_scores_80 || 0);
      const p1S100 = Number(m.player1_scores_100 || 0);
      const p2S100 = Number(m.player2_scores_100 || 0);
      const p1S140 = Number(m.player1_scores_140 || 0);
      const p2S140 = Number(m.player2_scores_140 || 0);
      const p1S180 = Number(m.player1_scores_180 || 0);
      const p2S180 = Number(m.player2_scores_180 || 0);
      const p1Co = Number(m.player1_checkouts || 0);
      const p2Co = Number(m.player2_checkouts || 0);

      const p1ScoresTotal = p1S80 + p1S100 + p1S140 + p1S180;
      const p2ScoresTotal = p2S80 + p2S100 + p2S140 + p2S180;

      const idx1 = computeIndividualThrowerIndex({
        isWin,
        legsPlayed,
        legsWon: m.legs_won,
        myAvg: p1Avg,
        myFirst9Avg: p1F9,
        myScoresTotal: p1ScoresTotal,
        myCheckouts: p1Co,
        settings,
      });

      const idx2 = computeIndividualThrowerIndex({
        isWin,
        legsPlayed,
        legsWon: m.legs_won,
        myAvg: p2Avg,
        myFirst9Avg: p2F9,
        myScoresTotal: p2ScoresTotal,
        myCheckouts: p2Co,
        settings,
      });

      const diff = Math.abs(p1Avg - p2Avg);
      if (p1Avg >= 45 && p2Avg >= 45) {
        synergy = {
          label: '🔥 High-Power Duo',
          tone: 'emerald',
          desc: 'Beide Werfer über 45,0 Avg',
        };
      } else if (diff < 4) {
        synergy = {
          label: '⚖️ Ausgeglichenes Duo',
          tone: 'cyan',
          desc: `Nur ${diff.toFixed(1)} Pkt Abstand zwischen beiden Werfern`,
        };
      } else {
        synergy = {
          label: '🚀 Zugpferd & Partner',
          tone: 'amber',
          desc: `${diff.toFixed(1)} Pkt Avg-Unterschied im Paar`,
        };
      }

      p1Breakdown = {
        playerId: m.player1_id,
        playerName: m.p1_name,
        avg: p1Avg,
        first9Avg: p1F9,
        darts: p1Darts,
        scores80: p1S80,
        scores100: p1S100,
        scores140: p1S140,
        scores180: p1S180,
        scoresTotal: p1ScoresTotal,
        checkouts: p1Co,
        checkoutSharePct:
          m.legs_won > 0 ? Math.round((p1Co / m.legs_won) * 100) : 0,
        individualIndex: idx1.total,
        baseIndex: idx1.base,
        closerBonus: idx1.closerBonus,
        isScoringLeader:
          p1Avg > p2Avg + 0.5 || (Math.abs(p1Avg - p2Avg) <= 0.5 && p1F9 > p2F9),
        isCloser: p1Co > p2Co && p1Co > 0,
      };

      p2Breakdown = {
        playerId: m.player2_id,
        playerName: m.p2_name,
        avg: p2Avg,
        first9Avg: p2F9,
        darts: p2Darts,
        scores80: p2S80,
        scores100: p2S100,
        scores140: p2S140,
        scores180: p2S180,
        scoresTotal: p2ScoresTotal,
        checkouts: p2Co,
        checkoutSharePct:
          m.legs_won > 0 ? Math.round((p2Co / m.legs_won) * 100) : 0,
        individualIndex: idx2.total,
        baseIndex: idx2.base,
        closerBonus: idx2.closerBonus,
        isScoringLeader:
          p2Avg > p1Avg + 0.5 || (Math.abs(p1Avg - p2Avg) <= 0.5 && p2F9 > p1F9),
        isCloser: p2Co > p1Co && p2Co > 0,
      };
    }

    const specialsInMatch = doublesSpecials.filter((sp) => {
      if (sp.match_date !== m.match_date) return false;
      const oppMatch =
        normalizeName(sp.opponent_team) === normalizeName(m.opponent);
      const pNorm = normalizeName(sp.player_name);
      const pairMatch =
        pNorm === normalizeName(m.p1_name) || pNorm === normalizeName(m.p2_name);
      return oppMatch && pairMatch;
    });

    const ratingStatus: 'green' | 'yellow' | 'red' =
      perf.total_rating >= 4.2
        ? 'green'
        : perf.total_rating >= 2.8
          ? 'yellow'
          : 'red';

    analyzedMatches.push({
      id: m.id,
      matchDate: m.match_date,
      formattedDate: formatIsoDateToDe(m.match_date),
      team: m.team,
      opponent: m.opponent,
      p1Id: m.player1_id,
      p2Id: m.player2_id,
      p1Name: m.p1_name,
      p2Name: m.p2_name,
      legsWon: m.legs_won,
      legsLost: m.legs_lost,
      isWin,
      pairAvg: m.avg_total,
      pairAvg9: m.avg_9,
      pairAvg18: m.avg_18,
      scores80: m.scores_80,
      scores100: m.scores_100,
      scores140: m.scores_140,
      scores180: m.scores_180,
      scoresTotal: m.scores_80 + m.scores_100 + m.scores_140 + m.scores_180,
      specialsCount: m.specials_count,
      pairRating: perf.base_rating,
      pairRatingWithSpecials: perf.total_rating,
      ratingStatus,
      hasIndividualStats,
      synergy,
      p1Breakdown,
      p2Breakdown,
      specialsInMatch,
    });
  }

  // Aggregation: Einzelwerfer-Leaderboard im Doppel
  const throwerAcc: Record<
    string,
    {
      playerId: number;
      playerName: string;
      team: string;
      gamesTotal: number;
      winsTotal: number;
      pairAvgSumAll: number;
      gamesTracked: number;
      trackedWins: number;
      totalDarts: number;
      weightedAvgNumerator: number;
      first9Sum: number;
      first9Count: number;
      totalCheckouts: number;
      scores80: number;
      scores100: number;
      scores140: number;
      scores180: number;
      indexSum: number;
    }
  > = {};

  for (const am of analyzedMatches) {
    const sides: Array<{
      id: number;
      name: string;
      breakdown: ThrowerMatchBreakdown | null;
    }> = [
      { id: am.p1Id, name: am.p1Name, breakdown: am.p1Breakdown },
      { id: am.p2Id, name: am.p2Name, breakdown: am.p2Breakdown },
    ];

    for (const side of sides) {
      const key = normalizeName(side.name);
      if (!throwerAcc[key]) {
        throwerAcc[key] = {
          playerId: side.id,
          playerName: side.name,
          team: playersTeamMap[key] || am.team,
          gamesTotal: 0,
          winsTotal: 0,
          pairAvgSumAll: 0,
          gamesTracked: 0,
          trackedWins: 0,
          totalDarts: 0,
          weightedAvgNumerator: 0,
          first9Sum: 0,
          first9Count: 0,
          totalCheckouts: 0,
          scores80: 0,
          scores100: 0,
          scores140: 0,
          scores180: 0,
          indexSum: 0,
        };
      }
      const entry = throwerAcc[key];
      entry.gamesTotal += 1;
      if (am.isWin) entry.winsTotal += 1;
      entry.pairAvgSumAll += am.pairAvg;

      if (side.breakdown) {
        entry.gamesTracked += 1;
        if (am.isWin) entry.trackedWins += 1;
        const dartsWeight = side.breakdown.darts > 0 ? side.breakdown.darts : 1;
        entry.totalDarts += side.breakdown.darts;
        entry.weightedAvgNumerator += side.breakdown.avg * dartsWeight;
        if (side.breakdown.first9Avg > 0) {
          entry.first9Sum += side.breakdown.first9Avg;
          entry.first9Count += 1;
        }
        entry.totalCheckouts += side.breakdown.checkouts;
        entry.scores80 += side.breakdown.scores80;
        entry.scores100 += side.breakdown.scores100;
        entry.scores140 += side.breakdown.scores140;
        entry.scores180 += side.breakdown.scores180;
        entry.indexSum += side.breakdown.individualIndex;
      }
    }
  }

  const throwerLeaderboard: DoublesThrowerLeaderboardEntry[] = Object.values(
    throwerAcc
  )
    .map((e) => {
      const key = normalizeName(e.playerName);
      const sAgg = singlesAgg[key];
      const singlesAvg =
        sAgg && sAgg.count > 0
          ? Math.round((sAgg.sum / sAgg.count) * 100) / 100
          : null;

      let trackedAvg: number | null = null;
      if (e.gamesTracked > 0) {
        const denom = e.totalDarts > 0 ? e.totalDarts : e.gamesTracked;
        trackedAvg = Math.round((e.weightedAvgNumerator / denom) * 100) / 100;
      }

      const deltaVsSingles =
        trackedAvg !== null && singlesAvg !== null
          ? Math.round((trackedAvg - singlesAvg) * 100) / 100
          : null;

      return {
        playerId: e.playerId,
        playerName: e.playerName,
        team: e.team,
        gamesTotal: e.gamesTotal,
        winsTotal: e.winsTotal,
        gamesTracked: e.gamesTracked,
        trackedWins: e.trackedWins,
        totalDarts: e.totalDarts,
        trackedAvg,
        trackedFirst9Avg:
          e.first9Count > 0
            ? Math.round((e.first9Sum / e.first9Count) * 100) / 100
            : null,
        singlesAvg,
        deltaVsSingles,
        totalCheckouts: e.totalCheckouts,
        scores80: e.scores80,
        scores100: e.scores100,
        scores140: e.scores140,
        scores180: e.scores180,
        avgIndividualIndex:
          e.gamesTracked > 0
            ? Math.round((e.indexSum / e.gamesTracked) * 100) / 100
            : null,
        avgPairAvgAll:
          e.gamesTotal > 0
            ? Math.round((e.pairAvgSumAll / e.gamesTotal) * 100) / 100
            : 0,
      };
    })
    .sort((a, b) => {
      if ((a.trackedAvg !== null) !== (b.trackedAvg !== null)) {
        return a.trackedAvg !== null ? -1 : 1;
      }
      if (a.trackedAvg !== null && b.trackedAvg !== null) {
        return b.trackedAvg - a.trackedAvg;
      }
      if (b.winsTotal !== a.winsTotal) return b.winsTotal - a.winsTotal;
      return b.avgPairAvgAll - a.avgPairAvgAll;
    });

  // Aggregation: Paarungs-Synergie & Duo-Rangliste (kanonische Sortierung A/B)
  const pairAcc: Record<
    string,
    {
      pairKey: string;
      playerAName: string;
      playerBName: string;
      team: string;
      games: number;
      wins: number;
      legsWon: number;
      legsLost: number;
      avgTotalSum: number;
      avg9Sum: number;
      avg18Sum: number;
      specialsCount: number;
      ratingSum: number;
      trackedGames: number;
    }
  > = {};

  for (const am of analyzedMatches) {
    const names = [am.p1Name, am.p2Name].sort((a, b) => a.localeCompare(b, 'de'));
    const pairKey = `${normalizeName(names[0])}__${normalizeName(names[1])}`;
    if (!pairAcc[pairKey]) {
      pairAcc[pairKey] = {
        pairKey,
        playerAName: names[0],
        playerBName: names[1],
        team: am.team,
        games: 0,
        wins: 0,
        legsWon: 0,
        legsLost: 0,
        avgTotalSum: 0,
        avg9Sum: 0,
        avg18Sum: 0,
        specialsCount: 0,
        ratingSum: 0,
        trackedGames: 0,
      };
    }
    const p = pairAcc[pairKey];
    p.games += 1;
    if (am.isWin) p.wins += 1;
    p.legsWon += am.legsWon;
    p.legsLost += am.legsLost;
    p.avgTotalSum += am.pairAvg;
    p.avg9Sum += am.pairAvg9;
    p.avg18Sum += am.pairAvg18;
    p.specialsCount += am.specialsCount;
    p.ratingSum += am.pairRatingWithSpecials;
    if (am.hasIndividualStats) p.trackedGames += 1;
  }

  const pairSummaries: DoublesPairSummary[] = Object.values(pairAcc)
    .map((p) => ({
      pairKey: p.pairKey,
      playerAName: p.playerAName,
      playerBName: p.playerBName,
      team: p.team,
      games: p.games,
      wins: p.wins,
      winRatePct: p.games > 0 ? Math.round((p.wins / p.games) * 100) : 0,
      legsWon: p.legsWon,
      legsLost: p.legsLost,
      avgTotal:
        p.games > 0 ? Math.round((p.avgTotalSum / p.games) * 100) / 100 : 0,
      avg9: p.games > 0 ? Math.round((p.avg9Sum / p.games) * 100) / 100 : 0,
      avg18: p.games > 0 ? Math.round((p.avg18Sum / p.games) * 100) / 100 : 0,
      specialsCount: p.specialsCount,
      avgPairRating:
        p.games > 0 ? Math.round((p.ratingSum / p.games) * 100) / 100 : 0,
      trackedGames: p.trackedGames,
    }))
    .sort((a, b) => {
      if (Math.abs(b.avgPairRating - a.avgPairRating) > 0.05) {
        return b.avgPairRating - a.avgPairRating;
      }
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.avgTotal - a.avgTotal;
    });

  return {
    analyzedMatches,
    throwerLeaderboard,
    pairSummaries,
  };
}
