import React from 'react';
import { getSessionAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import TrainingSelectionClient from './TrainingSelectionClient';
import { getLotteryDataAction } from '@/app/actions/lotteryActions';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const session = await getSessionAction();
  if (!session) {
    redirect('/');
  }

  const lotteryData = await getLotteryDataAction();

  return (
    <TrainingSelectionClient
      user={session}
      monthProgress={lotteryData.monthProgress}
      bannerWinner={lotteryData.bannerWinner}
    />
  );
}

