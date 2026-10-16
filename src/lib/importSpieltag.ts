import { sql } from './db';
import fs from 'fs';
import path from 'path';

export const DEFAULT_SPIELTAGE_DIR =
  'C:\\Users\\sebas\\Documents\\Lions Weyhausen\\02_Liga\\Dart_Match_Image_Analyzer\\output\\spieltage';

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
  created: number;
  updated: number;
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

export interface ScannedSpieltagItem {
  dir_path: string;
  match_file: string;
  slug: string;
  team_display: string;
  opp_display: string;
  sp_display: string;
  date_str: string;
  total_matches: number;
  new_count: number;
  existing_count: number;
  status: 'NEW' | 'PARTIAL' | 'EXISTS';
  status_badge: string;
  status_desc: string;
  mtime_str: string;
  is_new_candidate: boolean;
}

export interface BatchImportItemResult {
  slug: string;
  team?: string;
  opponent?: string;
  created?: number;
  updated?: number;
  error?: string;
  success: boolean;
}

export interface BatchImportSummary {
  imported_spieltage: number;
  total_created: number;
  total_updated: number;
  results: BatchImportItemResult[];
}

export function parseCsv(text: string): Record<string, string>[] {
  if (!text) return [];
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/).filter((line) => line.trim().length > 0);
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

function formatDisplayDate(rawDate?: string, fallbackSlug?: string): string {
  if (rawDate) {
    const dm = rawDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (dm) {
      let y = dm[3];
      if (y.length === 2) y = `20${y}`;
      const m = dm[2].padStart(2, '0');
      const d = dm[1].padStart(2, '0');
      return `${d}.${m}.${y}`;
    }
    const iso = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      return `${iso[3]}.${iso[2]}.${iso[1]}`;
    }
  }
  if (fallbackSlug) {
    const dm = fallbackSlug.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
    if (dm) {
      let y = dm[3];
      if (y.length === 2) y = `20${y}`;
      const m = dm[2].padStart(2, '0');
      const d = dm[1].padStart(2, '0');
      return `${d}.${m}.${y}`;
    }
  }
  return '';
}

function walkDirectories(dir: string): { dirPath: string; files: string[] }[] {
  const results: { dirPath: string; files: string[] }[] = [];
  if (!dir || !fs.existsSync(dir)) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const fileNames = entries.filter((e) => e.isFile()).map((e) => e.name);
    if (fileNames.length > 0) {
      results.push({ dirPath: dir, files: fileNames });
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        results.push(...walkDirectories(path.join(dir, entry.name)));
      }
    }
  } catch (err) {
    console.error('Error walking directory:', dir, err);
  }
  return results;
}

export async function scanDirectoryForSpieltage(
  rootDir: string = DEFAULT_SPIELTAGE_DIR,
  season: string = '2026/2027'
): Promise<ScannedSpieltagItem[]> {
  if (!rootDir || !fs.existsSync(rootDir)) {
    return [];
  }

  // Alle vorhandenen Analytics-Matches dieser Saison in einer einzigen Abfrage laden
  const existingRows = await sql`
    SELECT id, player_a_name, player_b_name, match_date, match_nr, event_name
    FROM analytics_matches
    WHERE season = ${season}
  `;

  const allDirs = walkDirectories(rootDir);
  const foundSpieltage: ScannedSpieltagItem[] = [];

  for (const { dirPath, files } of allDirs) {
    const matchFiles = files.filter((f) => f.toLowerCase().endsWith('matches.csv'));
    if (matchFiles.length === 0) continue;

    // Spezifischste Datei bevorzugen (längster Name = präfixiert)
    matchFiles.sort((a, b) => b.length - a.length);
    const matchFile = matchFiles[0];
    const fullMatchPath = path.join(dirPath, matchFile);

    const prefix = matchFile.slice(0, -11); // ohne "matches.csv"
    const infoFile =
      files.find((f) => f.toLowerCase().endsWith('spieltag_info.json')) ||
      'spieltag_info.json';
    const infoPath = path.join(dirPath, infoFile);

    let infoData: any = {};
    if (fs.existsSync(infoPath)) {
      try {
        const rawJson = fs.readFileSync(infoPath, 'utf-8');
        infoData = JSON.parse(rawJson);
      } catch (e) {}
    }

    let matchesRows: Record<string, string>[] = [];
    try {
      const csvText = fs.readFileSync(fullMatchPath, 'utf-8');
      matchesRows = parseCsv(csvText);
    } catch (e) {
      continue;
    }

    if (matchesRows.length === 0) continue;

    const totalMatches = matchesRows.length;
    const slug: string =
      infoData.slug || prefix.replace(/_+$/, '') || path.basename(dirPath);
    const team: string | undefined = infoData.team;
    const opp: string | undefined = infoData.opponent;
    let dtStr: string = formatDisplayDate(infoData.date, '');
    const spNr: number | undefined = infoData.matchday_nr;

    if (!dtStr) {
      for (const r of matchesRows) {
        if (r.start_datetime) {
          const formatted = formatDisplayDate(r.start_datetime, '');
          if (formatted) {
            dtStr = formatted;
            break;
          }
        }
      }
    }
    if (!dtStr && slug) {
      dtStr = formatDisplayDate('', slug);
    }

    const spieltagDateIso = parseIsoDate(dtStr || infoData.date, slug);

    let newCount = 0;
    let existingCount = 0;

    const matchdayTeam = team
      ? team.includes('A')
        ? 'A-Team'
        : team.includes('B')
        ? 'B-Team'
        : team
      : slug.includes('Lions-A') || slug.includes('Lions A')
      ? 'A-Team'
      : slug.includes('Lions-B') || slug.includes('Lions B')
      ? 'B-Team'
      : null;

    const eventNameStr = matchdayTeam
      ? `Lions League (${matchdayTeam})`
      : 'Lions League';

    for (const mRow of matchesRows) {
      const midCsv = (mRow.match_id || '').trim();
      const homeP = (mRow.home_player || '').trim();
      const awayP = (mRow.away_player || '').trim();
      let mNr = parseInt(mRow.match_number || '0', 10) || 0;
      if (mNr === 0 && midCsv.startsWith('M_')) {
        mNr = parseInt(midCsv.replace('M_', ''), 10) || 0;
      }

      const startDt = (mRow.start_datetime || '').trim();
      const mDate = startDt ? parseIsoDate(startDt, spieltagDateIso) : spieltagDateIso;

      const exists = existingRows.some((er) => {
        const dbDate = String(er.match_date || '').slice(0, 10);
        const dbHome = String(er.player_a_name || '').trim();
        const dbAway = String(er.player_b_name || '').trim();
        const dbNr = Number(er.match_nr || 0);
        const dbEvent = String(er.event_name || '').trim();

        return (
          (dbHome === homeP && dbAway === awayP && dbDate === mDate) ||
          (dbNr === mNr && mNr > 0 && dbDate === mDate && dbEvent === eventNameStr)
        );
      });

      if (exists) {
        existingCount++;
      } else {
        newCount++;
      }
    }

    let mtimeStr = '';
    try {
      const stat = fs.statSync(fullMatchPath);
      const d = stat.mtime;
      const pad = (n: number) => String(n).padStart(2, '0');
      mtimeStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    } catch (e) {}

    let status: 'NEW' | 'PARTIAL' | 'EXISTS';
    let statusBadge: string;
    let statusDesc: string;

    if (existingCount === 0) {
      status = 'NEW';
      statusBadge = '🟢 NEU';
      statusDesc = `${newCount} neue Spiele`;
    } else if (newCount > 0) {
      status = 'PARTIAL';
      statusBadge = '🟡 TEILWEISE NEU';
      statusDesc = `${newCount} neu, ${existingCount} vorhanden`;
    } else {
      status = 'EXISTS';
      statusBadge = '⚪ VORHANDEN';
      statusDesc = `Alle ${existingCount} Spiele in DB`;
    }

    const teamDisplay = team
      ? team
      : slug.includes('Lions-A')
      ? 'Lions A'
      : slug.includes('Lions-B')
      ? 'Lions B'
      : 'Lions';

    const oppDisplay = opp
      ? opp
      : slug.includes('_vs_')
      ? slug.split('_vs_').pop()!.replace(/-/g, ' ')
      : 'Unbekannt';

    let spDisplay = 'Spieltag ?';
    if (spNr) {
      spDisplay = `Spieltag ${spNr}`;
    } else if (slug.includes('_SP')) {
      const spPart = slug.split('_SP')[1]?.slice(0, 2);
      const parsedSp = parseInt(spPart || '', 10);
      if (!isNaN(parsedSp)) {
        spDisplay = `Spieltag ${parsedSp}`;
      }
    }

    foundSpieltage.push({
      dir_path: dirPath,
      match_file: fullMatchPath,
      slug,
      team_display: teamDisplay,
      opp_display: oppDisplay,
      sp_display: spDisplay,
      date_str: dtStr || 'Unbekannt',
      total_matches: totalMatches,
      new_count: newCount,
      existing_count: existingCount,
      status,
      status_badge: statusBadge,
      status_desc: statusDesc,
      mtime_str: mtimeStr,
      is_new_candidate: status === 'NEW' || status === 'PARTIAL',
    });
  }

  foundSpieltage.sort((a, b) => {
    if (a.is_new_candidate !== b.is_new_candidate) {
      return a.is_new_candidate ? -1 : 1;
    }
    return a.date_str.localeCompare(b.date_str);
  });

  return foundSpieltage;
}

export async function importSpieltagFromDirectory(
  dirPath: string,
  season: string = '2026/2027',
  syncLeague: boolean = true
): Promise<ImportResult> {
  if (!dirPath || !fs.existsSync(dirPath)) {
    return {
      success: false,
      importedMatches: 0,
      created: 0,
      updated: 0,
      importedLegs: 0,
      importedVisits: 0,
      importedLeagueSingles: 0,
      importedLeagueDoubles: 0,
      matchdayDate: '',
      opponent: '',
      team: '',
      message: `Ordner nicht gefunden: ${dirPath}`,
      error: `Ordner nicht gefunden: ${dirPath}`,
    };
  }

  const files = fs.readdirSync(dirPath);
  const pickFile = (suffix: string) => {
    const candidates = files.filter((f) => f.toLowerCase().endsWith(suffix.toLowerCase()));
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.length - a.length);
    return path.join(dirPath, candidates[0]);
  };

  const matchesPath = pickFile('matches.csv');
  if (!matchesPath) {
    return {
      success: false,
      importedMatches: 0,
      created: 0,
      updated: 0,
      importedLegs: 0,
      importedVisits: 0,
      importedLeagueSingles: 0,
      importedLeagueDoubles: 0,
      matchdayDate: '',
      opponent: '',
      team: '',
      message: 'Keine matches.csv im Ordner gefunden.',
      error: 'Keine matches.csv im Ordner gefunden.',
    };
  }

  const legsPath = pickFile('legs.csv');
  const visitsPath = pickFile('visits.csv');
  const statsPath = pickFile('statistics.csv') || pickFile('stats.csv');
  const infoPath = pickFile('spieltag_info.json');

  const matchesCsvText = fs.readFileSync(matchesPath, 'utf-8');
  const legsCsvText = legsPath && fs.existsSync(legsPath) ? fs.readFileSync(legsPath, 'utf-8') : '';
  const visitsCsvText =
    visitsPath && fs.existsSync(visitsPath) ? fs.readFileSync(visitsPath, 'utf-8') : '';
  const statisticsCsvText =
    statsPath && fs.existsSync(statsPath) ? fs.readFileSync(statsPath, 'utf-8') : '';

  let spieltagInfo: any = {};
  if (infoPath && fs.existsSync(infoPath)) {
    try {
      spieltagInfo = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
    } catch (e) {}
  }

  if (!spieltagInfo.slug) {
    spieltagInfo.slug = path.basename(dirPath);
  }

  return processSpieltagImport({
    season,
    spieltagInfo,
    matchesCsvText,
    legsCsvText,
    visitsCsvText,
    statisticsCsvText,
    syncLeague,
  });
}

export async function batchImportSpieltage(
  selectedSpieltage: {
    dir_path: string;
    slug?: string;
    team_display?: string;
    opp_display?: string;
  }[],
  season: string = '2026/2027',
  syncLeague: boolean = true
): Promise<BatchImportSummary> {
  let totalCreated = 0;
  let totalUpdated = 0;
  let importedCount = 0;
  const results: BatchImportItemResult[] = [];

  for (const sp of selectedSpieltage) {
    const dirP = sp.dir_path;
    if (!dirP || !fs.existsSync(dirP)) continue;

    const res = await importSpieltagFromDirectory(dirP, season, syncLeague);
    if (res.success) {
      importedCount++;
      totalCreated += res.created;
      totalUpdated += res.updated;
      results.push({
        slug: sp.slug || path.basename(dirP),
        team: sp.team_display || res.team,
        opponent: sp.opp_display || res.opponent,
        created: res.created,
        updated: res.updated,
        success: true,
      });
    } else {
      results.push({
        slug: sp.slug || path.basename(dirP),
        error: res.error || res.message || 'Unbekannter Fehler',
        success: false,
      });
    }
  }

  return {
    imported_spieltage: importedCount,
    total_created: totalCreated,
    total_updated: totalUpdated,
    results,
  };
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
      created: 0,
      updated: 0,
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

  let rawTeam = spieltagInfo?.team || '';
  let team = 'A-Team';
  if (
    rawTeam.includes('B') ||
    slug.includes('Lions-B') ||
    slug.includes('Lions_B') ||
    slug.includes('Lions B')
  ) {
    team = 'B-Team';
  } else {
    team = 'A-Team';
  }

  let opponent = spieltagInfo?.opponent || '';
  if (!opponent && slug) {
    const vsMatch = slug.match(/vs[_-](.+)$/i);
    if (vsMatch) {
      opponent = vsMatch[1].replace(/[-_]/g, ' ').trim();
    }
  }

  const eventName = `Lions League (${team})`;

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
    const firstName = pName.split(' ')[0].toLowerCase();
    if (!playerMap.has(firstName)) {
      playerMap.set(firstName, {
        id: Number(p.id),
        team: String(p.team),
        name: pName,
      });
    }
  }

  // Prüfen, wie viele Matches für diesen Spieltag bereits existierten (für created vs updated Statistik)
  const existingCountRows = await sql`
    SELECT COUNT(*) as cnt
    FROM analytics_matches
    WHERE match_date = ${matchdayDate} AND season = ${season} AND event_name = ${eventName}
  `;
  const existingBeforeCount = Number(existingCountRows[0]?.cnt || 0);

  // 3. Bestehende Matches dieses Teams an diesem Tag löschen (Deduplizierung)
  await sql`
    DELETE FROM analytics_visits
    WHERE leg_id IN (
      SELECT l.id FROM analytics_legs l
      JOIN analytics_matches m ON l.match_id = m.id
      WHERE m.match_date = ${matchdayDate} AND m.season = ${season} AND m.event_name = ${eventName}
    )
  `;
  await sql`
    DELETE FROM analytics_legs
    WHERE match_id IN (
      SELECT id FROM analytics_matches
      WHERE match_date = ${matchdayDate} AND season = ${season} AND event_name = ${eventName}
    )
  `;
  await sql`
    DELETE FROM analytics_matches
    WHERE match_date = ${matchdayDate} AND season = ${season} AND event_name = ${eventName}
  `;

  if (syncLeague) {
    await sql`
      DELETE FROM matches
      WHERE match_date = ${matchdayDate} AND season = ${season} AND team = ${team}
    `;
    await sql`
      DELETE FROM doubles_matches
      WHERE match_date = ${matchdayDate} AND season = ${season} AND team = ${team}
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
    const matchNr =
      parseInt(mRow.match_number || String(mIdx + 1), 10) || mIdx + 1;
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

    let pAId = pA?.id || 0;
    let pBId = pB?.id || 0;

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
        if (pAId === 0 && dA1Id > 0) pAId = dA1Id;
      }
      const partsB = awayPlayer.split(/[/&+]/).map((s) => s.trim());
      if (partsB.length >= 2) {
        dB1Id = playerMap.get(partsB[0].toLowerCase())?.id || 0;
        dB2Id = playerMap.get(partsB[1].toLowerCase())?.id || 0;
        if (pBId === 0 && dB1Id > 0) pBId = dB1Id;
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

    const locationStr =
      spieltagInfo?.is_home !== undefined
        ? spieltagInfo.is_home
          ? 'Heim'
          : 'Auswärts'
        : pBId > 0 && pAId === 0
        ? 'Auswärts'
        : 'Heim';

    // Insert analytics_match
    const insertedMatch = await sql`
      INSERT INTO analytics_matches (
        player_a_id, player_b_id, player_a_name, player_b_name, match_date,
        event_name, round_name, best_of_legs, location, winner_id, season,
        duration_min, start_time, end_time, board_nr, match_nr, round_nr
      ) VALUES (
        ${pAId}, ${pBId}, ${homePlayer}, ${awayPlayer}, ${matchdayDate},
        ${eventName}, 'Liga-Spiel', ${Math.max(matchLegs.length, resHome + resAway, 3)},
        ${locationStr}, ${winnerId || null}, ${season},
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

      const isHomeWinner = winnerStr
        ? winnerStr === homePlayer.toLowerCase()
        : winnerPid === pAId;

      const dartsA = isHomeWinner ? dartsWin : dartsLos;
      const dartsB = isHomeWinner ? dartsLos : dartsWin;
      const coA = isHomeWinner ? coWin : 0;
      const coB = !isHomeWinner ? coWin : 0;

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
        const vOrder =
          parseInt(v.visit_number || String(vIdx + 1), 10) || vIdx + 1;

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

          const myVisits = processedLegs.flatMap((l) =>
            isA ? l.visitsA : l.visitsB
          );
          const first9Visits = processedLegs.flatMap((l) =>
            (isA ? l.visitsA : l.visitsB).slice(0, 3)
          );
          const first18Visits = processedLegs.flatMap((l) =>
            (isA ? l.visitsA : l.visitsB).slice(0, 6)
          );
          const totalDarts = processedLegs.reduce(
            (sum, l) => sum + (isA ? l.dartsA : l.dartsB),
            0
          );

          // Aus stats.csv abgleichen falls vorhanden
          const st = statsMap.get(
            `${matchIdCsv.toLowerCase()}_${lp.name.toLowerCase()}`
          );

          const avgTotal = st?.overall_average
            ? Math.round(parseFloat(st.overall_average) * 10) / 10
            : totalDarts > 0 && myVisits.length > 0
            ? Math.round(
                (myVisits.reduce((a, b) => a + b, 0) / totalDarts) * 3 * 10
              ) / 10
            : 45.0;

          const avg9 =
            first9Visits.length > 0
              ? Math.round(
                  (first9Visits.reduce((a, b) => a + b, 0) /
                    first9Visits.length) *
                    10
                ) / 10
              : st?.first_9_avg
              ? parseFloat(st.first_9_avg)
              : avgTotal;

          const avg18 =
            first18Visits.length > 0
              ? Math.round(
                  (first18Visits.reduce((a, b) => a + b, 0) /
                    first18Visits.length) *
                    10
                ) / 10
              : st?.first_18_avg
              ? parseFloat(st.first_18_avg)
              : avgTotal;

          const s80 = myVisits.filter((s) => s >= 80 && s <= 99).length;
          const s100 = myVisits.filter((s) => s >= 100 && s <= 139).length;
          const s140 = myVisits.filter((s) => s >= 140 && s <= 179).length;
          const s180 = myVisits.filter((s) => s === 180).length;
          const s141_179 = myVisits.filter((s) => s >= 141 && s <= 179).length;

          const hf = Math.max(
            ...processedLegs.map((l) => (isA ? l.coA : l.coB)),
            0
          );
          const shortLegs = processedLegs.filter(
            (l) =>
              l.winnerPid === lp.pid &&
              (isA ? l.dartsA : l.dartsB) <= 18 &&
              (isA ? l.dartsA : l.dartsB) > 0
          ).length;

          const specialsCount =
            s180 + s141_179 + (hf >= 101 ? 1 : 0) + shortLegs;

          const insertedLm = await sql`
            INSERT INTO matches (
              player_id, match_date, opponent, legs_won, legs_lost,
              avg_total, avg_9, avg_18, scores_80, scores_100, scores_140,
              scores_180, high_finishes, short_legs, specials_count,
              season, team
            ) VALUES (
              ${lp.pid}, ${matchdayDate}, ${lp.oppName || opponent}, ${myLegsWon}, ${myLegsLost},
              ${avgTotal}, ${avg9}, ${avg18}, ${s80}, ${s100}, ${s140},
              ${s180}, ${hf >= 101 ? hf : 0}, ${shortLegs}, ${specialsCount},
              ${season}, ${team}
            )
            RETURNING id
          `;
          if (insertedLm[0]?.id) {
            await sql`
              UPDATE analytics_matches SET league_match_id = ${Number(insertedLm[0].id)}
              WHERE id = ${analyticsMatchId}
            `;
          }
          countLeagueSingles++;
        }
      } else {
        // DOPPELMATCH: Lions-Doppel identifizieren
        const lionsDoubles: {
          p1: number;
          p2: number;
          oppName: string;
          isHome: boolean;
          pairName: string;
        }[] = [];
        if (dA1Id > 0 && dA2Id > 0) {
          lionsDoubles.push({
            p1: dA1Id,
            p2: dA2Id,
            oppName: awayPlayer,
            isHome: true,
            pairName: homePlayer,
          });
        }
        if (dB1Id > 0 && dB2Id > 0) {
          lionsDoubles.push({
            p1: dB1Id,
            p2: dB2Id,
            oppName: homePlayer,
            isHome: false,
            pairName: awayPlayer,
          });
        }

        for (const ld of lionsDoubles) {
          const isA = ld.isHome;
          const myLegsWon = isA ? resHome : resAway;
          const myLegsLost = isA ? resAway : resHome;

          const myVisits = processedLegs.flatMap((l) =>
            isA ? l.visitsA : l.visitsB
          );
          const first9Visits = processedLegs.flatMap((l) =>
            (isA ? l.visitsA : l.visitsB).slice(0, 3)
          );
          const first18Visits = processedLegs.flatMap((l) =>
            (isA ? l.visitsA : l.visitsB).slice(0, 6)
          );
          const totalDarts = processedLegs.reduce(
            (sum, l) => sum + (isA ? l.dartsA : l.dartsB),
            0
          );

          const st = statsMap.get(
            `${matchIdCsv.toLowerCase()}_${ld.pairName.toLowerCase()}`
          );

          const avgTotal = st?.overall_average
            ? Math.round(parseFloat(st.overall_average) * 10) / 10
            : totalDarts > 0 && myVisits.length > 0
            ? Math.round(
                (myVisits.reduce((a, b) => a + b, 0) / totalDarts) * 3 * 10
              ) / 10
            : 42.0;

          const avg9 =
            first9Visits.length > 0
              ? Math.round(
                  (first9Visits.reduce((a, b) => a + b, 0) /
                    first9Visits.length) *
                    10
                ) / 10
              : avgTotal;

          const avg18 =
            first18Visits.length > 0
              ? Math.round(
                  (first18Visits.reduce((a, b) => a + b, 0) /
                    first18Visits.length) *
                    10
                ) / 10
              : avgTotal;

          const s80 = myVisits.filter((s) => s >= 80 && s <= 99).length;
          const s100 = myVisits.filter((s) => s >= 100 && s <= 139).length;
          const s140 = myVisits.filter((s) => s >= 140 && s <= 179).length;
          const s180 = myVisits.filter((s) => s === 180).length;
          const s141_179 = myVisits.filter((s) => s >= 141 && s <= 179).length;

          const hf = Math.max(
            ...processedLegs.map((l) => (isA ? l.coA : l.coB)),
            0
          );
          const shortLegs = processedLegs.filter(
            (l) =>
              (isA ? l.dartsA : l.dartsB) <= 18 &&
              (isA ? l.dartsA : l.dartsB) > 0
          ).length;

          const specialsCount =
            s180 + s141_179 + (hf >= 101 ? 1 : 0) + shortLegs;

          const insertedDm = await sql`
            INSERT INTO doubles_matches (
              player1_id, player2_id, match_date, opponent,
              legs_won, legs_lost, avg_total, avg_9, avg_18,
              scores_80, scores_100, scores_140, scores_180,
              high_finishes, short_legs, specials_count,
              season, team
            ) VALUES (
              ${ld.p1}, ${ld.p2}, ${matchdayDate}, ${ld.oppName || opponent},
              ${myLegsWon}, ${myLegsLost}, ${avgTotal}, ${avg9}, ${avg18},
              ${s80}, ${s100}, ${s140}, ${s180},
              ${hf >= 101 ? hf : 0}, ${shortLegs}, ${specialsCount},
              ${season}, ${team}
            )
            RETURNING id
          `;
          if (insertedDm[0]?.id) {
            await sql`
              UPDATE analytics_matches SET league_match_id = ${Number(insertedDm[0].id)}
              WHERE id = ${analyticsMatchId}
            `;
          }
          countLeagueDoubles++;

          // Doppel-Specials synchronisieren (+0,5 Pkt Bonus in Rangliste)
          if (s180 > 0 || s141_179 > 0 || hf >= 101 || shortLegs > 0) {
            const p1Row = playerRows.find((p) => Number(p.id) === ld.p1);
            const p2Row = playerRows.find((p) => Number(p.id) === ld.p2);
            const p1NameStr = p1Row ? String(p1Row.name) : 'Partner';
            const p2NameStr = p2Row ? String(p2Row.name) : 'Partner';
            const oppTeam = opponent || ld.oppName;

            if (s180 > 0) {
              const chk = await sql`
                SELECT id FROM doubles_specials
                WHERE player_id = ${ld.p1} AND match_date = ${matchdayDate}
                  AND special_type LIKE '%180%' AND season = ${season}
              `;
              if (chk.length === 0) {
                for (let idx = 0; idx < s180; idx++) {
                  await sql`
                    INSERT INTO doubles_specials (
                      player_id, partner_name, opponent_team, match_date, special_type, description, season
                    ) VALUES (
                      ${ld.p1}, ${p2NameStr}, ${oppTeam}, ${matchdayDate},
                      '180er High Score 🎯', ${`180er im Doppel mit ${p2NameStr}`}, ${season}
                    )
                  `;
                }
              }
            }

            if (s141_179 > 0) {
              for (const hs of myVisits.filter((s) => s >= 141 && s <= 179)) {
                const chk = await sql`
                  SELECT id FROM doubles_specials
                  WHERE player_id = ${ld.p1} AND match_date = ${matchdayDate}
                    AND special_type LIKE '%High Score%' AND description LIKE ${`%${hs}%`} AND season = ${season}
                `;
                if (chk.length === 0) {
                  await sql`
                    INSERT INTO doubles_specials (
                      player_id, partner_name, opponent_team, match_date, special_type, description, season
                    ) VALUES (
                      ${ld.p1}, ${p2NameStr}, ${oppTeam}, ${matchdayDate},
                      'High Score (141 - 171) 💥', ${`${hs}er High Score im Doppel mit ${p2NameStr}`}, ${season}
                    )
                  `;
                }
              }
            }

            if (hf >= 101) {
              for (const [pid, partner] of [
                [ld.p1, p2NameStr],
                [ld.p2, p1NameStr],
              ] as [number, string][]) {
                const chk = await sql`
                  SELECT id FROM doubles_specials
                  WHERE player_id = ${pid} AND match_date = ${matchdayDate}
                    AND special_type LIKE '%High Finish%' AND season = ${season}
                `;
                if (chk.length === 0) {
                  await sql`
                    INSERT INTO doubles_specials (
                      player_id, partner_name, opponent_team, match_date, special_type, description, season
                    ) VALUES (
                      ${pid}, ${partner}, ${oppTeam}, ${matchdayDate},
                      'High Finish (101 - 170) 🏁', ${`${hf}er Checkout im Doppel`}, ${season}
                    )
                  `;
                }
              }
            }

            if (shortLegs > 0) {
              for (const [pid, partner] of [
                [ld.p1, p2NameStr],
                [ld.p2, p1NameStr],
              ] as [number, string][]) {
                const chk = await sql`
                  SELECT id FROM doubles_specials
                  WHERE player_id = ${pid} AND match_date = ${matchdayDate}
                    AND special_type LIKE '%Short%' AND season = ${season}
                `;
                if (chk.length === 0) {
                  await sql`
                    INSERT INTO doubles_specials (
                      player_id, partner_name, opponent_team, match_date, special_type, description, season
                    ) VALUES (
                      ${pid}, ${partner}, ${oppTeam}, ${matchdayDate},
                      'Short Game (≤ 18 Darts) 🏹', 'Short Leg im Doppel', ${season}
                    )
                  `;
                }
              }
            }
          }
        }
      }
    }
  }

  const updatedCount = Math.min(countMatches, existingBeforeCount);
  const createdCount = Math.max(0, countMatches - updatedCount);

  return {
    success: true,
    importedMatches: countMatches,
    created: createdCount,
    updated: updatedCount,
    importedLegs: countLegs,
    importedVisits: countVisits,
    importedLeagueSingles: countLeagueSingles,
    importedLeagueDoubles: countLeagueDoubles,
    matchdayDate,
    opponent,
    team,
    message: `🎉 Spieltag erfolgreich importiert! ${countMatches} Matches (${createdCount} neu, ${updatedCount} aktualisiert), ${countLegs} Legs und ${countVisits} Aufnahmen wurden in Supabase gespeichert.`,
  };
}
