import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getScoringLeiterHistoryAction } from './actions';
import ScoringLeiterClient from './ScoringLeiterClient';

export const metadata: Metadata = {
  title: 'Scoring-Leiter (41–140) | Lions Weyhausen',
  description: 'Trainingsspiel Scoring-Leiter: 7 Stufen (41, 60, 65, 80, 100, 120, 140), je 10 Aufnahmen Zeit für 2 Treffer. Solo oder 1 vs. 1 Duell.',
};

export const dynamic = 'force-dynamic';

export default async function ScoringLeiterPage() {
  const [players, history, session] = await Promise.all([
    getPlayers(),
    getScoringLeiterHistoryAction(30),
    getSessionAction(),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <ScoringLeiterClient players={players} initialHistory={history} currentUser={session} />
    </main>
  );
}
