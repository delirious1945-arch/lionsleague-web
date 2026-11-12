import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-Memory Live State Cache für Realtime-Sync zwischen Tablet und TV-Monitor
let liveDoppelquoteState: {
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
  updatedAt?: number;
} = {
  status: 'idle',
  updatedAt: Date.now(),
};

export async function GET() {
  return NextResponse.json(liveDoppelquoteState, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    },
  });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    liveDoppelquoteState = {
      ...liveDoppelquoteState,
      ...data,
      updatedAt: Date.now(),
    };
    return NextResponse.json({ ok: true, state: liveDoppelquoteState });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Invalid payload' }, { status: 400 });
  }
}
