import React from 'react';
import Podium from '@/components/Podium';
import TeamBattle from '@/components/TeamBattle';
import KingsOf26 from '@/components/KingsOf26';
import LeaderboardCard from '@/components/LeaderboardCard';
import KPIBoxes from '@/components/KPIBoxes';
import DetailedMatrixTable from '@/components/DetailedMatrixTable';
import { getDashboardData } from '@/lib/data';
import { getSessionAction } from './actions';

interface PageProps {
  searchParams: Promise<{ season?: string }>;
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  const resolvedParams = await searchParams;
  const currentSeason = resolvedParams.season || '2026/2027';

  const data = await getDashboardData(currentSeason);


  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Sub-Header Banner */}
      <div className="lions-card px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-black tracking-wider uppercase text-white flex items-center gap-2">
            <span>🎯</span> Liga Dashboard
          </span>
          <span className="text-xs font-semibold text-slate-400">
            • Gesamtwertung & Team-Statistiken
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded font-mono">
            VERSION 2.0
          </span>
          <span className="text-[11px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
            Saison {currentSeason}
          </span>
        </div>
      </div>

      {/* 3-Column Grid (1:1 Layout wie im Streamlit Mockup) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Spalte 1: Team Battle & Saison Highlights */}
        <div className="lg:col-span-4">
          <TeamBattle stats={data.teamBattle} />
        </div>

        {/* Spalte 2: Top 3 Podium & 26er Könige */}
        <div className="lg:col-span-4 space-y-4">
          <Podium topMonth={data.topMonth} />
          <KingsOf26 top26={data.top26} />
        </div>

        {/* Spalte 3: Rangliste mit Schnellsuche */}
        <div className="lg:col-span-4">
          <LeaderboardCard leaderboard={data.leaderboard} />
        </div>
      </div>

      {/* 5 Full-Width KPI Summary Boxes */}
      <div className="pt-1">
        <KPIBoxes kpis={data.kpis} />
      </div>

      {/* Vollständige Punkteaufschlüsselung (Matrix Table) */}
      <DetailedMatrixTable leaderboard={data.leaderboard} />
    </div>
  );
}
