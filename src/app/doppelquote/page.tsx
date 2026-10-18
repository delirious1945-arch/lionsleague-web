import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getTrainingHistoryAction } from './actions';
import DoppelquoteClient from './DoppelquoteClient';

export const metadata: Metadata = {
  title: 'LionsDarts Doppelquote | Lions League',
  description: 'Offizielle Doppelquote-Trainingsapp des SC Weyhausen Dartsport (D20, D10, D16, D8, D4)',
};

export const dynamic = 'force-dynamic';

export default async function DoppelquotePage() {
  const players = await getPlayers();
  const history = await getTrainingHistoryAction(50);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <DoppelquoteClient players={players} initialHistory={history} />
    </main>
  );
}
