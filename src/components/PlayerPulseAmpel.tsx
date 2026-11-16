'use client';

import React from 'react';
import Link from 'next/link';
import type { AmpelColumnData, KeyFactCardData, TrafficLight } from '@/lib/playerKeyFacts';

const LIGHT_STYLES: Record<
  TrafficLight,
  {
    columnBorder: string;
    columnBg: string;
    headerBorder: string;
    badge: string;
    dotText: string;
    emoji: string;
  }
> = {
  green: {
    columnBorder: 'border-emerald-400/45',
    columnBg: 'from-emerald-950/25 via-[#091630] to-[#050c1e]',
    headerBorder: 'border-emerald-400/20',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40',
    dotText: 'text-emerald-300',
    emoji: '🟢',
  },
  yellow: {
    columnBorder: 'border-amber-400/40',
    columnBg: 'from-amber-950/20 via-[#091630] to-[#050c1e]',
    headerBorder: 'border-amber-400/20',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-400/40',
    dotText: 'text-amber-300',
    emoji: '🟡',
  },
  red: {
    columnBorder: 'border-red-500/50',
    columnBg: 'from-red-950/25 via-[#091630] to-[#050c1e]',
    headerBorder: 'border-red-500/25',
    badge: 'bg-red-500/20 text-red-300 border border-red-500/40',
    dotText: 'text-red-300',
    emoji: '🔴',
  },
};

function TrafficLightDots({ active }: { active: TrafficLight }) {
  return (
    <div
      className="flex items-center gap-1 bg-black/50 border border-white/10 rounded-full px-2 py-1"
      aria-label={`Ampelstatus: ${active}`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          active === 'red'
            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.95)] scale-110'
            : 'bg-red-950/70 border border-red-900/40'
        }`}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          active === 'yellow'
            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)] scale-110'
            : 'bg-amber-950/70 border border-amber-900/40'
        }`}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full transition-all ${
          active === 'green'
            ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.95)] scale-110'
            : 'bg-emerald-950/70 border border-emerald-900/40'
        }`}
      />
    </div>
  );
}

function KeyFactCard({ fact }: { fact: KeyFactCardData }) {
  const st = LIGHT_STYLES[fact.status];

  return (
    <div className="bg-black/25 border border-white/10 rounded-xl p-3.5 flex flex-col justify-between gap-2.5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>{fact.icon}</span>
            <span>
              {fact.number}. {fact.label}
            </span>
          </span>
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap ${st.badge}`}>
            {st.emoji} {fact.badgeText}
          </span>
        </div>

        <div className="text-base sm:text-lg font-black text-white leading-snug">
          {fact.headline}
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">{fact.detail}</p>
      </div>

      {fact.actionHref && fact.actionLabel && (
        <Link
          href={fact.actionHref}
          className="mt-1 inline-flex items-center justify-center w-full min-h-[42px] px-3 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-200 hover:text-white font-extrabold text-xs transition-all"
        >
          {fact.actionLabel}
        </Link>
      )}
    </div>
  );
}

export default function PlayerPulseAmpel({
  playerName,
  columns,
  sourceNote,
}: {
  playerName: string;
  columns: [AmpelColumnData, AmpelColumnData, AmpelColumnData];
  sourceNote?: string;
}) {
  return (
    <section className="bg-[#071022] border border-cyan-500/25 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Kopfzeile mit Gesamt-Ampel-Überblick */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <span>🚦</span>
            <span>6 Key Facts & Leistungs-Ampel für {playerName}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {sourceNote ||
              'Kanalisierte Auswertung aus Liga-Einzeln, neuen 100%-Doppel-Werferdaten und Trainingsmodulen.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {columns.map((col) => {
            const st = LIGHT_STYLES[col.status];
            return (
              <span
                key={col.id}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${st.badge}`}
              >
                <span>{st.emoji}</span>
                <span>{col.title.replace(/^\d+\.\s*/, '')}:</span>
                <span className="font-black">{col.statusLabel}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* 3-Säulen-Ampelsystem */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((col) => {
          const st = LIGHT_STYLES[col.status];
          return (
            <div
              key={col.id}
              className={`bg-gradient-to-b ${st.columnBg} border ${st.columnBorder} rounded-2xl p-4 flex flex-col gap-3 shadow-lg`}
            >
              {/* Säulen-Header */}
              <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${st.headerBorder}`}>
                <div>
                  <h4 className="text-sm font-black text-white">{col.title}</h4>
                  <p className="text-[11px] text-slate-400">{col.subtitle}</p>
                </div>
                <TrafficLightDots active={col.status} />
              </div>

              {/* 2 Key Facts pro Säule */}
              <div className="flex flex-col gap-3 flex-1 justify-between">
                <KeyFactCard fact={col.facts[0]} />
                <KeyFactCard fact={col.facts[1]} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
