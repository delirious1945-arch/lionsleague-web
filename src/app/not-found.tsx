import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-6 text-slate-100">
      <div className="max-w-md w-full bg-[#0b101d] border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-black/80 space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src="/logo.png"
            alt="Lions Weyhausen"
            width={96}
            height={96}
            className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 mb-3">
            <span>🎯</span> 404 – Fehlwurf
          </div>
          <h2 className="text-xl font-black text-white tracking-wide">
            Seite nicht gefunden
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            Diese Seite oder Route existiert nicht auf der Lions Weyhausen Dartsport-Plattform.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-block w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg shadow-emerald-600/30"
          >
            🏠 Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
