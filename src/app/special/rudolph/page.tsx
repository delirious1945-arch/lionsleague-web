import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import RudolphClient from './RudolphClient';

export const metadata: Metadata = {
  title: 'Rudolphs Flug nach Weyhausen | Lions Weyhausen',
  description: 'Event-Dartspiel Rudolphs Flug nach Weyhausen – 5 Checkpoints bis zur Lions-Landebahn',
};

export const dynamic = 'force-dynamic';

export default async function RudolphPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <RudolphClient players={players} currentUser={session} />
    </main>
  );
}
