import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import BingoClient from './BingoClient';

export const metadata: Metadata = {
  title: 'Weihnachts-Bingo | Lions Weyhausen',
  description: 'Event-Dartspiel Weihnachts-Bingo – 3x3 Matrix mit goldenem Lions-Stempel & BINGO!-Buzzer',
};

export const dynamic = 'force-dynamic';

export default async function BingoPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <BingoClient players={players} currentUser={session} />
    </main>
  );
}
