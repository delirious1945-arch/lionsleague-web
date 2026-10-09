import React from 'react';
import EingabeClient from './EingabeClient';
import { getAvailableSeasons, getPlayers } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function EingabePage() {
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
