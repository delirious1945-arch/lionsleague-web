import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface StellenCheckenLiveState {
  status: 'idle' | 'playing' | 'completed';
  sessionId?: string;
  boardId?: string;
  gameMode?: 'solo' | '1vs1';
  p1Name?: string;
  p2Name?: string;
  activePlayer?: 1 | 2;
  currentVisit?: number;
  totalVisits?: number;
  currentNumber?: number;
  recommendedRoute?: string;
  p1Checks?: number;
  p1Points?: number;
  p2Checks?: number;
  p2Points?: number;
  presetId?: number;
  historyP1?: any[];
  historyP2?: any[];
  updatedAt?: number;
}

const defaultState = (boardId: string, sessionId?: string): StellenCheckenLiveState => ({
  status: 'idle',
  sessionId: sessionId || 'idle',
  boardId,
  currentVisit: 1,
  totalVisits: 15,
  currentNumber: 64,
  recommendedRoute: 'T16 ➔ D8',
  p1Checks: 0,
  p1Points: 0,
  p2Checks: 0,
  p2Points: 0,
  presetId: 1,
  updatedAt: Date.now(),
});

const inMemoryFallback: Record<string, StellenCheckenLiveState> = {
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
        const ageMs = Date.now() - Number(row.updated_at);

        if (ageMs > 60 * 60 * 1000 || row.status === 'idle' || row.game_type !== 'stellen_checken') {
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
      console.error('Database read error in /api/live/stellen-checken:', dbErr);
    }

    const state = inMemoryFallback[boardId] || defaultState(boardId);
    return NextResponse.json(state, {
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
    const now = Date.now();

    if (data.status === 'idle' || data.reset === true) {
      const idlePayload = { ...defaultState(boardId, sessionId), updatedAt: now };
      inMemoryFallback[boardId] = idlePayload;
      return NextResponse.json({ ok: true, state: idlePayload });
    }

    const payload: StellenCheckenLiveState = {
      ...data,
      boardId,
      sessionId,
      updatedAt: now,
    };

    inMemoryFallback[boardId] = payload;
    return NextResponse.json({ ok: true, state: payload });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Invalid payload' }, { status: 400 });
  }
}
