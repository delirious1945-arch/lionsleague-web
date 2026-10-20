'use client';

import React from 'react';
import { Shield, Zap } from 'lucide-react';
import CookieConsent from './CookieConsent';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Auf dem Einstiegs-Hub sowie im TV-Live-Modus blenden wir die normale Website-Fußzeile aus
  const isHub = pathname === '/' && searchParams.get('mode') !== 'ranking';
  const isTvLive = pathname.startsWith('/doppelquote/live') || pathname.startsWith('/training/live');

  if (isTvLive) {
    return null;
  }

  if (isHub) {
    return <CookieConsent />;
  }

  return <CookieConsent />;
}
