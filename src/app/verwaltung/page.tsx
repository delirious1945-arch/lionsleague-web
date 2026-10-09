import React from 'react';
import VerwaltungClient from './VerwaltungClient';
import { getAllMatches, getPlayers } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function VerwaltungPage() {
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
