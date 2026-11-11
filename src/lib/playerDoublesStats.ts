import { sql } from './db';

export interface DoubleSegmentDetail {
  hits: number;
  darts: number;
  quote: number; // in %
}

export interface PlayerTrainingDoublesStats {
  playerName: string;
  // Gesamt nach Modell A: Summe aller Darts auf Doppel aus Checkout-Battle, Fußball und PDC Challenge Part 2
  totalDoubleHits: number;
  totalDoubleDarts: number;
  totalDoubleQuote: number; // in %
  totalTrainingGames: number;
  hasTrainingData: boolean;

  // 1. Checkout-Battle (Labor-Doppeltraining)
  checkoutBattle: {
    gamesCount: number;
    hits: number;
    darts: number;
    quote: number;
    d20: DoubleSegmentDetail;
    d10: DoubleSegmentDetail;
    d16: DoubleSegmentDetail;
    d8: DoubleSegmentDetail;
    d4: DoubleSegmentDetail;
    bestDouble: string;
  };

  // 2. Fußball Darts (Matchdruck-Doppel)
  fussball: {
    gamesCount: number;
    hits: number;
    darts: number;
    quote: number;
    bullHits: number;
    bullDarts: number;
    bullQuote: number;
  };

  // 3. PDC Challenge Routine (Part 2: D1–D20 + Bull à 21 Darts je Spiel)
  pdcChallenge: {
    gamesCount: number;
    hits: number;
    darts: number;
    quote: number;
  };

  // 4. Stellen & Checken (Finish-Erfolgsquote)
  stellenChecken: {
    gamesCount: number;
    checks: number;
    rounds: number;
    quote: number;
  };
}

function calcQuote(hits: number, darts: number): number {
  if (darts <= 0) return 0;
  return Math.round((hits / darts) * 1000) / 10; // z.B. 21.9
}

export async function getAllPlayersTrainingDoublesStats(): Promise<Record<string, PlayerTrainingDoublesStats>> {
  try {
    const [doublesRows, fussballRows, pdcRows, stellenRows] = await Promise.all([
      sql`
        SELECT 
          player_name,
          count(*)::int as games_count,
          sum(total_hits)::int as hits,
          sum(total_darts)::int as darts,
          sum(d20_hits)::int as d20_hits, sum(d20_darts)::int as d20_darts,
          sum(d10_hits)::int as d10_hits, sum(d10_darts)::int as d10_darts,
          sum(d16_hits)::int as d16_hits, sum(d16_darts)::int as d16_darts,
          sum(d8_hits)::int as d8_hits, sum(d8_darts)::int as d8_darts,
          sum(d4_hits)::int as d4_hits, sum(d4_darts)::int as d4_darts
        FROM training_doubles
        GROUP BY player_name
      `.catch(() => []),
      sql`
        SELECT
          player_name,
          count(*)::int as games_count,
          sum(double_hits)::int as hits,
          sum(double_attempts)::int as darts,
          sum(bull_hits)::int as bull_hits,
          sum(bull_attempts)::int as bull_attempts
        FROM training_fussball
        GROUP BY player_name
      `.catch(() => []),
      sql`
        SELECT
          player_name,
          count(*)::int as games_count,
          sum(doubles_hit)::int as hits
        FROM training_pdc_challenge
        GROUP BY player_name
      `.catch(() => []),
      sql`
        SELECT
          player_name,
          count(*)::int as games_count,
          sum(checks_count)::int as checks,
          sum(total_rounds)::int as rounds
        FROM training_stellen_checken
        GROUP BY player_name
      `.catch(() => [])
    ]);

    const statsMap: Record<string, PlayerTrainingDoublesStats> = {};

    const getOrInit = (pName: string): PlayerTrainingDoublesStats => {
      const key = pName.trim().toLowerCase();
      if (!statsMap[key]) {
        statsMap[key] = {
          playerName: pName.trim(),
          totalDoubleHits: 0,
          totalDoubleDarts: 0,
          totalDoubleQuote: 0,
          totalTrainingGames: 0,
          hasTrainingData: false,
          checkoutBattle: {
            gamesCount: 0,
            hits: 0,
            darts: 0,
            quote: 0,
            d20: { hits: 0, darts: 0, quote: 0 },
            d10: { hits: 0, darts: 0, quote: 0 },
            d16: { hits: 0, darts: 0, quote: 0 },
            d8: { hits: 0, darts: 0, quote: 0 },
            d4: { hits: 0, darts: 0, quote: 0 },
            bestDouble: '-',
          },
          fussball: {
            gamesCount: 0,
            hits: 0,
            darts: 0,
            quote: 0,
            bullHits: 0,
            bullDarts: 0,
            bullQuote: 0,
          },
          pdcChallenge: {
            gamesCount: 0,
            hits: 0,
            darts: 0,
            quote: 0,
          },
          stellenChecken: {
            gamesCount: 0,
            checks: 0,
            rounds: 0,
            quote: 0,
          },
        };
      }
      return statsMap[key];
    };

    // 1. Checkout-Battle
    for (const r of doublesRows) {
      if (!r.player_name) continue;
      const s = getOrInit(r.player_name);
      const hits = Number(r.hits) || 0;
      const darts = Number(r.darts) || 0;
      const games = Number(r.games_count) || 0;

      s.checkoutBattle.gamesCount = games;
      s.checkoutBattle.hits = hits;
      s.checkoutBattle.darts = darts;
      s.checkoutBattle.quote = calcQuote(hits, darts);

      const d20H = Number(r.d20_hits) || 0;
      const d20D = Number(r.d20_darts) || 0;
      s.checkoutBattle.d20 = { hits: d20H, darts: d20D, quote: calcQuote(d20H, d20D) };

      const d10H = Number(r.d10_hits) || 0;
      const d10D = Number(r.d10_darts) || 0;
      s.checkoutBattle.d10 = { hits: d10H, darts: d10D, quote: calcQuote(d10H, d10D) };

      const d16H = Number(r.d16_hits) || 0;
      const d16D = Number(r.d16_darts) || 0;
      s.checkoutBattle.d16 = { hits: d16H, darts: d16D, quote: calcQuote(d16H, d16D) };

      const d8H = Number(r.d8_hits) || 0;
      const d8D = Number(r.d8_darts) || 0;
      s.checkoutBattle.d8 = { hits: d8H, darts: d8D, quote: calcQuote(d8H, d8D) };

      const d4H = Number(r.d4_hits) || 0;
      const d4D = Number(r.d4_darts) || 0;
      s.checkoutBattle.d4 = { hits: d4H, darts: d4D, quote: calcQuote(d4H, d4D) };

      // Ermittle bestes Doppel
      const segments = [
        { name: 'D20', q: s.checkoutBattle.d20.quote, h: d20H },
        { name: 'D16', q: s.checkoutBattle.d16.quote, h: d16H },
        { name: 'D10', q: s.checkoutBattle.d10.quote, h: d10H },
        { name: 'D8', q: s.checkoutBattle.d8.quote, h: d8H },
        { name: 'D4', q: s.checkoutBattle.d4.quote, h: d4H },
      ].sort((a, b) => b.q - a.q || b.h - a.h);

      if (segments[0].h > 0) {
        s.checkoutBattle.bestDouble = `${segments[0].name} (${segments[0].q}%)`;
      }

      s.totalDoubleHits += hits;
      s.totalDoubleDarts += darts;
      s.totalTrainingGames += games;
      s.hasTrainingData = true;
    }

    // 2. Fußball Darts
    for (const r of fussballRows) {
      if (!r.player_name) continue;
      const s = getOrInit(r.player_name);
      const hits = Number(r.hits) || 0;
      const darts = Number(r.darts) || 0;
      const bHits = Number(r.bull_hits) || 0;
      const bDarts = Number(r.bull_attempts) || 0;
      const games = Number(r.games_count) || 0;

      s.fussball.gamesCount = games;
      s.fussball.hits = hits;
      s.fussball.darts = darts;
      s.fussball.quote = calcQuote(hits, darts);
      s.fussball.bullHits = bHits;
      s.fussball.bullDarts = bDarts;
      s.fussball.bullQuote = calcQuote(bHits, bDarts);

      s.totalDoubleHits += hits;
      s.totalDoubleDarts += darts;
      s.totalTrainingGames += games;
      s.hasTrainingData = true;
    }

    // 3. PDC Challenge Part 2
    for (const r of pdcRows) {
      if (!r.player_name) continue;
      const s = getOrInit(r.player_name);
      const games = Number(r.games_count) || 0;
      const hits = Number(r.hits) || 0;
      const darts = games * 21; // Part 2 hat immer exakt 21 Darts auf Doppel (D1–D20 + Bull)

      s.pdcChallenge.gamesCount = games;
      s.pdcChallenge.hits = hits;
      s.pdcChallenge.darts = darts;
      s.pdcChallenge.quote = calcQuote(hits, darts);

      s.totalDoubleHits += hits;
      s.totalDoubleDarts += darts;
      s.totalTrainingGames += games;
      s.hasTrainingData = true;
    }

    // 4. Stellen & Checken
    for (const r of stellenRows) {
      if (!r.player_name) continue;
      const s = getOrInit(r.player_name);
      const games = Number(r.games_count) || 0;
      const checks = Number(r.checks) || 0;
      const rounds = Number(r.rounds) || 0;

      s.stellenChecken.gamesCount = games;
      s.stellenChecken.checks = checks;
      s.stellenChecken.rounds = rounds;
      s.stellenChecken.quote = calcQuote(checks, rounds);
      s.totalTrainingGames += games;
      s.hasTrainingData = true;
    }

    // Finale Gesamt-Doppelquote berechnen
    for (const key of Object.keys(statsMap)) {
      const s = statsMap[key];
      s.totalDoubleQuote = calcQuote(s.totalDoubleHits, s.totalDoubleDarts);
    }

    return statsMap;
  } catch (err) {
    console.error('Fehler in getAllPlayersTrainingDoublesStats:', err);
    return {};
  }
}

export async function getPlayerTrainingDoublesStats(playerName: string): Promise<PlayerTrainingDoublesStats | null> {
  const all = await getAllPlayersTrainingDoublesStats();
  const key = playerName.trim().toLowerCase();
  return all[key] || null;
}
