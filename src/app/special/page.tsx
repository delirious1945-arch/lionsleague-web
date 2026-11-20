import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import SpecialHubClient from './SpecialHubClient';

export const metadata: Metadata = {
  title: 'Geheim-Arena | Lions Weyhausen',
  description: 'Geschützter Admin-Bereich',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function SpecialHubPage({ searchParams }: PageProps) {
  const session = await getSessionAction();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const resolvedParams = await searchParams;
  return (
    <SpecialHubClient
      user={session}
      initialBoard={resolvedParams.board ?? null}
    />
  );
}
