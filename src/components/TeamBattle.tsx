import React from 'react';
import { TeamBattleStats } from '@/lib/data';
import { Swords, Sparkles } from 'lucide-react';

interface TeamBattleProps {
  stats: TeamBattleStats;
}

export default function TeamBattle({ stats }: TeamBattleProps) {
  const getPercentages = (valA: number, valB: number) => {
    const total = valA + valB;
    if (total === 0) return { pctA: 50, pctB: 50 };
    const pctA = Math.round((valA / total) * 100);
    const pctB = 100 - pctA;
    return { pctA, pctB };
  };

  interface RowItem {
    label: string;
    valA: string | number;
    valB: string | number;
    pctA: number;
    pctB: number;
    sub?: boolean;
    highlight?: boolean;
  }

  const rows: RowItem[] = [
    {
      label: 'Gesamt-Average',
      valA: stats.avg_a.toFixed(1),
      valB: stats.avg_b.toFixed(1),
      ...getPercentages(stats.avg_a, stats.avg_b),
    },
    {
      label: 'Durchschnitts-Average 9 Darts',
      valA: stats.avg9_a.toFixed(1),
      valB: stats.avg9_b.toFixed(1),
      ...getPercentages(stats.avg9_a, stats.avg9_b),
    },
    {
      label: 'Durchschnitts-Average 18 Darts',
      valA: stats.avg18_a.toFixed(1),
      valB: stats.avg18_b.toFixed(1),
      ...getPercentages(stats.avg18_a, stats.avg18_b),
    },
    {
      label: 'Anzahl High Finish',
      valA: stats.hf_a,
      valB: stats.hf_b,
      ...getPercentages(stats.hf_a, stats.hf_b),
    },
    {
      label: 'Specials',
      valA: stats.specials_a,
      valB: stats.specials_b,
      ...getPercentages(stats.specials_a, stats.specials_b),
    },
    {
      label: 'Gewonnene Sets',
      valA: stats.sets_won_a,
      valB: stats.sets_won_b,
      ...getPercentages(stats.sets_won_a, stats.sets_won_b),
      highlight: true,
    },
    {
      label: '↳ Gewonnene Legs (Single)',
      valA: stats.single_legs_a,
      valB: stats.single_legs_b,
      ...getPercentages(stats.single_legs_a, stats.single_legs_b),
      sub: true,
    },
    {
      label: '↳ Gewonnene Legs (Doppel)',
      valA: stats.double_legs_a,
      valB: stats.double_legs_b,
      ...getPercentages(stats.double_legs_a, stats.double_legs_b),
      sub: true,
    },
    {
      label: 'Gewonnene Legs Gesamt',
      valA: stats.total_legs_a,
      valB: stats.total_legs_b,
      ...getPercentages(stats.total_legs_a, stats.total_legs_b),
      highlight: true,
    },
  ];

  return (
    <div className="space-y-4" id="teambattle">
      {/* Main Battle Card */}
      <div className="lions-card p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-black tracking-wider uppercase text-white">
              Team Battle
            </span>
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Vergleich
          </span>
        </div>

        {/* Team Pills */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-extrabold text-xs text-center tracking-wide">
            🦁 A-Team
          </div>
          <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">
            VS
          </span>
          <div className="flex-1 py-1.5 px-3 rounded-xl bg-slate-400/10 border border-slate-400/25 text-slate-200 font-extrabold text-xs text-center tracking-wide">
            🐯 B-Team
          </div>
        </div>

        {/* Stats Rows & Progress Bars */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-blue-400 font-extrabold w-12 text-left">
                  {row.valA}
                </span>
                <span
                  className={`text-center flex-1 truncate px-2 ${
                    row.sub
                      ? 'text-[11px] text-slate-400 font-medium'
                      : row.highlight
                      ? 'text-white font-extrabold'
                      : 'text-slate-300'
                  }`}
                >
                  {row.label}
                </span>
                <span className="text-slate-200 font-extrabold w-12 text-right">
                  {row.valB}
                </span>
              </div>

              {/* Dual Bar */}
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden flex gap-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-l-full transition-all duration-500"
                  style={{ width: `${row.pctA}%` }}
                />
                <div
                  className="h-full bg-gradient-to-r from-slate-400 to-slate-200 rounded-r-full transition-all duration-500"
                  style={{ width: `${row.pctB}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Highlights Box */}
      <div className="lions-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-black tracking-wider uppercase text-white">
            Saison Highlights
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Specials Gesamt (Einzel & Doppel)
              </div>
              <div className="text-sm font-black text-white mt-0.5">
                {stats.specials_a + stats.specials_b} Specials
              </div>
            </div>
            <span className="text-amber-400 font-bold">🎯</span>
          </div>
        </div>
      </div>
    </div>
  );
}
