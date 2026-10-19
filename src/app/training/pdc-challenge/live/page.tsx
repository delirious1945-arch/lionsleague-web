import React from 'react';
import { Metadata } from 'next';
import { getLivePdcRankingAction } from '../actions';
import PdcLiveClient from './PdcLiveClient';

export const metadata: Metadata = {
  title: 'PDC Challenge Live-Board | Lions Weyhausen',
  description: 'Offizielles TV Live-Board für die 57-Darts PDC Challenge des SC Weyhausen Dartsport',
};

export const dynamic = 'force-dynamic';

export default async function PdcLivePage() {
  const initialDataToday = await getLivePdcRankingAction('today');
  let initialData = initialDataToday;
  let initialFilter: 'today' | 'month' | 'all' = 'today';

  if (!initialDataToday.hasTodayData) {
    if (initialDataToday.hasMonthData) {
      initialData = await getLivePdcRankingAction('month');
      initialFilter = 'month';
    } else {
      initialData = await getLivePdcRankingAction('all');
      initialFilter = 'all';
    }
  }

  return (
    <PdcLiveClient
      initialData={initialData}
      initialFilter={initialFilter}
    />
  );
}
