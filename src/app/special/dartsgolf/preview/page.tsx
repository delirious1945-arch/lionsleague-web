import React from 'react';
import { Metadata } from 'next';
import { getSessionAction } from '@/app/actions';
import { getPlayers } from '@/lib/data';
import DartGolfArenaContainer from '@/components/DartGolfArenaContainer';

export const metadata: Metadata = {
  title: 'Darts-Golf (UI Monitor & Tablet Test) | Darts Fun Arena',
  description: 'Lokale Vorschau für Darts-Golf Monitor & Tablet UI',
};

export const dynamic = 'force-dynamic';

export default async function DartGolfPreviewPage() {
  const [session, players] = await Promise.all([getSessionAction(), getPlayers()]);

  return (
    <main className="min-h-screen bg-[#07120e]">
      <DartGolfArenaContainer players={players} currentUser={session} />
    </main>
  );
}
