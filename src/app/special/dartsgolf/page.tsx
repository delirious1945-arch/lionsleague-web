import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import DartsGolfClient from './DartsGolfClient';
import DartGolfArenaContainer from '@/components/DartGolfArenaContainer';

export const metadata: Metadata = {
  title: 'Lions Darts-Golf (18 Holes) | Lions Weyhausen',
  description:
    'Event-Dartspiel Lions Darts-Golf (18 Holes) – Zufallsdistanzen, 0–180 Numpad & Überflug-Regel',
};

export const dynamic = 'force-dynamic';

export default async function SpecialDartsGolfPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen bg-[#07120e] text-slate-100">
      <DartGolfArenaContainer players={players} currentUser={session} />
    </main>
  );
}
