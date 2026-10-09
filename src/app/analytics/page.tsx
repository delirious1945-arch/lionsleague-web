import React from 'react';
import AnalyticsClient from './AnalyticsClient';
import {
  getAnalyticsMatches,
  getAvailableSeasons,
  getPlayers,
  getTop26Players,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAvailableSeasons();
  const selectedSeason = params.season || (seasons.length > 0 ? seasons[0] : '2026/2027');

  const [matches, players, top26] = await Promise.all([
    getAnalyticsMatches(selectedSeason),
    getPlayers(),
    getTop26Players(selectedSeason),
  ]);

  return (
    <div className="py-2">
      <AnalyticsClient
        matches={matches}
        players={players}
        top26={top26}
        availableSeasons={seasons}
        selectedSeason={selectedSeason}
      />
    </div>
  );
}
