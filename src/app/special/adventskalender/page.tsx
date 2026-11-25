import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import AdventskalenderClient from './AdventskalenderClient';

export const metadata: Metadata = {
  title: 'Der verhexte Adventskalender | Lions Weyhausen',
  description: 'Event-Dartspiel Der verhexte Adventskalender – 12 Türchen mit Schoko, Grinch & Flüchen',
};

export const dynamic = 'force-dynamic';

export default async function AdventskalenderPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <AdventskalenderClient players={players} currentUser={session} />
    </main>
  );
}
