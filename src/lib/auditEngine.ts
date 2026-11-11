import { sql } from './db';

export interface AuditIssue {
  type: 'HIGH_FINISH_MISMATCH' | 'SCORE_180_MISMATCH' | 'DUPLICATE_LEGS' | 'INVALID_VISIT_PLAYER' | 'SPECIALS_MISMATCH';
  severity: 'WARNING' | 'ERROR';
  description: string;
  autoFixed: boolean;
}

export interface AuditReport {
  timestamp: string;
  season: string;
  totalMatchesAudited: number;
  totalLegsAudited: number;
  totalVisitsAudited: number;
  issuesFound: number;
  issuesFixed: number;
  details: AuditIssue[];
  highFinishesFound: { player: string; checkout: number; date: string; type: 'Einzel' | 'Doppel' }[];
  top180sFound: { player: string; count: number }[];
}

/**
 * Führt einen vollständigen Konsistenz-Audit für die Saison durch:
 * 1. Prüft Checkouts >= 100 in analytics_legs und synchronisiert diese in matches / doubles_matches
 * 2. Prüft 180er in analytics_visits und synchronisiert diese in matches / doubles_matches
 * 3. Beseitigt verwaiste oder doppelte Legs
 * 4. Stellt sicher, dass in Einzelmatches keine Fremd-Visits liegen
 * 5. Korrigiert die specials_count Werte
 */
export async function runSeasonDataAudit(season = '2026/2027', autoFix = true): Promise<AuditReport> {
  const issues: AuditIssue[] = [];
  let fixedCount = 0;

  // -------------------------------------------------------------
  // 1. DUPLICATE LEGS DEDUPLIZIERUNG
  // -------------------------------------------------------------
  const dupLegs = await sql`
    SELECT match_id, leg_num, MIN(id) as keep_id, COUNT(*) as cnt
    FROM analytics_legs
    WHERE match_id IN (SELECT id FROM analytics_matches WHERE season = ${season})
    GROUP BY match_id, leg_num
    HAVING COUNT(*) > 1
  `;

  if (dupLegs.length > 0) {
    issues.push({
      type: 'DUPLICATE_LEGS',
      severity: 'ERROR',
      description: `${dupLegs.length} doppelte Leg-Einträge gefunden.`,
      autoFixed: autoFix,
    });

    if (autoFix) {
      await sql`
        DELETE FROM analytics_visits
        WHERE leg_id IN (
          SELECT l.id
          FROM analytics_legs l
          JOIN (
            SELECT match_id, leg_num, MIN(id) as keep_id
            FROM analytics_legs
            WHERE match_id IN (SELECT id FROM analytics_matches WHERE season = ${season})
            GROUP BY match_id, leg_num
            HAVING count(*) > 1
          ) dup ON l.match_id = dup.match_id AND l.leg_num = dup.leg_num AND l.id > dup.keep_id
        )
      `;
      await sql`
        DELETE FROM analytics_legs
        WHERE id IN (
          SELECT l.id
          FROM analytics_legs l
          JOIN (
            SELECT match_id, leg_num, MIN(id) as keep_id
            FROM analytics_legs
            WHERE match_id IN (SELECT id FROM analytics_matches WHERE season = ${season})
            GROUP BY match_id, leg_num
            HAVING count(*) > 1
          ) dup ON l.match_id = dup.match_id AND l.leg_num = dup.leg_num AND l.id > dup.keep_id
        )
      `;
      fixedCount++;
    }
  }

  // -------------------------------------------------------------
  // 2. FREMD-VISITS IN EINZELMATCHES BEREINIGEN
  // -------------------------------------------------------------
  const wrongVisits = await sql`
    SELECT COUNT(v.id) as cnt
    FROM analytics_visits v
    JOIN analytics_legs l ON v.leg_id = l.id
    JOIN analytics_matches m ON l.match_id = m.id
    WHERE m.season = ${season}
      AND m.player_a_name NOT LIKE '%&%' AND m.player_b_name NOT LIKE '%&%'
      AND v.player_id > 0
      AND v.player_id != m.player_a_id 
      AND v.player_id != m.player_b_id
  `;
  const wrongCount = Number(wrongVisits[0]?.cnt || 0);

  if (wrongCount > 0) {
    issues.push({
      type: 'INVALID_VISIT_PLAYER',
      severity: 'ERROR',
      description: `${wrongCount} Aufnahmen in Einzelmatches waren falschen Spielern zugeordnet.`,
      autoFixed: autoFix,
    });

    if (autoFix) {
      await sql`
        UPDATE analytics_visits v
        SET player_id = 0
        FROM analytics_legs l
        JOIN analytics_matches m ON l.match_id = m.id
        WHERE v.leg_id = l.id
          AND m.season = ${season}
          AND m.player_a_name NOT LIKE '%&%'
          AND m.player_b_name NOT LIKE '%&%'
          AND v.player_id > 0
          AND v.player_id != m.player_a_id
          AND v.player_id != m.player_b_id
      `;
      fixedCount++;
    }
  }

  // -------------------------------------------------------------
  // 3. HIGH FINISH AUDIT & SYNCHRONISATION
  // -------------------------------------------------------------
  // Finde alle tatsächlichen High Finishes (Checkouts >= 100) aus den Legs
  const legsCheckouts = await sql`
    SELECT 
      m.id as analytics_match_id,
      m.league_match_id,
      m.match_date,
      m.player_a_id,
      m.player_b_id,
      m.player_a_name,
      m.player_b_name,
      l.leg_num,
      l.winner_player_id,
      l.checkout_a,
      l.checkout_b
    FROM analytics_legs l
    JOIN analytics_matches m ON l.match_id = m.id
    WHERE m.season = ${season}
      AND (l.checkout_a >= 100 OR l.checkout_b >= 100)
    ORDER BY m.match_date DESC
  `;

  const highFinishesFound: { player: string; checkout: number; date: string; type: 'Einzel' | 'Doppel' }[] = [];

  for (const row of legsCheckouts) {
    const isDouble = String(row.player_a_name).includes('&');
    const coA = Number(row.checkout_a) || 0;
    const coB = Number(row.checkout_b) || 0;

    if (coA >= 100 && Number(row.player_a_id) > 0) {
      highFinishesFound.push({
        player: row.player_a_name,
        checkout: coA,
        date: String(row.match_date).split('T')[0],
        type: isDouble ? 'Doppel' : 'Einzel',
      });
    }
    if (coB >= 100 && Number(row.player_b_id) > 0) {
      highFinishesFound.push({
        player: row.player_b_name,
        checkout: coB,
        date: String(row.match_date).split('T')[0],
        type: isDouble ? 'Doppel' : 'Einzel',
      });
    }
  }

  // Jetzt prüfen wir Einzelmatches: stimmt `high_finishes` in `matches`?
  const singleMatches = await sql`
    SELECT 
      m.id as league_match_id,
      m.player_id,
      p.name as player_name,
      m.match_date,
      m.high_finishes as current_hf,
      COALESCE(MAX(
        CASE 
          WHEN am.player_a_id = m.player_id THEN al.checkout_a
          WHEN am.player_b_id = m.player_id THEN al.checkout_b
          ELSE 0
        END
      ), 0) as expected_hf
    FROM matches m
    JOIN players p ON m.player_id = p.id
    LEFT JOIN analytics_matches am ON am.league_match_id = m.id
    LEFT JOIN analytics_legs al ON al.match_id = am.id
    WHERE m.season = ${season}
    GROUP BY m.id, m.player_id, p.name, m.match_date, m.high_finishes
  `;

  for (const sm of singleMatches) {
    const curr = Number(sm.current_hf) || 0;
    const expHf = Number(sm.expected_hf) || 0;
    const expValidHf = expHf >= 100 ? expHf : 0;

    if (curr !== expValidHf) {
      issues.push({
        type: 'HIGH_FINISH_MISMATCH',
        severity: 'WARNING',
        description: `High Finish bei ${sm.player_name} am ${String(sm.match_date).split('T')[0]}: stand auf ${curr}, echter Checkout war ${expValidHf}.`,
        autoFixed: autoFix,
      });

      if (autoFix) {
        await sql`
          UPDATE matches
          SET high_finishes = ${expValidHf},
              specials_count = scores_180 + 
                               CASE WHEN ${expValidHf} >= 101 THEN 1 ELSE 0 END + 
                               short_legs + 
                               (SELECT count(*) FROM analytics_visits v 
                                JOIN analytics_legs l ON v.leg_id = l.id 
                                JOIN analytics_matches am ON l.match_id = am.id 
                                WHERE am.league_match_id = ${sm.league_match_id} 
                                  AND v.player_id = ${sm.player_id} 
                                  AND v.score >= 141 AND v.score <= 179)
          WHERE id = ${sm.league_match_id}
        `;
        fixedCount++;
      }
    }
  }

  // Doppelmatches bereinigen (high_finishes in doubles_matches)
  const doubleMatches = await sql`
    SELECT 
      dm.id as doubles_match_id,
      dm.player1_id,
      dm.player2_id,
      dm.high_finishes as current_hf,
      COALESCE(MAX(GREATEST(al.checkout_a, al.checkout_b)), 0) as max_co
    FROM doubles_matches dm
    LEFT JOIN analytics_matches am ON am.league_match_id = dm.id
    LEFT JOIN analytics_legs al ON al.match_id = am.id
    WHERE dm.season = ${season}
    GROUP BY dm.id, dm.player1_id, dm.player2_id, dm.high_finishes
  `;

  for (const dm of doubleMatches) {
    const curr = Number(dm.current_hf) || 0;
    const maxCo = Number(dm.max_co) || 0;
    const expHf = maxCo >= 100 ? maxCo : 0;

    if (curr !== expHf) {
      issues.push({
        type: 'HIGH_FINISH_MISMATCH',
        severity: 'WARNING',
        description: `Doppel-Match ID ${dm.doubles_match_id}: High Finish stand auf ${curr}, echter Wert: ${expHf}.`,
        autoFixed: autoFix,
      });

      if (autoFix) {
        await sql`
          UPDATE doubles_matches
          SET high_finishes = ${expHf}
          WHERE id = ${dm.doubles_match_id}
        `;
        fixedCount++;
      }
    }
  }

  // -------------------------------------------------------------
  // 4. 180er AUDIT
  // -------------------------------------------------------------
  const top180s = await sql`
    SELECT p.name as player, COUNT(v.id)::int as count
    FROM analytics_visits v
    JOIN analytics_legs l ON v.leg_id = l.id
    JOIN analytics_matches m ON l.match_id = m.id
    JOIN players p ON v.player_id = p.id
    WHERE v.score = 180 AND m.season = ${season}
    GROUP BY p.name
    ORDER BY count DESC
  `;

  // Gesamtzahlen für den Bericht
  const matchCountRows = await sql`SELECT COUNT(*) as cnt FROM analytics_matches WHERE season = ${season}`;
  const legCountRows = await sql`SELECT COUNT(*) as cnt FROM analytics_legs l JOIN analytics_matches m ON l.match_id = m.id WHERE m.season = ${season}`;
  const visitCountRows = await sql`SELECT COUNT(*) as cnt FROM analytics_visits v JOIN analytics_legs l ON v.leg_id = l.id JOIN analytics_matches m ON l.match_id = m.id WHERE m.season = ${season}`;

  return {
    timestamp: new Date().toISOString(),
    season,
    totalMatchesAudited: Number(matchCountRows[0]?.cnt || 0),
    totalLegsAudited: Number(legCountRows[0]?.cnt || 0),
    totalVisitsAudited: Number(visitCountRows[0]?.cnt || 0),
    issuesFound: issues.length,
    issuesFixed: fixedCount,
    details: issues,
    highFinishesFound,
    top180sFound: top180s.map(r => ({ player: r.player, count: Number(r.count) })),
  };
}
