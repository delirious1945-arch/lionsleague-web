import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface StellenCheckenLiveState {
  status: 'idle' | 'playing' | 'completed';
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

const defaultState = (boardId: string): StellenCheckenLiveState => ({
  status: 'idle',
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

const boardsState: Record<string, StellenCheckenLiveState> = {
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

    if (!boardsState[boardId]) {
      boardsState[boardId] = defaultState(boardId);
    }

    return NextResponse.json(boardsState[boardId], {
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

    if (!boardsState[boardId]) {
      boardsState[boardId] = defaultState(boardId);
    }

    if (data.status === 'idle' || data.reset === true) {
      boardsState[boardId] = defaultState(boardId);
    } else {
      boardsState[boardId] = {
        ...boardsState[boardId],
        ...data,
        boardId,
        updatedAt: Date.now(),
      };
    }

    return NextResponse.json({ ok: true, state: boardsState[boardId] });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Invalid payload' }, { status: 400 });
  }
}
