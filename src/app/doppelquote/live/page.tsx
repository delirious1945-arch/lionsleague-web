import React from 'react';
import { getLiveDoppelquoteRankingAction } from '../actions';
import DoppelquoteLiveClient from './DoppelquoteLiveClient';

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
