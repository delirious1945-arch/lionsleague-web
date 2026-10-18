'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Cookie, X, Check, ExternalLink, ChevronDown, ChevronUp, Lock } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    // Prüfen, ob bereits zugestimmt wurde
    const consent = localStorage.getItem('lions_cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }

    // Globaler Event Listener, um das Datenschutz-Modal über Links öffnen zu können
    const handleOpenPrivacy = () => setShowPrivacyModal(true);
    window.addEventListener('open-privacy-modal', handleOpenPrivacy);
    return () => window.removeEventListener('open-privacy-modal', handleOpenPrivacy);
  }, []);

  const acceptAll = () => {
    localStorage.setItem('lions_cookie_consent', JSON.stringify({
      necessary: true,
      functional: true,
      analytics: false,
      timestamp: new Date().toISOString(),
    }));
    setShowBanner(false);
  };

  const acceptEssentialOnly = () => {
    localStorage.setItem('lions_cookie_consent', JSON.stringify({
      necessary: true,
      functional: false,
      analytics: false,
      timestamp: new Date().toISOString(),
    }));
    setShowBanner(false);
  };

  return (
    <>
      {/* ========================================================= */}
      {/* COOKIE-CONSENT BANNER (Unten fixiert) */}
      {/* ========================================================= */}
      {showBanner && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-slideUp">
          <div className="max-w-4xl mx-auto bg-[#0a1329]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl p-4 sm:p-6 shadow-2xl shadow-cyan-950/80 text-white space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400">
                  <Cookie className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                    Datenschutz & Cookie-Einstellungen
                    <span className="text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                      DSGVO & TDDDG
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Wir nutzen für das Portal von <strong>Lions Weyhausen</strong> ausschließlich technisch notwendige Cookies zur Sitzungsverwaltung (Login) sowie funktionale Speicherungen für deine Ansichts-Einstellungen.
                  </p>
                </div>
              </div>
            </div>

            {/* Aufklappbare Details */}
            {showDetails && (
              <div className="pt-3 border-t border-white/10 space-y-3 text-xs animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Notwendige Cookies */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        Technisch notwendig
                      </span>
                      <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                        Immer aktiv
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Cookie: <code className="text-cyan-300">lions_session</code>. Speichert dein verschlüsseltes Authentifizierungs-Token zur Autorisierung im Mitgliederbereich (§ 25 Abs. 2 TDDDG, Art. 6 Abs. 1 lit. f DSGVO).
                    </p>
                  </div>

                  {/* Funktionale Einstellungen */}
                  <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        Funktionale Einstellungen
                      </span>
                      <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded border border-cyan-500/30">
                        Komfort
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      LocalStorage: Speichert deine Cookie-Zustimmung und Rollen-Filter (z.B. Admin-/Spieler-Umschaltung) lokal auf deinem Gerät.
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                  🛡️ <strong>Keine Tracking-Cookies:</strong> Es werden keine Drittanbieter-Werbenetzwerke, Analyse-Tracker oder Marketing-Cookies eingesetzt. Deine Daten verbleiben geschützt auf europäischen Servern.
                </div>
              </div>
            )}

            {/* Buttons & Links */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-cyan-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
                >
                  {showDetails ? (
                    <>
                      <span>Details schließen</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>Details & Cookies ansehen</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-xs text-slate-400 hover:text-cyan-300 underline transition-colors"
                >
                  Datenschutzerklärung
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={acceptEssentialOnly}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
                >
                  Nur notwendige
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 border border-cyan-400/40 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Alle akzeptieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VOLLSTÄNDIGES DATENSCHUTZ-MODAL (DSGVO-Verordnung) */}
      {/* ========================================================= */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-3xl w-full bg-[#070e20] border border-cyan-500/40 rounded-2xl shadow-2xl p-5 sm:p-8 text-slate-200 space-y-6 max-h-[90vh] overflow-y-auto animate-scaleUp">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    Datenschutzerklärung & Cookie-Richtlinie
                  </h2>
                  <p className="text-xs text-slate-400">
                    Gemäß Art. 13, 14 DSGVO und § 25 TDDDG
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                title="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gesetzliche Pflichtangaben */}
            <div className="space-y-5 text-xs sm:text-sm leading-relaxed text-slate-300">
              {/* 1. Verantwortlicher */}
              <section className="bg-white/[0.02] p-4 rounded-xl border border-white/5 space-y-1.5">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>🏢</span> 1. Verantwortliche Stelle
                </h4>
                <p>
                  <strong>Sportclub Weyhausen von 1921 e.V.</strong><br />
                  Sparte Dartsport („Lions Weyhausen“)<br />
                  Kirchweg 1, 38554 Weyhausen<br />
                  Spartenleiter: <strong>Sebastian Kirste</strong><br />
                  E-Mail: <code className="text-cyan-300">sebastian.kirste@sc-weyhausen.de</code>
                </p>
              </section>

              {/* 2. Zweck & Rechtsgrundlage */}
              <section className="space-y-2">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>⚖️</span> 2. Zweck und Rechtsgrundlage der Datenverarbeitung
                </h4>
                <p>
                  Die Webseite <strong>lionsweyhausen.vercel.app</strong> dient als geschlossenes Vereins- und Leistungsdiagnostik-Portal für die Dartsparte des SC Weyhausen e.V.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li>
                    <strong>Sitzungsverwaltung & Authentifizierung:</strong> Zur Bereitstellung des geschützten Mitglieder- und Admin-Bereichs verarbeiten wir Benutzername, Rolle, Mannschaftszugehörigkeit sowie gehashte Zugangsdaten (Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO).
                  </li>
                  <li>
                    <strong>Sportliche Leistungsdaten:</strong> Erfassung von Liga-Spielberichten, Wurfstatistiken (Visits, Averages, 180er, Checkouts) zur automatisierten Ermittlung der Vereinsrangliste und Trainingsanalysen (Rechtsgrundlage: Vereinsmitgliedschaft gem. Art. 6 Abs. 1 lit. b DSGVO).
                  </li>
                </ul>
              </section>

              {/* 3. Einsatz von Cookies & TDDDG */}
              <section className="space-y-2 bg-cyan-950/20 p-4 rounded-xl border border-cyan-500/20">
                <h4 className="text-sm font-extrabold text-cyan-300 flex items-center gap-2">
                  <span>🍪</span> 3. Cookies & Technische Speicherungen (§ 25 TDDDG)
                </h4>
                <p className="text-xs">
                  Wir setzen ausschließlich Technologien ein, die für den Betrieb des Portals zwingend erforderlich sind:
                </p>
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400">
                        <th className="py-1.5 px-2">Name</th>
                        <th className="py-1.5 px-2">Typ</th>
                        <th className="py-1.5 px-2">Dauer</th>
                        <th className="py-1.5 px-2">Zweck</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-2 px-2 font-mono text-cyan-300">lions_session</td>
                        <td className="py-2 px-2">HTTP-Cookie</td>
                        <td className="py-2 px-2">30 Tage</td>
                        <td className="py-2 px-2">Zwingend erforderliches Sitzungstoken (Login-Status)</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-mono text-cyan-300">lions_cookie_consent</td>
                        <td className="py-2 px-2">LocalStorage</td>
                        <td className="py-2 px-2">Dauerhaft</td>
                        <td className="py-2 px-2">Speichert den Status deiner Datenschutz-Zustimmung</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 font-mono text-cyan-300">lions_role_mode</td>
                        <td className="py-2 px-2">LocalStorage</td>
                        <td className="py-2 px-2">Dauerhaft</td>
                        <td className="py-2 px-2">Speichert deine aktive Ansicht (Admin/Spieler-Modus)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Hosting & Server */}
              <section className="space-y-1.5">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>☁️</span> 4. Hosting & Auftragsverarbeitung
                </h4>
                <p className="text-xs text-slate-400">
                  Die Website wird auf der Serverless-Plattform <strong>Vercel Inc.</strong> sowie einer europäischen PostgreSQL-Datenbank (<strong>Supabase</strong>, Region Frankfurt am Main / Deutschland) gehostet. Es besteht ein Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO.
                </p>
              </section>

              {/* 5. Betroffenenrechte */}
              <section className="space-y-1.5">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>📜</span> 5. Deine Rechte als Vereinsmitglied
                </h4>
                <p className="text-xs text-slate-400">
                  Du hast jederzeit das Recht auf <strong>Auskunft</strong> (Art. 15 DSGVO), <strong>Berichtigung</strong> (Art. 16 DSGVO), <strong>Löschung</strong> (Art. 17 DSGVO) sowie <strong>Widerruf</strong> deiner Einwilligungen. Wende dich hierzu einfach direkt an den Spartenleiter.
                </p>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Stand: Oktober 2026 • SC Weyhausen von 1921 e.V.
              </span>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                Verstanden & Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
