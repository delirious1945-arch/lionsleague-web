import React from 'react';
import { Metadata } from 'next';
import { getSessionAction } from '@/app/actions';
import { redirect } from 'next/navigation';
import VideoAnalyzerClient from './VideoAnalyzerClient';

export const metadata: Metadata = {
  title: 'Video-Wurfstilanalyse | Lions Weyhausen',
  description: '100% On-Device KI-Wurfanalyse, Biomechanik und Release-Diagnostik für Spieler des SC Weyhausen',
};

export const dynamic = 'force-dynamic';

export default async function VideoPage() {
  const session = await getSessionAction();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  return <VideoAnalyzerClient user={session} />;
}
