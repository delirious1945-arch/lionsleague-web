import React from 'react';
import { getSessionAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import TrainingSelectionClient from './TrainingSelectionClient';
import { getLotteryDataAction } from '@/app/actions/lotteryActions';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function TrainingPage({ searchParams }: PageProps) {
  const session = await getSessionAction();
  if (!session) {
    redirect('/');
  }

  const params = await searchParams;
  const initialBoard = params?.board || null;
  const lotteryData = await getLotteryDataAction();

  return (
    <TrainingSelectionClient
      user={session}
      initialBoard={initialBoard}
      monthProgress={lotteryData.monthProgress}
      bannerWinner={lotteryData.bannerWinner}
    />
  );
}
