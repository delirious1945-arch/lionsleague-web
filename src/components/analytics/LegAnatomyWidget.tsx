'use client';

import React from 'react';
import { LegAnatomy } from '@/lib/daeEngine';

interface LegAnatomyWidgetProps {
  anatomy: LegAnatomy;
}

export default function LegAnatomyWidget({ anatomy }: LegAnatomyWidgetProps) {
  const segments = [
    {
      label: 'Power-Scores (100+)',
      pct: anatomy.power_pct,
      color: '#A855F7',
      bg: 'bg-purple-500/20',
      text: 'text-purple-300',
      icon: '🟣',
      desc: '100er, 140er und 180er',
    },
    {
      label: 'Solide Basis (60–99)',
      pct: anatomy.solid_pct,
      color: '#00D4FF',
      bg: 'bg-cyan-500/20',
      text: 'text-cyan-300',
      icon: '🔵',
      desc: 'Solides Grundgerüst & Setup',
    },
    {
      label: 'Low Scores (< 60)',
      pct: anatomy.low_pct,
      color: '#64748B',
      bg: 'bg-slate-500/20',
      text: 'text-slate-300',
      icon: '⚪',
      desc: `Streuung & Fehlwürfe (inkl. ${anatomy.count_26}x 26er)`,
    },
    {
      label: 'Finish-Phase',
      pct: anatomy.finish_pct,
      color: '#10B981',
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-300',
      icon: '🟢',
      desc: 'Aufnahmen ab Visit 7+ zum Doppel',
    },
  ];

  return (
    <div className="bg-gradient-to-b from-[#091630] to-[#050c1e] border border-cyan-500/20 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-white/10 gap-2">
        <div>
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <span>🧬</span> Leg-Anatomie & Scoring Breakdown
          </h3>
          <p className="text-[11px] text-slate-400">
            Woraus setzen sich die Aufnahmen in den gespielten Legs zusammen?
          </p>
        </div>

        {/* 26er Warning Badge */}
        {anatomy.count_26 > 0 && (
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-1 text-center flex items-center gap-1.5 text-xs">
            <span>👑</span>
            <span className="text-amber-300 font-extrabold">{anatomy.count_26}x</span>
            <span className="text-slate-300">26er geworfen</span>
          </div>
        )}
      </div>

      {/* Stacked Multi-Bar */}
      <div className="mb-4">
        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-800/80 border border-white/10 shadow-inner">
          {segments.map((s) => (
            <div
              key={s.label}
              className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${s.pct}%`,
                backgroundColor: s.color,
                boxShadow: `0 0 10px ${s.color}66`,
              }}
              title={`${s.label}: ${s.pct.toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Grid of 4 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {segments.map((s) => (
          <div
            key={s.label}
            className="bg-white/[0.03] border border-white/5 rounded-xl p-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </div>
              <div className="text-[10px] text-slate-400 leading-tight">
                {s.desc}
              </div>
            </div>
            <div className={`text-xl font-black mt-2 ${s.text}`}>
              {s.pct.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
