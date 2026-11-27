import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { canAccessSpecialArena } from '@/lib/session';
import { getPlayers } from '@/lib/data';
import AdventskalenderClient from './AdventskalenderClient';

export const metadata: Metadata = {
  title: 'Der verflixte Adventskalender | Lions Weyhausen',
  description: 'Event-Dartspiel Der verflixte Adventskalender – 24 Türchen mit Punkten, Schilden, Grinch & Flüchen',
};

export const dynamic = 'force-dynamic';

export default async function AdventskalenderPage() {
  const session = await getSessionAction();
  if (!session || !canAccessSpecialArena(session)) {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <div className="-mx-2 sm:-mx-6 -my-3 sm:-my-4 min-h-[calc(100vh-64px)] bg-[#080c0a] text-[#f7f0df]">
      <AdventskalenderClient players={players} currentUser={session} />
    </div>
  );
}
