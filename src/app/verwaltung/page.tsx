import React from 'react';
import VerwaltungClient from './VerwaltungClient';
import { getAllMatches, getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getTrainingHistoryAction } from '@/app/doppelquote/actions';
import { getPdcChallengeHistoryAction } from '@/app/training/pdc-challenge/actions';
import { getFussballHistoryAction } from '@/app/training/fussball/actions';
import { getStellenCheckenHistoryAction } from '@/app/training/stellen-checken/actions';
import { getScoringLeiterHistoryAction } from '@/app/training/scoring-leiter/actions';
import { getDarts99HistoryAction } from '@/app/training/99-darts/actions';
import { getDartsGolfHistoryAction } from '@/app/training/dartsgolf/actions';
import { getBiomechanicsHistoryAction } from '@/app/video/actions';
import { getAdminTrainingOverviewData } from '@/lib/trainingLottery';
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

  const [
    matches,
    players,
    trainingDoubles,
    trainingPdc,
    trainingFussball,
    trainingStellenChecken,
    trainingScoringLeiter,
    trainingDarts99,
    trainingDartsgolf,
    trainingBiomechanics,
    adminTrainingOverview,
  ] = await Promise.all([
    getAllMatches(),
    getPlayers(),
    getTrainingHistoryAction(100),
    getPdcChallengeHistoryAction(100),
    getFussballHistoryAction(100),
    getStellenCheckenHistoryAction(100),
    getScoringLeiterHistoryAction(100),
    getDarts99HistoryAction(100),
    getDartsGolfHistoryAction(100),
    getBiomechanicsHistoryAction(100),
    getAdminTrainingOverviewData(),
  ]);

  return (
    <div className="py-2">
      <VerwaltungClient
        matches={matches}
        players={players}
        trainingDoubles={trainingDoubles}
        trainingPdc={trainingPdc}
        trainingFussball={trainingFussball}
        trainingStellenChecken={trainingStellenChecken}
        trainingScoringLeiter={trainingScoringLeiter}
        trainingDarts99={trainingDarts99}
        trainingDartsgolf={trainingDartsgolf}
        trainingBiomechanics={trainingBiomechanics}
        adminTrainingOverview={adminTrainingOverview}
      />
    </div>
  );
}
