import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getDartsGolfHistoryAction } from './actions';
import DartsGolfClient from './DartsGolfClient';

export const metadata: Metadata = {
  title: 'Lions Darts-Golf (18 Holes) | Lions Weyhausen',
  description:
    'Trainingsspiel Lions Darts-Golf: 18 Löcher mit Zufallsdistanzen, Overshoot-Mechanik (Überflug übers Grün) & PGA-Scorecard im 1vs1 oder gegen 4 Computer-Handicaps.',
};

export const dynamic = 'force-dynamic';

export default async function DartsGolfPage() {
  const [players, history, session] = await Promise.all([
    getPlayers(),
    getDartsGolfHistoryAction(30),
    getSessionAction(),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <DartsGolfClient players={players} initialHistory={history} currentUser={session} />
    </main>
  );
}
