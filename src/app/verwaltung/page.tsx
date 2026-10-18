import React from 'react';
import VerwaltungClient from './VerwaltungClient';
import { getAllMatches, getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function VerwaltungPage() {
  const session = await getSessionAction();
  if (!session) {
    redirect('/');
  }
  if (session.role !== 'admin') {
    redirect('/?mode=ranking');
  }

  const [matches, players] = await Promise.all([

    getAllMatches(),
    getPlayers(),
  ]);

  return (
    <div className="py-2">
      <VerwaltungClient matches={matches} players={players} />
    </div>
  );
}
