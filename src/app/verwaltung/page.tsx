import React from 'react';
import VerwaltungClient from './VerwaltungClient';
import { getAllMatches, getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getTrainingHistoryAction } from '@/app/doppelquote/actions';
import { getPdcChallengeHistoryAction } from '@/app/training/pdc-challenge/actions';
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

  const [matches, players, trainingDoubles, trainingPdc] = await Promise.all([
    getAllMatches(),
    getPlayers(),
    getTrainingHistoryAction(100),
    getPdcChallengeHistoryAction(100),
  ]);

  return (
    <div className="py-2">
      <VerwaltungClient
        matches={matches}
        players={players}
        trainingDoubles={trainingDoubles}
        trainingPdc={trainingPdc}
      />
    </div>
  );
}
