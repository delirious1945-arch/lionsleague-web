import React from 'react';
import EingabeClient from './EingabeClient';
import { getAvailableSeasons, getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import {
  DEFAULT_SPIELTAGE_DIR,
  scanDirectoryForSpieltage,
} from '@/lib/importSpieltag';

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

  const currentSeason = seasons.length > 0 ? seasons[0] : '2026/2027';
  const initialScannedSpieltage = await scanDirectoryForSpieltage(
    DEFAULT_SPIELTAGE_DIR,
    currentSeason
  );

  return (
    <div className="py-2">
      <EingabeClient
        players={players}
        availableSeasons={seasons}
        defaultRootDir={DEFAULT_SPIELTAGE_DIR}
        initialScannedSpieltage={initialScannedSpieltage}
      />
    </div>
  );
}
