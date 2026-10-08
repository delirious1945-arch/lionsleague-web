import React from 'react';
import { DashboardKPIs } from '@/lib/data';
import { getShortName } from '@/lib/scoring';
import { Target, Flame, CheckCircle, Zap, Users } from 'lucide-react';

interface KPIBoxesProps {
  kpis: DashboardKPIs;
}

export default function KPIBoxes({ kpis }: KPIBoxesProps) {
  const items = [
    {
      tag: 'HIGHEST AVERAGE',
      sub: getShortName(kpis.highest_avg.player),
      val: `Ø ${kpis.highest_avg.value ? kpis.highest_avg.value.toFixed(1) : '0.0'}`,
      icon: Target,
      color: 'text-cyan-400',
    },
    {
      tag: 'MEISTE 180er',
      sub: getShortName(kpis.most_180s.player),
      val: kpis.most_180s.count,
      icon: Flame,
      color: 'text-amber-400',
    },
    {
      tag: 'HIGH FINISH',
      sub: getShortName(kpis.highest_finish.player),
      val: kpis.highest_finish.value || 0,
      icon: CheckCircle,
      color: 'text-emerald-400',
    },
    {
      tag: 'SHORT GAME',
      sub: getShortName(kpis.best_short_game.player),
      val: kpis.best_short_game.count,
      icon: Zap,
      color: 'text-blue-400',
    },
    {
      tag: 'BESTES DOPPEL',
      sub: kpis.best_double.pair,
      val: `Ø ${kpis.best_double.avg ? kpis.best_double.avg.toFixed(1) : '0.0'}`,
      icon: Users,
      color: 'text-indigo-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="lions-card p-3.5 flex items-center justify-between"
          >
            <div className="min-w-0 pr-2">
              <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500 mb-0.5">
                {item.tag}
              </div>
              <div
                className="text-xs font-semibold text-slate-300 truncate"
                title={item.sub}
              >
                {item.sub}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-black text-white">{item.val}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
