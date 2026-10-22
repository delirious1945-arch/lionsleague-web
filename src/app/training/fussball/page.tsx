import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getFussballHistoryAction } from './actions';
import FussballClient from './FussballClient';

export const metadata: Metadata = {
  title: 'Fußball (Soccer Darts) | Lions Weyhausen',
  description: 'Trainingsspiel Fußball: Erobere den Ball über Bull und versenke Tore über beliebige Doppel! 1vs1 oder gegen 5 Computer-Stufen.',
};

export const dynamic = 'force-dynamic';

export default async function FussballPage() {
  const [players, history] = await Promise.all([
    getPlayers(),
    getFussballHistoryAction(30),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <FussballClient players={players} initialHistory={history} />
    </main>
  );
}
