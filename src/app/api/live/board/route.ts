import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export type GameType = 'idle' | 'doppelquote' | 'pdc_challenge' | 'fussball' | 'stellen_checken';

export interface UnifiedLiveState {
  boardId: string;
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

const defaultState = (boardId: string): UnifiedLiveState => ({
  boardId,
  status: 'idle',
  gameType: 'idle',
  gameTitle: 'Warte auf Spielbeginn...',
  scoreP1: 0,
  scoreP2: 0,
  updatedAt: Date.now(),
});

const boardsState: Record<string, UnifiedLiveState> = {
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
