import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionAction } from '@/app/actions';
import { getPlayers } from '@/lib/data';
import TannenbaumClient from './TannenbaumClient';

export const metadata: Metadata = {
  title: 'Lions Tannenbaum | Lions Weyhausen',
  description: 'Event-Dartspiel Lions Tannenbaum – Christbaumkugeln & Stern-Finale',
};

export const dynamic = 'force-dynamic';

export default async function TannenbaumPage() {
  const session = await getSessionAction();
  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const players = await getPlayers();

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <TannenbaumClient players={players} currentUser={session} />
    </main>
  );
}
