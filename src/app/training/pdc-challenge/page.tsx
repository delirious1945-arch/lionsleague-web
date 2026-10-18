import { Metadata } from 'next';
import { getPlayers } from '@/lib/data';
import { getSessionAction } from '@/app/actions';
import { getPdcChallengeHistoryAction, getLivePdcRankingAction } from './actions';
import PdcChallengeClient from './PdcChallengeClient';

export const metadata: Metadata = {
  title: 'PDC Challenge | Lions League',
  description: 'Offizielles PDC / JDC 57-Darts Leistungsabzeichen Training des SC Weyhausen Dartsport',
};

export const dynamic = 'force-dynamic';

export default async function PdcChallengePage() {
  const [players, history, liveRanking, session] = await Promise.all([
    getPlayers(),
    getPdcChallengeHistoryAction(50),
    getLivePdcRankingAction('all'),
    getSessionAction(),
  ]);

  return (
    <main className="min-h-screen py-4 sm:py-6 bg-[#050811] text-slate-100">
      <PdcChallengeClient
        players={players}
        initialHistory={history}
        initialLeaderboard={liveRanking.leaderboard}
        user={session}
      />
    </main>
  );
}
