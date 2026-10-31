import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getStellenCheckenHistoryAction } from './actions';
import StellenCheckenClient from './StellenCheckenClient';

export const metadata: Metadata = {
  title: 'Stellen & Checken (3–101) | Lions Weyhausen',
  description: 'Trainingsspiel Stellen & Checken: 15 Aufnahmen aus 200 Zufalls-Reihenfolgen (3 bis 101 Punkte). Solo oder 1 vs. 1 Duell.',
};

export const dynamic = 'force-dynamic';

export default async function StellenCheckenPage() {
  const [players, history, session] = await Promise.all([
    getPlayers(),
    getStellenCheckenHistoryAction(30),
    getSessionAction(),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <StellenCheckenClient players={players} initialHistory={history} currentUser={session} />
    </main>
  );
}
