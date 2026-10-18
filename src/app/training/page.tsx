import React from 'react';
import { getSessionAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import TrainingSelectionClient from './TrainingSelectionClient';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
  const session = await getSessionAction();
  if (!session) {
    redirect('/');
  }

  return <TrainingSelectionClient user={session} />;
}
