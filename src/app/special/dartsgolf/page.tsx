import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import DartsGolfClient from './DartsGolfClient';

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
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <DartsGolfClient players={players} currentUser={session} />
    </main>
  );
}
