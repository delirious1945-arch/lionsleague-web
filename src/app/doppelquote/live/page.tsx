import React from 'react';
import { Metadata } from 'next';
import { getLiveDoppelquoteRankingAction } from '../actions';
import DoppelquoteLiveClient from './DoppelquoteLiveClient';

export const metadata: Metadata = {
  title: 'Checkout Battle Live-Board | Lions Weyhausen',
  description: 'Offizielles TV Live-Board für das Doppelquoten Checkout Battle des SC Weyhausen Dartsport',
};

export const dynamic = 'force-dynamic';

export default async function DoppelquoteLivePage() {
  // Initiales Laden serverseitig (standardmäßig 'today' oder fallback auf 'all' falls heute leer)
  const initialDataToday = await getLiveDoppelquoteRankingAction('today');
  const initialDataAll = !initialDataToday.hasTodayData
    ? await getLiveDoppelquoteRankingAction('all')
    : null;

  return (
    <DoppelquoteLiveClient
      initialData={initialDataToday.hasTodayData ? initialDataToday : (initialDataAll || initialDataToday)}
      initialFilter={initialDataToday.hasTodayData ? 'today' : 'all'}
    />
  );
}
