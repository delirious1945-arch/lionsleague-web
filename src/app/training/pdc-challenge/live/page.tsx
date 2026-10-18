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
  const initialDataAll = !initialDataToday.hasTodayData
    ? await getLivePdcRankingAction('all')
    : null;

  return (
    <PdcLiveClient
      initialData={initialDataToday.hasTodayData ? initialDataToday : (initialDataAll || initialDataToday)}
      initialFilter={initialDataToday.hasTodayData ? 'today' : 'all'}
    />
  );
}
