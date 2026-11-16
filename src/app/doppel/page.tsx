import React from 'react';
import DoppelClient from './DoppelClient';
import {
  getAllDoublesMatches,
  getAllMatches,
  getAvailableSeasons,
  getDoublesSpecials,
  getPlayers,
  getSettings,
} from '@/lib/data';
import { analyzeDoublesMatches } from '@/lib/doublesAnalytics';
import { getSessionAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function DoppelPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; team?: string; player?: string }>;
}) {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  const params = await searchParams;
  const seasons = await getAvailableSeasons();
  const selectedSeason =
    params.season || (seasons.length > 0 ? seasons[0] : '2026/2027');

  const [players, doublesMatches, singleMatches, doublesSpecials, settings] =
    await Promise.all([
      getPlayers(),
      getAllDoublesMatches(selectedSeason),
      getAllMatches(selectedSeason),
      getDoublesSpecials(selectedSeason),
      getSettings(),
    ]);

  const playersTeamMap: Record<string, string> = {};
  for (const p of players) {
    playersTeamMap[p.name.normalize('NFC').trim().toLowerCase()] = p.team;
  }

  const { analyzedMatches, throwerLeaderboard, pairSummaries } =
    analyzeDoublesMatches({
      doublesMatches,
      singleMatches,
      doublesSpecials,
      playersTeamMap,
      settings,
    });

  return (
    <div className="py-2">
      <DoppelClient
        analyzedMatches={analyzedMatches}
        throwerLeaderboard={throwerLeaderboard}
        pairSummaries={pairSummaries}
        players={players.filter(
          (p) => p.team === 'A-Team' || p.team === 'B-Team'
        )}
        availableSeasons={seasons}
        selectedSeason={selectedSeason}
        loggedInPlayerName={session.name}
        initialTeamFilter={params.team}
        initialPlayerFilter={params.player}
      />
    </div>
  );
}
