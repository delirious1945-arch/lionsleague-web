import React from 'react';
import AnalyticsClient from './AnalyticsClient';
import {
  getAnalyticsMatches,
  getAvailableSeasons,
  getPlayers,
  getTop26Players,
  getAllAnalyticsLegVisits,
} from '@/lib/data';
import { getSessionAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  const params = await searchParams;
  const seasons = await getAvailableSeasons();

  const selectedSeason = params.season || (seasons.length > 0 ? seasons[0] : '2026/2027');

  const [matches, players, top26, allLegVisits] = await Promise.all([
    getAnalyticsMatches(selectedSeason),
    getPlayers(),
    getTop26Players(selectedSeason),
    getAllAnalyticsLegVisits(selectedSeason),
  ]);

  return (
    <div className="py-2">
      <AnalyticsClient
        matches={matches}
        players={players}
        top26={top26}
        allLegVisits={allLegVisits}
        availableSeasons={seasons}
        selectedSeason={selectedSeason}
      />
    </div>
  );
}
