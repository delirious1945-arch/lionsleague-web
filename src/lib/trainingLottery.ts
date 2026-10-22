import { sql } from '@/lib/db';

export interface LotteryWinner {
  id: number;
  month_key: string;
  month_label: string;
  draw_date: string;
  player_id: number | null;
  player_name: string;
  completed_games: number;
  prize: string;
  total_eligible_players: number;
  eligible_players: { player_name: string; completed_games: number }[];
  acknowledged_by_winner: boolean;
  claimed_at: string | null;
  created_at: string;
}

export interface PlayerMonthProgress {
  playerName: string;
  monthKey: string;
  monthLabel: string;
  completedGames: number;
  targetGames: number;
  remainingGames: number;
  isQualified: boolean;
  isBlockedByPastWin: boolean;
  daysRemainingInMonth: number;
  eligiblePlayersCount: number;
}

const GERMAN_MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

/**
 * Gibt den Monats-Key (z.B. "2026-10") und das deutsche Label ("Oktober 2026") zurück.
 */
export function formatMonthKey(date: Date = new Date()): { monthKey: string; monthLabel: string } {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-indexed
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthLabel = `${GERMAN_MONTHS[m]} ${y}`;
  return { monthKey, monthLabel };
}

/**
 * Berechnet die 4 vorangegangenen Monate eines gegebenen Monats (für die Sperrfrist).
 */
export function getPrevious4Months(monthKey: string): string[] {
  const [yStr, mStr] = monthKey.split('-');
  let y = parseInt(yStr, 10);
  let m = parseInt(mStr, 10); // 1-12

  const pastMonths: string[] = [];
  for (let i = 0; i < 4; i++) {
    m -= 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    pastMonths.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return pastMonths;
}

/**
 * Gibt den Vormonat zurück (der am 1. des Folgemonats ausgelost wird).
 */
export function getPreviousMonth(date: Date = new Date()): { monthKey: string; monthLabel: string } {
  let y = date.getFullYear();
  let m = date.getMonth(); // 0-11, Vormonat ist m - 1
  if (m === 0) {
    m = 11;
    y -= 1;
  } else {
    m -= 1;
  }
  const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
  const monthLabel = `${GERMAN_MONTHS[m]} ${y}`;
  return { monthKey, monthLabel };
}

/**
 * Zählt die vollständig abgeschlossenen Trainingsspiele aller Spieler in einem Zielmonat.
 */
export async function getCompletedGamesByPlayerForMonth(monthKey: string): Promise<Map<string, { playerId: number | null; count: number }>> {
  const [yStr, mStr] = monthKey.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10); // 1-12

  // Start und Ende des Monats in ISO-Format
  const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const playerStats = new Map<string, { playerId: number | null; count: number }>();

  // 1. Doppelquote / Checkout Battle
  // Nur nicht abgebrochene Spiele mit mindestens 30 Darts
  try {
    const doublesRows = await sql`
      SELECT player_name, player_id, count(*)::int as cnt
      FROM training_doubles
      WHERE (is_aborted IS NULL OR is_aborted = 0)
        AND total_darts >= 30
        AND COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) = ${monthKey}
      GROUP BY player_name, player_id
    `;

    for (const r of doublesRows) {
      const name = String(r.player_name).trim();
      const current = playerStats.get(name) || { playerId: r.player_id ?? null, count: 0 };
      current.count += Number(r.cnt);
      if (r.player_id && !current.playerId) current.playerId = r.player_id;
      playerStats.set(name, current);
    }
  } catch (err) {
    console.error('Fehler beim Abfragen von training_doubles für Verlosung:', err);
  }

  // 2. PDC Challenge
  // Nur nicht abgebrochene Spiele mit gewertetem total_score
  try {
    const pdcRows = await sql`
      SELECT player_name, player_id, count(*)::int as cnt
      FROM training_pdc_challenge
      WHERE (is_aborted IS NULL OR is_aborted = 0)
        AND total_score IS NOT NULL
        AND COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) = ${monthKey}
      GROUP BY player_name, player_id
    `;

    for (const r of pdcRows) {
      const name = String(r.player_name).trim();
      const current = playerStats.get(name) || { playerId: r.player_id ?? null, count: 0 };
      current.count += Number(r.cnt);
      if (r.player_id && !current.playerId) current.playerId = r.player_id;
      playerStats.set(name, current);
    }
  } catch (err) {
    console.error('Fehler beim Abfragen von training_pdc_challenge für Verlosung:', err);
  }

  // 3. Fußball Darts Battle
  try {
    const fussballRows = await sql`
      SELECT player_name, player_id, count(*)::int as cnt
      FROM training_fussball
      WHERE (is_aborted IS NULL OR is_aborted = 0)
        AND darts_thrown >= 6
        AND COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) = ${monthKey}
      GROUP BY player_name, player_id
    `;

    for (const r of fussballRows) {
      const name = String(r.player_name).trim();
      const current = playerStats.get(name) || { playerId: r.player_id ?? null, count: 0 };
      current.count += Number(r.cnt);
      if (r.player_id && !current.playerId) current.playerId = r.player_id;
      playerStats.set(name, current);
    }
  } catch (err) {
    console.error('Fehler beim Abfragen von training_fussball für Verlosung:', err);
  }

  return playerStats;
}

/**
 * Ermittelt alle Spieler, die in den 4 Monaten vor monthKey bereits gewonnen haben (Sperrfrist).
 */
export async function getBlockedPlayersForMonth(monthKey: string): Promise<Set<string>> {
  const pastMonths = getPrevious4Months(monthKey);
  const blocked = new Set<string>();

  try {
    if (pastMonths.length > 0) {
      const rows = await sql`
        SELECT player_name 
        FROM training_lottery_winners
        WHERE month_key = ANY(${pastMonths})
      `;
      for (const r of rows) {
        if (r.player_name) {
          blocked.add(String(r.player_name).trim());
        }
      }
    }
  } catch (err) {
    console.error('Fehler beim Ermitteln gesperrter Spieler:', err);
  }

  return blocked;
}

/**
 * Führt die Monatsauslosung für einen bestimmten Monat durch.
 * - Bedingung: mindestens 20 vollständig abgeschlossene Spiele
 * - 4 Monate Sperre nach Gewinn
 * - Zufallsauswahl
 * - Speichert in training_lottery_winners
 */
export async function executeMonthlyLottery(targetMonthKey: string, targetMonthLabel?: string) {
  const [yStr, mStr] = targetMonthKey.split('-');
  const m = parseInt(mStr, 10);
  const y = parseInt(yStr, 10);
  const label = targetMonthLabel || `${GERMAN_MONTHS[m - 1]} ${y}`;

  // Prüfen, ob für diesen Monat bereits ausgelost wurde
  const existing = await sql`
    SELECT id, player_name, month_key FROM training_lottery_winners
    WHERE month_key = ${targetMonthKey}
    LIMIT 1
  `;
  if (existing.length > 0) {
    return {
      success: true,
      alreadyDrawn: true,
      winner: existing[0],
      message: `Monat ${label} wurde bereits ausgelost (${existing[0].player_name}).`
    };
  }

  // 1. Alle Spieler mit Spielanzahl ermitteln
  const statsMap = await getCompletedGamesByPlayerForMonth(targetMonthKey);

  // 2. Gesperrte Spieler ermitteln (letzte 4 Monate)
  const blocked = await getBlockedPlayersForMonth(targetMonthKey);

  // 3. Qualifizierte Spieler filtern (>= 20 Spiele & nicht gesperrt)
  const eligible: { playerName: string; playerId: number | null; completedGames: number }[] = [];
  const allWith20: { playerName: string; completedGames: number; blocked: boolean }[] = [];

  for (const [name, data] of statsMap.entries()) {
    if (data.count >= 20) {
      const isBlocked = blocked.has(name);
      allWith20.push({ playerName: name, completedGames: data.count, blocked: isBlocked });
      if (!isBlocked) {
        eligible.push({ playerName: name, playerId: data.playerId, completedGames: data.count });
      }
    }
  }

  if (eligible.length === 0) {
    // Niemand qualifiziert
    console.log(`[Trainings-Verlosung] Keine qualifizierten Spieler für ${label} gefunden.`);
    return {
      success: false,
      reason: 'NO_ELIGIBLE_PLAYERS',
      message: `Für ${label} hat kein ungesperrter Spieler 20 abgeschlossene Spiele erreicht.`
    };
  }

  // 4. Zufallsauslosung (Zufallsprinzip, Leistung spielt keine Rolle)
  const randomIndex = Math.floor(Math.random() * eligible.length);
  const winner = eligible[randomIndex];

  // 5. In Datenbank speichern
  const inserted = await sql`
    INSERT INTO training_lottery_winners (
      month_key,
      month_label,
      draw_date,
      player_id,
      player_name,
      completed_games,
      prize,
      total_eligible_players,
      eligible_players,
      acknowledged_by_winner
    ) VALUES (
      ${targetMonthKey},
      ${label},
      NOW(),
      ${winner.playerId},
      ${winner.playerName},
      ${winner.completedGames},
      '5 Freigetränke',
      ${eligible.length},
      ${JSON.stringify(eligible.map(e => ({ player_name: e.playerName, completed_games: e.completedGames })))},
      FALSE
    )
    RETURNING *
  `;

  return {
    success: true,
    alreadyDrawn: false,
    winner: inserted[0],
    eligibleCount: eligible.length,
    message: `Auslosung für ${label} erfolgreich: ${winner.playerName} hat 5 Freigetränke gewonnen!`
  };
}

/**
 * Automatische Selbstprüfung:
 * Wird beim Aufruf der Startseite getriggert.
 * Prüft, ob der Vormonat bereits ausgelost wurde, und führt die Auslosung falls nötig sofort durch.
 */
export async function checkAndAutoDrawPreviousMonth(): Promise<LotteryWinner | null> {
  try {
    const now = new Date();
    // Vormonat ermitteln
    const { monthKey, monthLabel } = getPreviousMonth(now);

    // Prüfen, ob bereits in der DB
    const existing = await sql`
      SELECT * FROM training_lottery_winners
      WHERE month_key = ${monthKey}
      LIMIT 1
    `;

    if (existing.length > 0) {
      return existing[0] as LotteryWinner;
    }

    // Wenn der heutige Tag mindestens der 1. des Monats ist, führen wir die Auslosung für den Vormonat durch
    const result = await executeMonthlyLottery(monthKey, monthLabel);
    if (result.success && result.winner) {
      return result.winner as LotteryWinner;
    }
  } catch (err) {
    console.error('Fehler bei automatischer Monatsverlosung:', err);
  }
  return null;
}

/**
 * Holt den Gewinner, der aktuell auf der Startseite angezeigt werden soll (3 Tage lang).
 * Die Auslosung erfolgt am 1. und bleibt 3 Tage sichtbar (z.B. Tag 1, 2, 3 des Monats ODER innerhalb 72h).
 */
export async function getActiveBannerWinner(): Promise<LotteryWinner | null> {
  try {
    // 1. Zuerst Auto-Draw prüfen
    await checkAndAutoDrawPreviousMonth();

    const now = new Date();
    const dayOfMonth = now.getDate(); // 1..31

    // Neuesten Gewinner abrufen
    const rows = await sql`
      SELECT * FROM training_lottery_winners
      ORDER BY draw_date DESC, id DESC
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const latest = rows[0] as LotteryWinner;
    const drawDate = new Date(latest.draw_date);
    const diffHours = (now.getTime() - drawDate.getTime()) / (1000 * 60 * 60);

    // Kriterium: Tag 1, 2 oder 3 des Monats ODER Ziehung weniger als 72 Stunden her
    if (dayOfMonth <= 3 || diffHours <= 72) {
      return latest;
    }
  } catch (err) {
    console.error('Fehler beim Abrufen des aktiven Verlosungs-Banners:', err);
  }
  return null;
}

/**
 * Prüft, ob der angemeldete Spieler einen ungelesenen oder aktiven Monatsgewinn hat (für das Glückwunsch-Modal).
 */
export async function getUnacknowledgedWinForPlayer(playerName: string): Promise<LotteryWinner | null> {
  if (!playerName) return null;

  try {
    const cleanName = playerName.trim();
    const rows = await sql`
      SELECT * FROM training_lottery_winners
      WHERE LOWER(player_name) = LOWER(${cleanName})
        AND acknowledged_by_winner = FALSE
      ORDER BY draw_date DESC, id DESC
      LIMIT 1
    `;

    if (rows.length > 0) {
      return rows[0] as LotteryWinner;
    }
  } catch (err) {
    console.error('Fehler beim Abrufen des Gewinns für Spieler:', err);
  }
  return null;
}

/**
 * Bestätigt den Erhalt / die Ansicht des Gewinns durch den Spieler.
 */
export async function acknowledgeLotteryWin(lotteryId: number) {
  try {
    await sql`
      UPDATE training_lottery_winners
      SET acknowledged_by_winner = TRUE
      WHERE id = ${lotteryId}
    `;
    return { success: true };
  } catch (err) {
    console.error('Fehler bei acknowledgeLotteryWin:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Ermittelt den aktuellen Trainingsfortschritt eines Spielers für den laufenden Monat.
 */
export async function getCurrentMonthProgressForPlayer(playerName?: string): Promise<PlayerMonthProgress> {
  const now = new Date();
  const { monthKey, monthLabel } = formatMonthKey(now);

  // Verbleibende Tage im Monat berechnen
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(0, lastDay - now.getDate());

  const statsMap = await getCompletedGamesByPlayerForMonth(monthKey);
  const blocked = await getBlockedPlayersForMonth(monthKey);

  let completedGames = 0;
  let isBlockedByPastWin = false;

  if (playerName) {
    const cleanName = playerName.trim();
    const data = statsMap.get(cleanName);
    if (data) {
      completedGames = data.count;
    }
    isBlockedByPastWin = blocked.has(cleanName);
  }

  // Zählen wie viele Spieler aktuell >= 20 haben und nicht gesperrt sind
  let eligibleCount = 0;
  for (const [name, data] of statsMap.entries()) {
    if (data.count >= 20 && !blocked.has(name)) {
      eligibleCount++;
    }
  }

  const targetGames = 20;
  const remainingGames = Math.max(0, targetGames - completedGames);
  const isQualified = completedGames >= targetGames && !isBlockedByPastWin;

  return {
    playerName: playerName || '',
    monthKey,
    monthLabel,
    completedGames,
    targetGames,
    remainingGames,
    isQualified,
    isBlockedByPastWin,
    daysRemainingInMonth,
    eligiblePlayersCount: eligibleCount,
  };
}

export interface PlayerMonthlyTrainingStat {
  playerName: string;
  playerId: number | null;
  team: string;
  doublesSolo: number;
  doubles1vs1: number;
  totalDoubles: number;
  pdcSolo: number;
  pdc1vs1: number;
  totalPdc: number;
  totalCompletedGames: number;
  isQualified: boolean;
  isBlockedByPastWin: boolean;
  isMonthWinner: boolean;
  gamesList: {
    id: number;
    gameType: 'doubles' | 'pdc';
    gameMode: string;
    opponentName: string | null;
    date: string;
    summary: string;
    isWinner: number;
  }[];
}

export interface AdminTrainingOverviewData {
  selectedMonthKey: string;
  selectedMonthLabel: string;
  availableMonths: { monthKey: string; monthLabel: string }[];
  totalGamesInMonth: number;
  totalActivePlayers: number;
  qualifiedPlayersCount: number;
  monthWinner: LotteryWinner | null;
  players: PlayerMonthlyTrainingStat[];
}

/**
 * Liefert für Administratoren die vollständige Monatsübersicht aller Spieler
 * mit Aufschlüsselung nach Solo vs. 1-gegen-1, Checkout Battle, PDC Challenge und Verlosungsstatus.
 */
export async function getAdminTrainingOverviewData(customMonthKey?: string): Promise<AdminTrainingOverviewData> {
  const current = formatMonthKey();
  const selectedMonthKey = customMonthKey || current.monthKey;

  // 1. Verfügbare Monate sammeln
  const monthRows = await sql`
    SELECT DISTINCT COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) AS m
    FROM training_doubles
    WHERE is_aborted IS NULL OR is_aborted = 0
    UNION
    SELECT DISTINCT COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) AS m
    FROM training_pdc_challenge
    WHERE is_aborted IS NULL OR is_aborted = 0
    ORDER BY m DESC;
  `;

  const monthSet = new Set<string>();
  monthSet.add(current.monthKey);
  for (const r of monthRows) {
    if (r.m && typeof r.m === 'string' && r.m.length === 7) {
      monthSet.add(r.m);
    }
  }

  const availableMonths = Array.from(monthSet)
    .sort((a, b) => b.localeCompare(a))
    .map((mKey) => {
      const [yStr, mStr] = mKey.split('-');
      const mIdx = parseInt(mStr, 10) - 1;
      return {
        monthKey: mKey,
        monthLabel: `${GERMAN_MONTHS[mIdx] || mKey} ${yStr}`,
      };
    });

  const selectedMonthLabel =
    availableMonths.find((m) => m.monthKey === selectedMonthKey)?.monthLabel || selectedMonthKey;

  // 2. Alle Liga-Spieler abrufen
  const dbPlayers = await sql`
    SELECT id, name, team 
    FROM players 
    WHERE name NOT LIKE 'Board %'
    ORDER BY name ASC;
  `;

  // 3. Doubles & PDC Sessions für den Monat abrufen
  const doublesSessions = await sql`
    SELECT 
      id, session_id, player_name, opponent_name, game_mode, 
      training_date, created_at, total_hits, total_darts, total_quote, best_double, is_winner
    FROM training_doubles
    WHERE (is_aborted IS NULL OR is_aborted = 0)
      AND total_darts >= 30
      AND COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) = ${selectedMonthKey}
    ORDER BY COALESCE(training_date, created_at::text) DESC;
  `;

  const pdcSessions = await sql`
    SELECT 
      id, session_id, player_name, opponent_name, game_mode, 
      training_date, created_at, total_score, badge_color, is_winner
    FROM training_pdc_challenge
    WHERE (is_aborted IS NULL OR is_aborted = 0)
      AND total_score IS NOT NULL
      AND COALESCE(NULLIF(SUBSTRING(training_date, 1, 7), ''), TO_CHAR(created_at, 'YYYY-MM')) = ${selectedMonthKey}
    ORDER BY COALESCE(training_date, created_at::text) DESC;
  `;

  // 4. Sperrfrist & Gewinner des Monats ermitteln
  const blockedPlayers = await getBlockedPlayersForMonth(selectedMonthKey);
  const winnerRows = await sql`
    SELECT * FROM training_lottery_winners
    WHERE month_key = ${selectedMonthKey}
    LIMIT 1;
  `;
  const monthWinner = winnerRows.length > 0 ? (winnerRows[0] as LotteryWinner) : null;
  const winnerName = monthWinner ? monthWinner.player_name.trim() : null;

  // 5. Aggregation pro Spieler
  const statsMap = new Map<string, PlayerMonthlyTrainingStat>();

  // Grundbestand aller Spieler anlegen
  for (const p of dbPlayers) {
    const name = String(p.name).trim();
    statsMap.set(name, {
      playerName: name,
      playerId: p.id,
      team: p.team || 'Verein',
      doublesSolo: 0,
      doubles1vs1: 0,
      totalDoubles: 0,
      pdcSolo: 0,
      pdc1vs1: 0,
      totalPdc: 0,
      totalCompletedGames: 0,
      isQualified: false,
      isBlockedByPastWin: blockedPlayers.has(name),
      isMonthWinner: winnerName === name,
      gamesList: [],
    });
  }

  // Doubles zuweisen
  for (const s of doublesSessions) {
    const name = String(s.player_name).trim();
    let stat = statsMap.get(name);
    if (!stat) {
      stat = {
        playerName: name,
        playerId: null,
        team: 'Gast',
        doublesSolo: 0,
        doubles1vs1: 0,
        totalDoubles: 0,
        pdcSolo: 0,
        pdc1vs1: 0,
        totalPdc: 0,
        totalCompletedGames: 0,
        isQualified: false,
        isBlockedByPastWin: blockedPlayers.has(name),
        isMonthWinner: winnerName === name,
        gamesList: [],
      };
      statsMap.set(name, stat);
    }

    const isSolo = s.game_mode === 'solo';
    if (isSolo) {
      stat.doublesSolo += 1;
    } else {
      stat.doubles1vs1 += 1;
    }
    stat.totalDoubles += 1;
    stat.totalCompletedGames += 1;

    const qPct = s.total_quote ? (Number(s.total_quote) * 100).toFixed(1) + '%' : '-';
    stat.gamesList.push({
      id: s.id,
      gameType: 'doubles',
      gameMode: s.game_mode,
      opponentName: s.opponent_name || null,
      date: s.training_date || s.created_at,
      summary: `Doppelquote: ${qPct} (${s.total_hits || 0}/${s.total_darts || 150})`,
      isWinner: s.is_winner ?? 0,
    });
  }

  // PDC zuweisen
  for (const s of pdcSessions) {
    const name = String(s.player_name).trim();
    let stat = statsMap.get(name);
    if (!stat) {
      stat = {
        playerName: name,
        playerId: null,
        team: 'Gast',
        doublesSolo: 0,
        doubles1vs1: 0,
        totalDoubles: 0,
        pdcSolo: 0,
        pdc1vs1: 0,
        totalPdc: 0,
        totalCompletedGames: 0,
        isQualified: false,
        isBlockedByPastWin: blockedPlayers.has(name),
        isMonthWinner: winnerName === name,
        gamesList: [],
      };
      statsMap.set(name, stat);
    }

    const isSolo = s.game_mode === 'solo';
    if (isSolo) {
      stat.pdcSolo += 1;
    } else {
      stat.pdc1vs1 += 1;
    }
    stat.totalPdc += 1;
    stat.totalCompletedGames += 1;

    stat.gamesList.push({
      id: s.id,
      gameType: 'pdc',
      gameMode: s.game_mode,
      opponentName: s.opponent_name || null,
      date: s.training_date || s.created_at,
      summary: `PDC Score: ${s.total_score} Pkt (${s.badge_color || '-'}es Abzeichen)`,
      isWinner: s.is_winner ?? 0,
    });
  }

  // Qualifikation und Sortierung berechnen
  let totalGamesInMonth = 0;
  let totalActivePlayers = 0;
  let qualifiedPlayersCount = 0;

  const playerList = Array.from(statsMap.values()).map((p) => {
    p.isQualified = p.totalCompletedGames >= 20 && !p.isBlockedByPastWin;
    totalGamesInMonth += p.totalCompletedGames;
    if (p.totalCompletedGames > 0) totalActivePlayers += 1;
    if (p.isQualified) qualifiedPlayersCount += 1;
    return p;
  });

  // Sortierung: Wer die meisten Spiele hat, steht oben. Bei 0 Spielen alphabetisch dahinter.
  playerList.sort((a, b) => {
    if (b.totalCompletedGames !== a.totalCompletedGames) {
      return b.totalCompletedGames - a.totalCompletedGames;
    }
    return a.playerName.localeCompare(b.playerName);
  });

  return {
    selectedMonthKey,
    selectedMonthLabel,
    availableMonths,
    totalGamesInMonth,
    totalActivePlayers,
    qualifiedPlayersCount,
    monthWinner,
    players: playerList,
  };
}
