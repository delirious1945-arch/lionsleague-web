import React from 'react';
import PlayerClient from './PlayerClient';
import {
  getAllMatches,
  getAvailableSeasons,
  getDoublesSpecials,
  getPlayers,
  getSettings,
} from '@/lib/data';
import { calculateMatchPerformance } from '@/lib/scoring';

export const dynamic = 'force-dynamic';

export default async function SpielerPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;
  const seasons = await getAvailableSeasons();
  const selectedSeason = params.season || (seasons.length > 0 ? seasons[0] : '2026/2027');

  const [players, matches, doubles, settings] = await Promise.all([
    getPlayers(),
    getAllMatches(selectedSeason),
    getDoublesSpecials(selectedSeason),
    getSettings(),
  ]);

  // Matches by player name
  const matchesByPlayer: Record<
    string,
    {
      id: number;
      match_date: string;
      opponent: string;
      legs_won: number;
      legs_lost: number;
      is_win: boolean;
      rating: number;
      avg_total: number;
      avg_9: number;
      avg_18: number;
      specials_count: number;
      scores_total: number;
      high_finish: number;
    }[]
  > = {};

  for (const m of matches) {
    const perf = calculateMatchPerformance(
      {
        legs_won: m.legs_won,
        legs_lost: m.legs_lost,
        avg_total: m.avg_total,
        avg_9: m.avg_9,
        avg_18: m.avg_18,
        scores_80: m.scores_80,
        scores_100: m.scores_100,
        scores_140: m.scores_140,
        scores_180: m.scores_180,
        specials_count: m.specials_count,
      },
      settings
    );

    const scoresTotal =
      m.scores_80 + m.scores_100 + m.scores_140 + m.scores_180;

    const formattedDate = m.match_date
      ? new Date(m.match_date).toLocaleDateString('de-DE')
      : '';

    const item = {
      id: m.id,
      match_date: formattedDate || m.match_date,
      opponent: m.opponent,
      legs_won: m.legs_won,
      legs_lost: m.legs_lost,
      is_win: m.legs_won > m.legs_lost,
      rating: perf.base_rating,
      avg_total: m.avg_total,
      avg_9: m.avg_9,
      avg_18: m.avg_18,
      specials_count: m.specials_count,
      scores_total: scoresTotal,
      high_finish: m.high_finishes,
    };

    if (!matchesByPlayer[m.player_name]) {
      matchesByPlayer[m.player_name] = [];
    }
    matchesByPlayer[m.player_name].push(item);
  }

  // Doubles by player
  const doublesByPlayer: Record<
    string,
    {
      id: number;
      match_date: string;
      special_type: string;
      partner_name: string;
      opponent_team: string;
      description: string;
    }[]
  > = {};

  for (const d of doubles) {
    const formattedDate = d.match_date
      ? new Date(d.match_date).toLocaleDateString('de-DE')
      : '';
    const item = {
      id: d.id,
      match_date: formattedDate || d.match_date,
      special_type: d.special_type,
      partner_name: d.partner_name,
      opponent_team: d.opponent_team,
      description: d.description,
    };

    if (!doublesByPlayer[d.player_name]) {
      doublesByPlayer[d.player_name] = [];
    }
    doublesByPlayer[d.player_name].push(item);
  }

  return (
    <div className="py-2">
      <PlayerClient
        players={players}
        matchesByPlayer={matchesByPlayer}
        doublesByPlayer={doublesByPlayer}
        availableSeasons={seasons}
        selectedSeason={selectedSeason}
      />
    </div>
  );
}
