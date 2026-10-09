'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Anwendungsfehler abgefangen:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-[#0b101d] border border-blue-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-black/80 space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src="/logo.png"
            alt="Lions Weyhausen"
            width={96}
            height={96}
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(37,99,235,0.4)]"
          />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-3">
            <span>⚡</span> Verbindungs-Hinweis
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            Seite konnte nicht geladen werden
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Die Datenbankverbindung wurde möglicherweise kurzzeitig neu aufgebaut oder die Sitzung ist abgelaufen.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            🔄 Erneut versuchen
          </button>
          <button
            onClick={() => {
              window.location.href = '/';
            }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 font-bold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer"
          >
            🏠 Zum Portal
          </button>
        </div>
      </div>
    </div>
  );
}
