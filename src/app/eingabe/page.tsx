import React from 'react';
import EingabeClient from './EingabeClient';
import { getAvailableSeasons, getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';


export const dynamic = 'force-dynamic';

export default async function EingabePage() {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  const [players, seasons] = await Promise.all([

    getPlayers(),
    getAvailableSeasons(),
  ]);

  return (
    <div className="py-2">
      <EingabeClient players={players} availableSeasons={seasons} />
    </div>
  );
}
