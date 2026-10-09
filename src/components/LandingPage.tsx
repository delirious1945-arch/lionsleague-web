'use client';

import React, { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loginAction, firstLoginPasswordChangeAction } from '@/app/actions';

export default function LandingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // First login password setup state
  const [pendingPwChange, setPendingPwChange] = useState(false);
  const [pendingPlayerId, setPendingPlayerId] = useState<number | null>(null);
  const [pendingPlayerName, setPendingPlayerName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    startTransition(async () => {
      const res = await loginAction(username, password);

      if (res.requiresPasswordChange && res.playerId) {
        setPendingPwChange(true);
        setPendingPlayerId(res.playerId);
        setPendingPlayerName(res.name || username);
      } else if (res.success) {
        router.refresh();
      } else {
        setErrorMessage(
          res.error ||
            'Ungültiger Name oder Passwort. Bei Erstanmeldung nutze bitte deinen Vor- und Nachnamen und das Einmal-Passwort "Lions2026".'
        );
      }
    });
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPlayerId) return;
    setErrorMessage('');

    startTransition(async () => {
      const res = await firstLoginPasswordChangeAction(
        pendingPlayerId,
        newPassword,
        confirmPassword
      );

      if (res.success) {
        router.refresh();
      } else {
        setErrorMessage(res.error || 'Fehler beim Speichern des neuen Passworts.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#050811] flex flex-col justify-between p-4 sm:p-8 text-slate-100">
      {/* Centered 2-Column Container */}
      <div className="flex-1 flex items-center justify-center my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand & Logo */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-48 h-48 sm:w-56 sm:h-56">
              <Image
                src="/logo.png"
                alt="Lions Weyhausen Logo"
                width={224}
                height={224}
                priority
                className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(37,99,235,0.45)] drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-cyan-500/15 text-cyan-300 border border-cyan-400/40 mb-3 shadow-[0_0_12px_rgba(0,212,255,0.25)]">
                <span>🟢</span> LIONS 2.0
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-wider drop-shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                LIONS LEAGUE
              </h1>
              <p className="text-xs sm:text-sm font-extrabold text-blue-400 tracking-wider uppercase mt-1">
                SC WEYHAUSEN VON 1921 E.V.
                <br />
                SPARTE DARTSPORT
              </p>
              <p className="text-xs text-slate-400 mt-2 font-medium">
                Geschlossenes Mitgliederportal
              </p>
            </div>
          </div>

          {/* Right Column: Login Card / Password Change Card */}
          <div className="bg-[#0b101d]/95 backdrop-blur-xl border border-blue-500/35 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80 shadow-[0_0_35px_rgba(37,99,235,0.18)]">
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs sm:text-sm font-semibold animate-fadeIn">
                ⚠️ {errorMessage}
              </div>
            )}

            {pendingPwChange ? (
              /* Erstanmeldung: Neues Passwort festlegen */
              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div className="text-center pb-2 border-b border-white/10">
                  <h2 className="text-lg font-bold text-cyan-300 flex items-center justify-center gap-2">
                    <span>🔑</span> Erstanmeldung für {pendingPlayerName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Bitte lege jetzt dein persönliches Passwort fest.
                  </p>
                </div>

                <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                  <div className="font-bold text-cyan-300 mb-1">Passwort-Regularien:</div>
                  <div>• Mindestens <strong>10 Zeichen</strong> lang</div>
                  <div>• Mindestens <strong>eine Zahl</strong> (0–9)</div>
                  <div>• Mindestens <strong>ein Sonderzeichen</strong> (!, ?, @, #, $, -, _)</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Neues persönliches Passwort
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindestens 10 Zeichen..."
                    className="w-full bg-slate-900/90 border border-white/20 focus:border-cyan-400 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Passwort wiederholen
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort erneut eingeben..."
                    className="w-full bg-slate-900/90 border border-white/20 focus:border-cyan-400 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {isPending ? 'Speichere Passwort...' : '💾 Passwort speichern & Anmelden'}
                </button>
              </form>
            ) : (
              /* Reguläres Login-Formular */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="text-center pb-2 border-b border-white/10">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center justify-center gap-2">
                    <span>🔒</span> Mitglieder Login
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Zugang nur für autorisierte Spartenmitglieder
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Benutzername / Name
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Vor- und Nachname (oder Admin)"
                    className="w-full bg-slate-900/90 border border-white/20 focus:border-cyan-400 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Passwort / PIN
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900/90 border border-white/20 focus:border-cyan-400 text-white rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black py-3.5 rounded-xl text-base transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer mt-2"
                >
                  {isPending ? 'Wird angemeldet...' : '🚀 Anmelden'}
                </button>

                <p className="text-center text-[11px] text-slate-500 pt-1">
                  Erstanmeldung? Nutze deinen Namen & das Passwort{' '}
                  <code className="text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded font-mono">
                    Lions2026
                  </code>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-[11px] sm:text-xs text-slate-500 mt-6 pt-4 border-t border-white/5 max-w-4xl mx-auto w-full">
        © 2026 Sportclub Weyhausen von 1921 e.V. • Sparte Darts • Spartenleiter: Sebastian Kirste (
        <a
          href="mailto:sebastian.kirste@sc-weyhausen.de"
          className="text-cyan-400 hover:underline"
        >
          sebastian.kirste@sc-weyhausen.de
        </a>
        )
      </footer>
    </div>
  );
}
