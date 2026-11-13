import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export type GameType = 'idle' | 'doppelquote' | 'pdc_challenge' | 'fussball' | 'stellen_checken';

export interface UnifiedLiveState {
  boardId: string;
  sessionId?: string;
  status: 'idle' | 'playing' | 'completed';
  gameType: GameType;
  gameTitle?: string;
  p1Name?: string;
  p2Name?: string;
  activePlayer?: 1 | 2;
  gameMode?: string;
  // Specific payload fields
  doppelquoteData?: any;
  pdcData?: any;
  fussballData?: any;
  fussballStats?: any;
  stellenCheckenData?: any;
  // Direct access fields for UI components
  currentTarget?: string;
  currentTargetIndex?: number;
  currentRound?: number;
  currentVisit?: number;
  totalVisits?: number;
  currentPart?: number;
  currentNumber?: number;
  recommendedRoute?: string;
  scoreP1?: number;
  scoreP2?: number;
  targetGoals?: number;
  ballPossession?: 1 | 2;
  currentAction?: string;
  p1Stats?: any;
  p2Stats?: any;
  p1Checks?: number;
  p1Points?: number;
  p2Checks?: number;
  p2Points?: number;
  scoresP1?: any;
  scoresP2?: any;
  winner?: string;
  updatedAt: number;
}

const defaultState = (boardId: string, sessionId?: string): UnifiedLiveState => ({
  boardId,
  sessionId: sessionId || 'idle',
  status: 'idle',
  gameType: 'idle',
  gameTitle: 'Warte auf Spielbeginn...',
  scoreP1: 0,
  scoreP2: 0,
  updatedAt: Date.now(),
});

// Schneller In-Memory Fallback
const inMemoryFallback: Record<string, UnifiedLiveState> = {
  '1': defaultState('1'),
  '2': defaultState('2'),
  '3': defaultState('3'),
  '4': defaultState('4'),
  '5': defaultState('5'),
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get('board') || '1';

    try {
      const rows = await sql`
        SELECT session_id, game_type, status, payload, updated_at
        FROM board_live_sessions
        WHERE board_id = ${boardId}
        LIMIT 1;
      `;

      if (rows.length > 0) {
        const row = rows[0];
        const updatedAt = Number(row.updated_at);
        const ageMs = Date.now() - updatedAt;

        // Auto-Standby: Wenn älter als 60 Minuten ohne Aktivität -> sauberes Standby
        if (ageMs > 60 * 60 * 1000 || row.status === 'idle') {
          return NextResponse.json(defaultState(boardId, row.session_id), {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            },
          });
        }

        const payload =
          typeof row.payload === 'object' && row.payload !== null
            ? row.payload
            : JSON.parse(row.payload);

        return NextResponse.json(payload, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        });
      }
    } catch (dbErr) {
      console.error('Database read error in /api/live/board, using fallback:', dbErr);
    }

    const fallback = inMemoryFallback[boardId] || defaultState(boardId);
    return NextResponse.json(fallback, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json(defaultState('1'), { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const boardId = String(data.boardId || data.board || '1');
    const sessionId = String(data.sessionId || 'legacy');
    const gameType = String(data.gameType || 'idle');
    const status = String(data.status || 'playing');
    const now = Date.now();

    // 1. Wenn ein Standby / Reset übermittelt wird
    if (status === 'idle' || data.reset === true) {
      const idlePayload = {
        ...defaultState(boardId, sessionId),
        updatedAt: now,
      };

      try {
        await sql`
          INSERT INTO board_live_sessions (board_id, session_id, game_type, status, payload, updated_at)
          VALUES (${boardId}, ${sessionId}, 'idle', 'idle', ${JSON.stringify(idlePayload)}::jsonb, ${now})
          ON CONFLICT (board_id) DO UPDATE SET
            session_id = EXCLUDED.session_id,
            game_type = 'idle',
            status = 'idle',
            payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at
          WHERE board_live_sessions.session_id = ${sessionId} 
             OR board_live_sessions.status = 'idle'
             OR board_live_sessions.updated_at <= ${now};
        `;
      } catch (dbErr) {
        console.error('Database write error in /api/live/board (idle):', dbErr);
      }

      inMemoryFallback[boardId] = idlePayload;
      return NextResponse.json({ ok: true, state: idlePayload });
    }

    // 2. Aktives Spiel-Update mit sauberem Snapshot (kein Vermischen mit alten Spieldaten!)
    const payload: UnifiedLiveState = {
      ...data,
      boardId,
      sessionId,
      gameType: gameType as GameType,
      status: status as 'playing' | 'completed',
      updatedAt: now,
    };

    try {
      await sql`
        INSERT INTO board_live_sessions (board_id, session_id, game_type, status, payload, updated_at)
        VALUES (${boardId}, ${sessionId}, ${gameType}, ${status}, ${JSON.stringify(payload)}::jsonb, ${now})
        ON CONFLICT (board_id) DO UPDATE SET
          session_id = EXCLUDED.session_id,
          game_type = EXCLUDED.game_type,
          status = EXCLUDED.status,
          payload = EXCLUDED.payload,
          updated_at = EXCLUDED.updated_at;
      `;
    } catch (dbErr) {
      console.error('Database write error in /api/live/board:', dbErr);
    }

    inMemoryFallback[boardId] = payload;
    return NextResponse.json({ ok: true, state: payload });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Invalid payload' }, { status: 400 });
  }
}
