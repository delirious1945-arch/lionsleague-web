import { sql } from './db';

export interface ImportSpieltagPayload {
  season: string;
  spieltagInfo?: {
    slug?: string;
    team?: string;
    opponent?: string;
    date?: string;
    matchday_nr?: number;
    is_home?: boolean;
  };
  matchesCsvText: string;
  legsCsvText?: string;
  visitsCsvText?: string;
  statisticsCsvText?: string;
  syncLeague?: boolean;
}

export interface ImportResult {
  success: boolean;
  importedMatches: number;
  importedLegs: number;
  importedVisits: number;
  importedLeagueSingles: number;
  importedLeagueDoubles: number;
  matchdayDate: string;
  opponent: string;
  team: string;
  message: string;
  error?: string;
}

export function parseCsv(text: string): Record<string, string>[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const sep = firstLine.includes(';') ? ';' : ',';

  const headers = firstLine
    .split(sep)
    .map((h) => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(sep);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const val =
        rawCols[j] !== undefined
          ? rawCols[j].trim().replace(/^["']|["']$/g, '')
          : '';
      row[headers[j]] = val;
    }
    rows.push(row);
  }
  return rows;
}

function parseIsoDate(rawDate?: string, fallbackSlug?: string): string {
  if (rawDate) {
    const dm = rawDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (dm) {
      let y = dm[3];
      if (y.length === 2) y = `20${y}`;
      const m = dm[2].padStart(2, '0');
      const d = dm[1].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return rawDate;
    }
  }

  if (fallbackSlug) {
    const dm = fallbackSlug.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (dm) {
      let y = dm[3];
      if (y.length === 2) y = `20${y}`;
      const m = dm[2].padStart(2, '0');
      const d = dm[1].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return new Date().toISOString().split('T')[0];
}

export async function processSpieltagImport(
  payload: ImportSpieltagPayload
): Promise<ImportResult> {
  const {
    season,
    spieltagInfo,
    matchesCsvText,
    legsCsvText = '',
    visitsCsvText = '',
    statisticsCsvText = '',
    syncLeague = true,
  } = payload;

  const matchesRows = parseCsv(matchesCsvText);
  if (matchesRows.length === 0) {
    return {
      success: false,
      importedMatches: 0,
      importedLegs: 0,
      importedVisits: 0,
      importedLeagueSingles: 0,
      importedLeagueDoubles: 0,
      matchdayDate: '',
      opponent: '',
      team: '',
      message: 'Keine Matches in matches.csv gefunden.',
      error: 'matches.csv ist leer oder hat ein ungültiges Format.',
    };
  }

  const legsRows = parseCsv(legsCsvText);
  const visitsRows = parseCsv(visitsCsvText);
  const statsRows = parseCsv(statisticsCsvText);

  // 1. Spieltags-Metadaten bestimmen
  const slug = spieltagInfo?.slug || '';
  let matchdayDate = parseIsoDate(spieltagInfo?.date, slug);

  if (!spieltagInfo?.date && matchesRows[0]?.start_datetime) {
    matchdayDate = parseIsoDate(matchesRows[0].start_datetime, slug);
  }

  let team = spieltagInfo?.team || '';
  if (!team) {
    if (slug.includes('Lions-B') || slug.includes('Lions_B') || slug.includes('Lions B')) {
      team = 'B-Team';
    } else {
      team = 'A-Team';
    }
  }

  let opponent = spieltagInfo?.opponent || '';
  if (!opponent && slug) {
    const vsMatch = slug.match(/vs[_-](.+)$/i);
    if (vsMatch) {
      opponent = vsMatch[1].replace(/[-_]/g, ' ').trim();
    }
  }

  // 2. Spieler-Mapping aus der Datenbank laden
  const playerRows = await sql`SELECT id, name, team FROM players`;
  const playerMap = new Map<
    string,
    { id: number; team: string; name: string }
  >();

  for (const p of playerRows) {
    const pName = String(p.name).trim();
    playerMap.set(pName.toLowerCase(), {
      id: Number(p.id),
      team: String(p.team),
      name: pName,
    });
    // Auch nur Vorname als Fallback
    const firstName = pName.split(' ')[0].toLowerCase();
    if (!playerMap.has(firstName)) {
      playerMap.set(firstName, {
        id: Number(p.id),
        team: String(p.team),
        name: pName,
      });
    }
  }

  // 3. Bestehende Matches an diesem Tag löschen (Deduplizierung)
  await sql`
    DELETE FROM analytics_visits
    WHERE leg_id IN (
      SELECT l.id FROM analytics_legs l
      JOIN analytics_matches m ON l.match_id = m.id
      WHERE m.match_date = ${matchdayDate} AND m.season = ${season}
    )
  `;
  await sql`
    DELETE FROM analytics_legs
    WHERE match_id IN (
      SELECT id FROM analytics_matches
      WHERE match_date = ${matchdayDate} AND season = ${season}
    )
  `;
  await sql`
    DELETE FROM analytics_matches
    WHERE match_date = ${matchdayDate} AND season = ${season}
  `;

  if (syncLeague) {
    await sql`
      DELETE FROM matches
      WHERE match_date = ${matchdayDate} AND season = ${season}
    `;
    await sql`
      DELETE FROM doubles_matches
      WHERE match_date = ${matchdayDate} AND season = ${season}
    `;
  }

  // 4. Statistiken Map aufbauen (Key: match_id + player_name_lower)
  const statsMap = new Map<string, Record<string, string>>();
  for (const s of statsRows) {
    const mid = (s.match_id || '').toLowerCase();
    const pName = (s.player || '').toLowerCase();
    statsMap.set(`${mid}_${pName}`, s);
  }

  // 5. Matches importieren
  let countMatches = 0;
  let countLegs = 0;
  let countVisits = 0;
  let countLeagueSingles = 0;
  let countLeagueDoubles = 0;

  for (let mIdx = 0; mIdx < matchesRows.length; mIdx++) {
    const mRow = matchesRows[mIdx];
    const matchIdCsv = mRow.match_id || `M_${String(mIdx + 1).padStart(3, '0')}`;
    const homePlayer = mRow.home_player || '';
    const awayPlayer = mRow.away_player || '';
    const resHome = parseInt(mRow.result_home || '0', 10) || 0;
    const resAway = parseInt(mRow.result_away || '0', 10) || 0;
    const matchNr = parseInt(mRow.match_number || String(mIdx + 1), 10) || (mIdx + 1);
    const boardNr = parseInt(mRow.board || '1', 10) || 1;
    const durMin = parseInt(mRow.duration_minutes || '0', 10) || 0;
    const startTime = mRow.start_datetime || '';
    const endTime = mRow.end_datetime || '';

    const isDouble =
      homePlayer.includes('&') ||
      homePlayer.includes('/') ||
      homePlayer.includes('+') ||
      awayPlayer.includes('&') ||
      awayPlayer.includes('/') ||
      [5, 6, 11, 12].includes(matchNr);

    // Spieler-IDs auflösen
    const pA = playerMap.get(homePlayer.toLowerCase());
    const pB = playerMap.get(awayPlayer.toLowerCase());

    const pAId = pA?.id || 0;
    const pBId = pB?.id || 0;

    // Doppel-Partner auflösen
    let dA1Id = 0,
      dA2Id = 0,
      dB1Id = 0,
      dB2Id = 0;

    if (isDouble) {
      const partsA = homePlayer.split(/[/&+]/).map((s) => s.trim());
      if (partsA.length >= 2) {
        dA1Id = playerMap.get(partsA[0].toLowerCase())?.id || 0;
        dA2Id = playerMap.get(partsA[1].toLowerCase())?.id || 0;
      }
      const partsB = awayPlayer.split(/[/&+]/).map((s) => s.trim());
      if (partsB.length >= 2) {
        dB1Id = playerMap.get(partsB[0].toLowerCase())?.id || 0;
        dB2Id = playerMap.get(partsB[1].toLowerCase())?.id || 0;
      }
    }

    // Legs für dieses Match filtern
    const matchLegs = legsRows.filter(
      (l) => (l.match_id || '').toLowerCase() === matchIdCsv.toLowerCase()
    );

    const winnerId =
      resHome > resAway
        ? pAId > 0
          ? pAId
          : dA1Id
        : pBId > 0
        ? pBId
        : dB1Id;

    const eventName = `Lions League (${team})`;

    // Insert analytics_match
    const insertedMatch = await sql`
      INSERT INTO analytics_matches (
        player_a_id, player_b_id, player_a_name, player_b_name, match_date,
        event_name, round_name, best_of_legs, location, winner_id, season,
        duration_min, start_time, end_time, board_nr, match_nr, round_nr
      ) VALUES (
        ${pAId}, ${pBId}, ${homePlayer}, ${awayPlayer}, ${matchdayDate},
        ${eventName}, 'Liga-Spiel', ${Math.max(matchLegs.length, resHome + resAway, 3)},
        'Heim', ${winnerId || null}, ${season},
        ${durMin}, ${startTime}, ${endTime}, ${boardNr}, ${matchNr}, 1
      )
      RETURNING id
    `;
    const analyticsMatchId = Number(insertedMatch[0].id);
    countMatches++;

    // Legs & Visits für dieses Match speichern
    const processedLegs: {
      legNum: number;
      winnerPid: number;
      dartsA: number;
      dartsB: number;
      coA: number;
      coB: number;
      visitsA: number[];
      visitsB: number[];
    }[] = [];

    const legCount = Math.max(matchLegs.length, resHome + resAway);
    for (let lIdx = 1; lIdx <= (legCount || 3); lIdx++) {
      const legMeta = matchLegs.find(
        (l) => parseInt(l.leg_number || '0', 10) === lIdx
      );

      const starterStr = (legMeta?.starter_player || '').toLowerCase();
      const winnerStr = (legMeta?.winner_player || '').toLowerCase();

      const starterPid =
        starterStr === homePlayer.toLowerCase() || !starterStr ? pAId : pBId;
      const winnerPid =
        winnerStr === homePlayer.toLowerCase()
          ? pAId
          : winnerStr === awayPlayer.toLowerCase()
          ? pBId
          : resHome > resAway
          ? pAId
          : pBId;

      const dartsWin = parseInt(legMeta?.darts_winner || '0', 10) || 0;
      const dartsLos = parseInt(legMeta?.darts_loser || '0', 10) || 0;
      const coWin = parseInt(legMeta?.checkout_winner || '0', 10) || 0;
      const isBrk = legMeta?.is_break === 'True' || legMeta?.is_break === 'true';

      const dartsA = winnerPid === pAId ? dartsWin : dartsLos;
      const dartsB = winnerPid === pAId ? dartsLos : dartsWin;
      const coA = winnerPid === pAId ? coWin : 0;
      const coB = winnerPid === pBId ? coWin : 0;

      // Leg einfügen
      const insertedLeg = await sql`
        INSERT INTO analytics_legs (
          match_id, leg_num, starter_player_id, winner_player_id,
          score_before_a, score_before_b, darts_thrown_a, darts_thrown_b,
          checkout_a, checkout_b, is_break
        ) VALUES (
          ${analyticsMatchId}, ${lIdx}, ${starterPid || null}, ${winnerPid || null},
          501, 501, ${dartsA}, ${dartsB}, ${coA}, ${coB}, ${isBrk}
        )
        RETURNING id
      `;
      const legId = Number(insertedLeg[0].id);
      countLegs++;

      // Visits filtern
      const legVisits = visitsRows.filter(
        (v) =>
          (v.match_id || '').toLowerCase() === matchIdCsv.toLowerCase() &&
          parseInt(v.leg_number || '0', 10) === lIdx
      );

      const visitsA: number[] = [];
      const visitsB: number[] = [];

      for (let vIdx = 0; vIdx < legVisits.length; vIdx++) {
        const v = legVisits[vIdx];
        const vPlayer = (v.player || '').toLowerCase();
        const score = parseInt(v.score || '0', 10) || 0;
        const restScore = parseInt(v.remaining_score || '0', 10) || 0;
        const oppRest = parseInt(v.opponent_remaining_score || '501', 10) || 501;
        const vOrder = parseInt(v.visit_number || String(vIdx + 1), 10) || (vIdx + 1);

        const isPlayerA =
          vPlayer === homePlayer.toLowerCase() ||
          vPlayer.includes(homePlayer.split(' ')[0].toLowerCase());

        const vPid = isPlayerA ? pAId : pBId;
        if (isPlayerA) visitsA.push(score);
        else visitsB.push(score);

        await sql`
          INSERT INTO analytics_visits (
            leg_id, player_id, visit_order, score, rest_score, opponent_rest_at_visit
          ) VALUES (
            ${legId}, ${vPid || null}, ${vOrder}, ${score}, ${restScore}, ${oppRest}
          )
        `;
        countVisits++;
      }

      processedLegs.push({
        legNum: lIdx,
        winnerPid,
        dartsA,
        dartsB,
        coA,
        coB,
        visitsA,
        visitsB,
      });
    }

    // 6. In die offizielle Lions-League synchronisieren
    if (syncLeague) {
      if (!isDouble) {
        // EINZELMATCH: Lions-Spieler identifizieren
        const lionsParticipants = [
          { pid: pAId, name: homePlayer, oppName: awayPlayer, isHome: true },
          { pid: pBId, name: awayPlayer, oppName: homePlayer, isHome: false },
        ].filter((p) => p.pid > 0);

        for (const lp of lionsParticipants) {
          const isA = lp.isHome;
          const myLegsWon = isA ? resHome : resAway;
          const myLegsLost = isA ? resAway : resHome;

          const myVisits = processedLegs.flatMap((l) => (isA ? l.visitsA : l.visitsB));
          const totalDarts = processedLegs.reduce(
            (sum, l) => sum + (isA ? l.dartsA : l.dartsB),
            0
          );

          // Aus stats.csv abgleichen falls vorhanden
          const st = statsMap.get(`${matchIdCsv.toLowerCase()}_${lp.name.toLowerCase()}`);

          const avgTotal =
            st?.overall_average
              ? parseFloat(st.overall_average)
              : totalDarts > 0 && myVisits.length > 0
              ? Math.round(((myVisits.reduce((a, b) => a + b, 0) / totalDarts) * 3) * 10) / 10
              : 45.0;

          const avg9 = st?.first_9_avg
            ? parseFloat(st.first_9_avg)
            : avgTotal;

          const avg18 = st?.first_18_avg
            ? parseFloat(st.first_18_avg)
            : avgTotal;

          const s80 = st?.scoring_80_plus
            ? parseInt(st.scoring_80_plus, 10)
            : myVisits.filter((s) => s >= 80 && s < 100).length;

          const s100 = st?.scoring_100_plus
            ? parseInt(st.scoring_100_plus, 10)
            : myVisits.filter((s) => s >= 100 && s < 140).length;

          const s140 = st?.scoring_140_plus
            ? parseInt(st.scoring_140_plus, 10)
            : myVisits.filter((s) => s >= 140 && s < 180).length;

          const s180 = st?.scoring_180
            ? parseInt(st.scoring_180, 10)
            : myVisits.filter((s) => s === 180).length;

          const hf = Math.max(
            ...processedLegs.map((l) => (isA ? l.coA : l.coB)),
            0
          );
          const shortLegs = processedLegs.filter(
            (l) => l.winnerPid === lp.pid && (isA ? l.dartsA : l.dartsB) <= 18 && (isA ? l.dartsA : l.dartsB) > 0
          ).length;

          // Specials
          const specialsCount =
            s180 +
            (hf >= 101 ? 1 : 0) +
            shortLegs +
            myVisits.filter((s) => s >= 141 && s < 180).length;

          const pData = playerRows.find((p) => Number(p.id) === lp.pid);
          const matchTeam = pData ? String(pData.team) : team;

          await sql`
            INSERT INTO matches (
              player_id, match_date, opponent, legs_won, legs_lost,
              avg_total, avg_9, avg_18, scores_80, scores_100, scores_140,
              scores_180, high_finishes, short_legs, specials_count,
              season, team
            ) VALUES (
              ${lp.pid}, ${matchdayDate}, ${lp.oppName || opponent}, ${myLegsWon}, ${myLegsLost},
              ${avgTotal}, ${avg9}, ${avg18}, ${s80}, ${s100}, ${s140},
              ${s180}, ${hf >= 101 ? hf : 0}, ${shortLegs}, ${specialsCount},
              ${season}, ${matchTeam}
            )
          `;
          countLeagueSingles++;
        }
      } else {
        // DOPPELMATCH: Lions-Doppel identifizieren
        const lionsDoubles: { p1: number; p2: number; oppName: string; isHome: boolean }[] = [];
        if (dA1Id > 0 && dA2Id > 0) {
          lionsDoubles.push({ p1: dA1Id, p2: dA2Id, oppName: awayPlayer, isHome: true });
        }
        if (dB1Id > 0 && dB2Id > 0) {
          lionsDoubles.push({ p1: dB1Id, p2: dB2Id, oppName: homePlayer, isHome: false });
        }

        for (const ld of lionsDoubles) {
          const isA = ld.isHome;
          const myLegsWon = isA ? resHome : resAway;
          const myLegsLost = isA ? resAway : resHome;

          const myVisits = processedLegs.flatMap((l) => (isA ? l.visitsA : l.visitsB));
          const totalDarts = processedLegs.reduce(
            (sum, l) => sum + (isA ? l.dartsA : l.dartsB),
            0
          );

          const avgTotal =
            totalDarts > 0 && myVisits.length > 0
              ? Math.round(((myVisits.reduce((a, b) => a + b, 0) / totalDarts) * 3) * 10) / 10
              : 42.0;

          const s80 = myVisits.filter((s) => s >= 80 && s < 100).length;
          const s100 = myVisits.filter((s) => s >= 100 && s < 140).length;
          const s140 = myVisits.filter((s) => s >= 140 && s < 180).length;
          const s180 = myVisits.filter((s) => s === 180).length;

          const hf = Math.max(
            ...processedLegs.map((l) => (isA ? l.coA : l.coB)),
            0
          );
          const shortLegs = processedLegs.filter(
            (l) => (isA ? l.dartsA : l.dartsB) <= 18 && (isA ? l.dartsA : l.dartsB) > 0
          ).length;

          const specialsCount =
            s180 +
            (hf >= 101 ? 1 : 0) +
            shortLegs;

          const pData = playerRows.find((p) => Number(p.id) === ld.p1);
          const matchTeam = pData ? String(pData.team) : team;

          await sql`
            INSERT INTO doubles_matches (
              player1_id, player2_id, match_date, opponent,
              legs_won, legs_lost, avg_total, avg_9, avg_18,
              scores_80, scores_100, scores_140, scores_180,
              high_finishes, short_legs, specials_count,
              season, team
            ) VALUES (
              ${ld.p1}, ${ld.p2}, ${matchdayDate}, ${ld.oppName || opponent},
              ${myLegsWon}, ${myLegsLost}, ${avgTotal}, ${avgTotal}, ${avgTotal},
              ${s80}, ${s100}, ${s140}, ${s180},
              ${hf >= 101 ? hf : 0}, ${shortLegs}, ${specialsCount},
              ${season}, ${matchTeam}
            )
          `;
          countLeagueDoubles++;
        }
      }
    }
  }

  return {
    success: true,
    importedMatches: countMatches,
    importedLegs: countLegs,
    importedVisits: countVisits,
    importedLeagueSingles: countLeagueSingles,
    importedLeagueDoubles: countLeagueDoubles,
    matchdayDate,
    opponent,
    team,
    message: `🎉 Spieltag erfolgreich importiert! ${countMatches} Matches, ${countLegs} Legs und ${countVisits} Aufnahmen wurden in Supabase gespeichert (${countLeagueSingles} Einzel & ${countLeagueDoubles} Doppel in die Lions League Rangliste synchronisiert).`,
  };
}
