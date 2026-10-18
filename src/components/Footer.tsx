'use client';

import React from 'react';
import { Shield, Zap } from 'lucide-react';
import CookieConsent from './CookieConsent';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Auf dem Einstiegs-Hub (pathname === '/' und mode !== 'ranking') blenden wir die Fußzeile aus
  const isHub = pathname === '/' && searchParams.get('mode') !== 'ranking';

  if (isHub) {
    return <CookieConsent />;
  }

  return (
    <>
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
          <div className="flex items-center justify-center gap-3 text-slate-400 text-[11px] pt-1">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-privacy-modal'))}
              className="hover:text-cyan-300 transition-colors underline cursor-pointer"
            >
              🛡️ Datenschutzerklärung & Cookie-Richtlinie (DSGVO)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('lions_cookie_consent');
                window.location.reload();
              }}
              className="hover:text-cyan-300 transition-colors underline cursor-pointer"
            >
              🍪 Cookie-Einstellungen
            </button>
          </div>
          <p className="text-[10px] text-slate-600 pt-1">
            © 2026 SC Weyhausen e.V. • Powered by Supabase & Next.js on Vercel
          </p>
        </div>
      </footer>
      <CookieConsent />
    </>
  );
}
