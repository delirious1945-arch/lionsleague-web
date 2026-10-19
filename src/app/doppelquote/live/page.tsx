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
  const initialDataToday = await getLiveDoppelquoteRankingAction('today');
  let initialData = initialDataToday;
  let initialFilter: 'today' | 'month' | 'all' = 'today';

  if (!initialDataToday.hasTodayData) {
    if (initialDataToday.hasMonthData) {
      initialData = await getLiveDoppelquoteRankingAction('month');
      initialFilter = 'month';
    } else {
      initialData = await getLiveDoppelquoteRankingAction('all');
      initialFilter = 'all';
    }
  }

  return (
    <DoppelquoteLiveClient
      initialData={initialData}
      initialFilter={initialFilter}
    />
  );
}
