import React from 'react';
import TeamsClient from './TeamsClient';
import {
  getAvailableSeasons,
  getDashboardData,
  getPlayers,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAvailableSeasons();
  const selectedSeason = params.season || (seasons.length > 0 ? seasons[0] : '2026/2027');

  const allPlayers = await getPlayers();
  const dashboardData = await getDashboardData(selectedSeason);

  // Map leaderboard stats to all registered players
  const playerStatsMap = new Map(
    dashboardData.leaderboard.map((entry) => [entry.player_name, entry])
  );

  const formatPlayerCard = (p: { id: number; name: string; team: string }) => {
    const stats = playerStatsMap.get(p.name);
    return {
      id: p.id,
      name: p.name,
      team: p.team,
      matches: stats?.match_count || 0,
      rating: stats?.final_rating || 0,
      avgTotal: stats?.avg_total || 0,
      wins: stats?.wins || 0,
      legsWon: stats?.legs_won || 0,
      legsLost: stats?.legs_lost || 0,
    };
  };

  const aTeamPlayers = allPlayers
    .filter((p) => p.team === 'A-Team')
    .map(formatPlayerCard);

  const bTeamPlayers = allPlayers
    .filter((p) => p.team === 'B-Team')
    .map(formatPlayerCard);

  return (
    <div className="py-2">
      <TeamsClient
        aTeamPlayers={aTeamPlayers}
        bTeamPlayers={bTeamPlayers}
        selectedSeason={selectedSeason}
        availableSeasons={seasons}
      />
    </div>
  );
}
