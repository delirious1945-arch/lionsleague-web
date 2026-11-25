import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import DartsRallyClient from './DartsRallyClient';

export const metadata: Metadata = {
  title: 'Darts Rally (1000-Punkte-Staffel) | Lions Weyhausen',
  description: 'Highspeed Board-vs-Board Team-Eilrennen mit Items und Flüchen',
};

export const dynamic = 'force-dynamic';

export default async function DartsRallyPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <DartsRallyClient players={players} currentUser={session} />
    </main>
  );
}
