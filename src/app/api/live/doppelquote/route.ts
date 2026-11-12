import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface BoardLiveState {
  status: 'idle' | 'playing' | 'completed';
  gameMode?: 'solo' | '1vs1';
  p1Name?: string;
  p2Name?: string;
  activePlayer?: 1 | 2;
  currentTarget?: string;
  currentTargetIndex?: number;
  currentRound?: number;
  p1Stats?: { hits: number; thrown: number; quote: number };
  p2Stats?: { hits: number; thrown: number; quote: number };
  lastHits?: number | null;
  scoresP1?: Record<string, (number | null)[]>;
  scoresP2?: Record<string, (number | null)[]>;
  boardId?: string;
  updatedAt?: number;
}

// In-Memory Speicher für alle 5 Boards (Board 1 bis 5)
const defaultState = (boardId: string): BoardLiveState => ({
  status: 'idle',
  boardId,
  updatedAt: Date.now(),
});

const boardsState: Record<string, BoardLiveState> = {
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

    // Falls das Board noch nicht initialisiert ist
    if (!boardsState[boardId]) {
      boardsState[boardId] = defaultState(boardId);
    }

    const state = boardsState[boardId];

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

    if (!boardsState[boardId]) {
      boardsState[boardId] = defaultState(boardId);
    }

    // Wenn reset oder idle geschickt wird
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
