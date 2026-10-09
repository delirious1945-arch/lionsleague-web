'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function LigaClient() {
  const [activeTab, setActiveTab] = useState<'A-Team' | 'B-Team'>('A-Team');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Version 2.0 Badge */}
      <div className="flex items-center justify-between text-xs pb-1">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors font-semibold"
        >
          <span>←</span> Zurück zum Dashboard
        </Link>
        <span className="text-[10px] font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/30 px-2 py-0.5 rounded font-mono">
          VERSION 2.0
        </span>
      </div>

      {/* Title */}
      <div className="pb-4 border-b border-white/10">

        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span>🏆</span> Liga-Tabellen & Staffeln
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Offizielle Tabellen der 2. Kreisklasse Staffel 07 (A-Team) und Staffel 11 (B-Team).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('A-Team')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'A-Team'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🦁</span> A-Team (Staffel 07)
        </button>

        <button
          onClick={() => setActiveTab('B-Team')}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'B-Team'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50 shadow-lg shadow-blue-500/20'
              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        >
          <span>🐯</span> B-Team (Staffel 11)
        </button>
      </div>

      {activeTab === 'A-Team' && (
        <div className="bg-gradient-to-b from-[#0a1836] to-[#060e20] border-2 border-cyan-500/50 rounded-2xl p-8 text-center space-y-6 shadow-2xl shadow-cyan-500/10">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 mb-3">
              2. Kreisklasse Staffel 07
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              🦁 Lions Weyhausen A (Staffel 07)
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Offizielle Tabellen, Statistiken und Bestleistungen aus dem <strong>3K Darts Portal</strong>.
              Wähle die gewünschte Ansicht im Verbandsportal:
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1343/table"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-slate-950 font-black px-6 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/30 hover:scale-[1.02]"
            >
              <span>📊</span> Tabelle öffnen
            </a>

            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1343/statistics/statistics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/60 text-cyan-300 font-bold px-6 py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
            >
              <span>🎯</span> Rangliste & Averages
            </a>

            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1343/performances"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/60 text-amber-300 font-bold px-6 py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
            >
              <span>⭐</span> Bestleistungen & Specials
            </a>
          </div>
        </div>
      )}

      {activeTab === 'B-Team' && (
        <div className="bg-gradient-to-b from-[#091734] to-[#050d1e] border-2 border-blue-500/50 rounded-2xl p-8 text-center space-y-6 shadow-2xl shadow-blue-500/10">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 mb-3">
              2. Kreisklasse Staffel 11
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              🐯 Lions Weyhausen B (Staffel 11)
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto">
              Offizielle Tabellen, Statistiken und Bestleistungen aus dem <strong>3K Darts Portal</strong>.
              Wähle die gewünschte Ansicht im Verbandsportal:
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1347/table"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black px-6 py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/30 hover:scale-[1.02]"
            >
              <span>📊</span> Tabelle öffnen
            </a>

            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1347/statistics/statistics"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/60 text-blue-300 font-bold px-6 py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
            >
              <span>🎯</span> Rangliste & Averages
            </a>

            <a
              href="https://portal.3k-darts.com/frontend/events/10/event/1347/performances"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/60 text-amber-300 font-bold px-6 py-3.5 rounded-xl text-sm transition-all hover:scale-[1.02]"
            >
              <span>⭐</span> Bestleistungen & Specials
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
