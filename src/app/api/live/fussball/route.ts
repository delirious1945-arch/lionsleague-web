import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface FussballLiveState {
  status: 'idle' | 'playing' | 'completed';
  boardId?: string;
  gameMode?: 'bot' | '1vs1';
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
  winner?: string;
  updatedAt?: number;
}

const defaultState = (boardId: string): FussballLiveState => ({
  status: 'idle',
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

const boardsState: Record<string, FussballLiveState> = {
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
