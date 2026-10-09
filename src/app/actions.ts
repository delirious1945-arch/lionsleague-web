'use server';

import { sql } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export interface UserSession {
  id: number;
  name: string;
  role: string;
  team: string;
}

export async function getSessionAction(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('lions_session');
    if (!sessionCookie?.value) return null;
    return JSON.parse(sessionCookie.value) as UserSession;
  } catch (err) {
    return null;
  }
}

export async function loginAction(usernameInput: string, passwordInput: string) {
  try {
    const u = usernameInput.trim().toLowerCase();
    const p = passwordInput.trim();

    if (!u) {
      return { success: false, error: 'Bitte gib deinen Benutzernamen / Namen ein.' };
    }
    if (!p) {
      return { success: false, error: 'Bitte gib dein Passwort ein.' };
    }

    const rows = await sql`
      SELECT id, name, team, password, must_change_password, role
      FROM players
    `;

    for (const row of rows) {
      const pName = String(row.name);
      const pNameLower = pName.toLowerCase();
      const firstNameLower = pNameLower.split(' ')[0];
      const pRole = String(row.role || 'player');

      const matchesUser =
        u === pNameLower ||
        u === firstNameLower ||
        (u === 'admin' && pRole === 'admin');

      if (matchesUser) {
        const storedPass = String(row.password || '');
        const passMatches = p === storedPass || p === 'lions2026';

        if (passMatches) {
          const isFirstLogin = Boolean(row.must_change_password) || p === 'lions2026';

          if (isFirstLogin) {
            return {
              success: false,
              requiresPasswordChange: true,
              playerId: Number(row.id),
              name: pName,
              role: pRole,
              team: String(row.team),
            };
          }

          const sessionData: UserSession = {
            id: Number(row.id),
            name: pName,
            role: pRole,
            team: String(row.team),
          };

          const cookieStore = await cookies();
          cookieStore.set('lions_session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 days
            path: '/',
          });

          revalidatePath('/', 'layout');
          return { success: true, user: sessionData };
        }
      }
    }

    return {
      success: false,
      error:
        'Ungültiger Name oder Passwort. Bei Erstanmeldung nutze bitte deinen Vor- und Nachnamen und das Einmal-Passwort "lions2026".',
    };
  } catch (err: any) {
    console.error('Error during login:', err);
    return { success: false, error: `Login-Fehler: ${err.message}` };
  }
}

export async function firstLoginPasswordChangeAction(
  playerId: number,
  newPasswordInput: string,
  confirmPasswordInput: string
) {
  try {
    const newPw = newPasswordInput.trim();
    const confirmPw = confirmPasswordInput.trim();

    if (newPw.length < 10) {
      return { success: false, error: 'Das Passwort muss mindestens 10 Zeichen lang sein.' };
    }
    if (!/\d/.test(newPw)) {
      return { success: false, error: 'Das Passwort muss mindestens eine Zahl (0–9) enthalten.' };
    }
    if (!/[^a-zA-Z0-9]/.test(newPw)) {
      return {
        success: false,
        error:
          'Das Passwort muss mindestens ein Sonderzeichen (z.B. !, ?, @, #, $, %, -, _) enthalten.',
      };
    }
    if (newPw !== confirmPw) {
      return { success: false, error: 'Die beiden Passwörter stimmen nicht überein.' };
    }

    await sql`
      UPDATE players
      SET password = ${newPw}, must_change_password = 0
      WHERE id = ${playerId}
    `;

    const userRows = await sql`
      SELECT id, name, team, role FROM players WHERE id = ${playerId}
    `;
    if (userRows.length > 0) {
      const u = userRows[0];
      const sessionData: UserSession = {
        id: Number(u.id),
        name: String(u.name),
        role: String(u.role || 'player'),
        team: String(u.team),
      };

      const cookieStore = await cookies();
      cookieStore.set('lions_session', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Error in firstLoginPasswordChangeAction:', err);
    return { success: false, error: err.message };
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('lions_session');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    console.error('Error logging out:', err);
    return { success: false, error: err.message };
  }
}


export async function updateSettingsAction(
  win_w: number,
  avg_w: number,
  avg9_w: number,
  avg18_w: number,
  scores_w: number
) {
  try {
    await sql`
      UPDATE settings 
      SET win_weight = ${win_w}, 
          avg_weight = ${avg_w}, 
          avg9_weight = ${avg9_w}, 
          avg18_weight = ${avg18_w}, 
          scores_weight = ${scores_w}
      WHERE id = 1
    `;
    revalidatePath('/');
    revalidatePath('/optionen');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return { success: false, error: err.message };
  }
}

export async function addPlayerAction(name: string, team: string, role = 'player') {
  try {
    await sql`
      INSERT INTO players (name, team, password, must_change_password, role)
      VALUES (${name.trim()}, ${team}, 'lions2026', 1, ${role})
    `;
    revalidatePath('/');
    revalidatePath('/teams');
    revalidatePath('/spieler');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (err: any) {
    console.error('Error adding player:', err);
    return { success: false, error: err.message };
  }
}

export async function resetPlayerPasswordAction(playerId: number) {
  try {
    await sql`
      UPDATE players
      SET password = 'lions2026', must_change_password = 1
      WHERE id = ${playerId}
    `;
    return { success: true };
  } catch (err: any) {
    console.error('Error resetting password:', err);
    return { success: false, error: err.message };
  }
}

export async function updatePlayerRoleAction(playerId: number, newRole: string) {
  try {
    await sql`
      UPDATE players
      SET role = ${newRole}
      WHERE id = ${playerId}
    `;
    revalidatePath('/verwaltung');
    revalidatePath('/optionen');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating role:', err);
    return { success: false, error: err.message };
  }
}

export async function addMatchAction(data: {
  player_id: number;
  match_date: string;
  opponent: string;
  legs_won: number;
  legs_lost: number;
  avg_total: number;
  avg_9: number;
  avg_18: number;
  scores_80: number;
  scores_100: number;
  scores_140: number;
  scores_180: number;
  high_finishes: number;
  short_legs: number;
  specials_count: number;
  season: string;
  team: string;
}) {
  try {
    await sql`
      INSERT INTO matches (
        player_id, match_date, opponent, legs_won, legs_lost,
        avg_total, avg_9, avg_18, scores_80, scores_100, scores_140, scores_180,
        high_finishes, short_legs, specials_count, season, team
      ) VALUES (
        ${data.player_id}, ${data.match_date}, ${data.opponent}, ${data.legs_won}, ${data.legs_lost},
        ${data.avg_total}, ${data.avg_9}, ${data.avg_18}, ${data.scores_80}, ${data.scores_100},
        ${data.scores_140}, ${data.scores_180}, ${data.high_finishes}, ${data.short_legs},
        ${data.specials_count}, ${data.season}, ${data.team}
      )
    `;
    revalidatePath('/');
    revalidatePath('/spieler');
    revalidatePath('/teams');
    return { success: true };
  } catch (err: any) {
    console.error('Error adding match:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteMatchAction(matchId: number) {
  try {
    await sql`DELETE FROM matches WHERE id = ${matchId}`;
    revalidatePath('/');
    revalidatePath('/spieler');
    revalidatePath('/teams');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (err: any) {
    console.error('Error deleting match:', err);
    return { success: false, error: err.message };
  }
}

export async function updateMatchAction(
  matchId: number,
  data: {
    player_id: number;
    match_date: string;
    opponent: string;
    legs_won: number;
    legs_lost: number;
    avg_total: number;
    avg_9: number;
    avg_18: number;
    scores_80: number;
    scores_100: number;
    scores_140: number;
    scores_180: number;
    high_finishes: number;
    short_legs: number;
    specials_count: number;
    season?: string;
  }
) {
  try {
    await sql`
      UPDATE matches
      SET player_id = ${data.player_id},
          match_date = ${data.match_date},
          opponent = ${data.opponent},
          legs_won = ${data.legs_won},
          legs_lost = ${data.legs_lost},
          avg_total = ${data.avg_total},
          avg_9 = ${data.avg_9},
          avg_18 = ${data.avg_18},
          scores_80 = ${data.scores_80},
          scores_100 = ${data.scores_100},
          scores_140 = ${data.scores_140},
          scores_180 = ${data.scores_180},
          high_finishes = ${data.high_finishes},
          short_legs = ${data.short_legs},
          specials_count = ${data.specials_count}
      WHERE id = ${matchId}
    `;
    revalidatePath('/');
    revalidatePath('/spieler');
    revalidatePath('/teams');
    revalidatePath('/verwaltung');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating match:', err);
    return { success: false, error: err.message };
  }
}

export async function addDoublesSpecialAction(data: {
  player_id: number;
  partner_name: string;
  opponent_team: string;
  match_date: string;
  special_type: string;
  description: string;
  season: string;
}) {
  try {
    await sql`
      INSERT INTO doubles_specials (
        player_id, partner_name, opponent_team, match_date, special_type, description, season
      ) VALUES (
        ${data.player_id}, ${data.partner_name}, ${data.opponent_team},
        ${data.match_date}, ${data.special_type}, ${data.description}, ${data.season}
      )
    `;
    revalidatePath('/');
    revalidatePath('/spieler');
    revalidatePath('/teams');
    return { success: true };
  } catch (err: any) {
    console.error('Error adding doubles special:', err);
    return { success: false, error: err.message };
  }
}

