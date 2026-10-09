'use client';

import React from 'react';
import { DartsToWinEfficiency } from '@/lib/daeEngine';

interface DartsToWinWidgetProps {
  efficiency: DartsToWinEfficiency;
}

export default function DartsToWinWidget({ efficiency }: DartsToWinWidgetProps) {
  const categories = [
    {
      label: 'Elite-Zone (<= 18 Darts)',
      sub: 'Short Legs / High-End Highlight',
      color: '#00D4FF',
      bg: 'bg-cyan-500/20',
      border: 'border-cyan-400/40',
      text: 'text-cyan-300',
      icon: '🔥',
      data: efficiency.elite,
    },
    {
      label: 'Liga-Top (19 – 24 Darts)',
      sub: 'Absoluter Top-Wert für unsere Ligen',
      color: '#10B981',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-400/40',
      text: 'text-emerald-300',
      icon: '💎',
      data: efficiency.liga_top,
    },
    {
      label: 'Solide Liga-Norm (25 – 30 Darts)',
      sub: 'Das gewisse Normal / Standard-Legs',
      color: '#38BDF8',
      bg: 'bg-sky-500/20',
      border: 'border-sky-400/40',
      text: 'text-sky-300',
      icon: '🎯',
      data: efficiency.norm,
    },
    {
      label: 'Arbeits-Zone (31 – 42 Darts)',
      sub: 'Umkämpfte Ausdauer- & Kampf-Legs',
      color: '#F59E0B',
      bg: 'bg-amber-500/20',
      border: 'border-amber-400/40',
      text: 'text-amber-300',
      icon: '⏱️',
      data: efficiency.arbeit,
    },
    {
      label: 'Zitter-Zone (43+ Darts)',
      sub: 'Finish- & Doppel-Schwierigkeiten',
      color: '#EF4444',
      bg: 'bg-red-500/20',
      border: 'border-red-400/40',
      text: 'text-red-300',
      icon: '⏳',
      data: efficiency.zitter,
    },
  ];

  return (
    <div className="bg-gradient-to-b from-[#091630] to-[#050c1e] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/10 gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <span>⚡</span> Darts-to-Win Effizienz & Leg-Längen
          </h3>
          <p className="text-[11px] text-slate-400">
            Wie viele Darts werden benötigt, um ein Leg siegreich zu beenden?
          </p>
        </div>

        {/* Top Badges */}
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl px-3 py-1.5 text-center">
            <div className="text-[10px] text-cyan-300 uppercase font-black">Bestes Leg</div>
            <div className="text-sm font-black text-white">
              {efficiency.best_leg > 0 ? `${efficiency.best_leg} Darts` : '-'}
            </div>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl px-3 py-1.5 text-center">
            <div className="text-[10px] text-emerald-300 uppercase font-black">Ø Darts/Sieg</div>
            <div className="text-sm font-black text-white">
              {efficiency.avg_darts > 0 ? `${efficiency.avg_darts.toFixed(1)}` : '-'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bars List */}
      <div className="space-y-3">
        {categories.map((c) => (
          <div key={c.label} className="group">
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                  ({c.sub})
                </span>
              </div>
              <div className="font-extrabold flex items-center gap-2">
                <span className={c.text}>{c.data.count} Legs</span>
                <span className="text-slate-400 text-[11px]">
                  ({c.data.pct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Bar */}
            <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(c.data.pct, c.data.count > 0 ? 3 : 0)}%`,
                  backgroundColor: c.color,
                  boxShadow: `0 0 10px ${c.color}66`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span>Gewonnene Legs in der Wertung:</span>
        <span className="font-bold text-cyan-300">{efficiency.total_won_legs} Legs</span>
      </div>
    </div>
  );
}
