import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface FussballLiveState {
  status: 'idle' | 'playing' | 'completed';
  sessionId?: string;
  boardId?: string;
  gameMode?: 'bot' | '1vs1' | '1vsComputer' | 'solo';
  p1Name?: string;
  p2Name?: string;
  activePlayer?: 1 | 2;
  ballPossession?: 1 | 2;
  scoreP1?: number;
  scoreP2?: number;
  targetGoals?: number;
  currentAction?: string;
  activeTarget?: string;
  roundNumber?: number;
  lastEvent?: string;
  fussballStats?: any;
  winner?: string;
  updatedAt?: number;
}

const defaultState = (boardId: string, sessionId?: string): FussballLiveState => ({
  status: 'idle',
  sessionId: sessionId || 'idle',
  boardId,
  scoreP1: 0,
  scoreP2: 0,
  targetGoals: 5,
  ballPossession: 1,
  activePlayer: 1,
  currentAction: 'Anstoß',
  activeTarget: 'D20',
  roundNumber: 1,
  updatedAt: Date.now(),
});

const inMemoryFallback: Record<string, FussballLiveState> = {
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

        if (ageMs > 60 * 60 * 1000 || row.status === 'idle' || row.game_type !== 'fussball') {
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
      console.error('Database read error in /api/live/fussball:', dbErr);
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

    const payload: FussballLiveState = {
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
