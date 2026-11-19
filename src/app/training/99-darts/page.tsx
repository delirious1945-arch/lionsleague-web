import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getDarts99HistoryAction } from './actions';
import Darts99Client from './Darts99Client';

export const metadata: Metadata = {
  title: '99 Darts Challenge (20 / 19 / 18) | Lions Weyhausen',
  description:
    'Trainingsspiel 99 Darts Challenge: 33 Aufnahmen à 3 Darts auf Zielzahl 20, 19 oder 18. Single = 1 Pkt, Double = 2 Pkt, Triple = 3 Pkt (max. 297 Punkte). Solo oder 1 vs. 1 Duell.',
};

export const dynamic = 'force-dynamic';

export default async function Darts99Page() {
  const [players, history, session] = await Promise.all([
    getPlayers(),
    getDarts99HistoryAction(30),
    getSessionAction(),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <Darts99Client players={players} initialHistory={history} currentUser={session} />
    </main>
  );
}
