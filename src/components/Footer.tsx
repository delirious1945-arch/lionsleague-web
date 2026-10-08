import React from 'react';
import { Shield, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/5 py-8 text-center text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 text-slate-400 font-bold">
          <span>🦁 Lions Weyhausen</span>
          <span>•</span>
          <span>SC Weyhausen von 1921 e.V.</span>
          <span>•</span>
          <span className="text-blue-400 font-black flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> V2.0 High-Speed
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Spartenleiter: Sebastian Kirste (<code>sebastian.kirste@sc-weyhausen.de</code>)
        </p>
        <p className="text-[10px] text-slate-600">
          © 2026 SC Weyhausen e.V. • Powered by Supabase & Next.js on Vercel
        </p>
      </div>
    </footer>
  );
}
