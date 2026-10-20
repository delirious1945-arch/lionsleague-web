'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserSession } from '@/app/actions';
import {
  Settings,
  Sun,
  Moon,
  Tv,
  Trophy,
  Target,
  ArrowLeft,
  Check,
  Monitor,
  Maximize2,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Eye,
} from 'lucide-react';

interface EinstellungenClientProps {
  user?: UserSession | null;
}

export default function EinstellungenClient({ user }: EinstellungenClientProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isLandscapeLocked, setIsLandscapeLocked] = useState<boolean>(false);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lions_theme') as 'dark' | 'light' | null;
      if (savedTheme === 'light') {
        setTheme('light');
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        setTheme('dark');
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
  }, []);

  const handleSelectTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    try {
      localStorage.setItem('lions_theme', newTheme);
      document.cookie = `lions_theme=${newTheme}; path=/; max-age=31536000`;
      if (newTheme === 'light') {
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
  };

  const handleToggleFullscreenLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        // Versuche Screen Orientation auf Querformat zu sperren
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
          setIsLandscapeLocked(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
          setIsLandscapeLocked(false);
        }
      }
    } catch (err) {
      console.warn('Orientation lock / Fullscreen nicht unterstützt:', err);
      // Fallback: Toggle CSS class on document
      const isForced = document.documentElement.classList.toggle('monitor-landscape-force');
      setIsLandscapeLocked(isForced);
    }
  };

  const openLivePopup = (url: string, title: string) => {
    if (typeof window === 'undefined') return;
    const w = 1280;
    const h = 720;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    window.open(
      url,
      title,
      `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=yes, copyhistory=no, width=${w}, height=${h}, top=${top}, left=${left}`
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zur Startseite</span>
          </button>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-amber-400" /> System-Einstellungen
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Einstellungen & Modi
            </h1>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-400">
          Angemeldet als: <strong className="text-white">{user?.name || 'Gast'}</strong>
        </div>
      </div>

      {/* SEKTION 1: SCHNELLWAHL DER BEREICHE (RANKING ODER TRAINING) */}
      <div className="space-y-3">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
            Bereich auswählen
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Wohin möchtest du wechseln?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Karte 1: Ranking */}
          <Link
            href="/?mode=ranking"
            className="group p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500/10 via-slate-900/90 to-amber-950/20 border-2 border-amber-500/30 hover:border-amber-400 shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.25)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center mb-3">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                Ranking-System
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Offizielle Liga-Rangliste, Spielerprofile, Spieltags-Matrix, Team-Statistiken & DAE Analytics.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Jetzt zum Ranking</span>
              <span>→</span>
            </div>
          </Link>

          {/* Karte 2: Training */}
          <Link
            href="/training"
            className="group p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-cyan-500/10 via-slate-900/90 to-cyan-950/20 border-2 border-cyan-500/30 hover:border-cyan-400 shadow-xl hover:shadow-[0_0_25px_rgba(0,212,255,0.25)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/40 flex items-center justify-center mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-cyan-300 transition-colors">
                Trainingsmodus
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                PDC 57-Darts Challenge (Leistungsabzeichen), Doppelquote-Training & interaktive Oche Live-Boards.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-black text-cyan-400 group-hover:translate-x-1 transition-transform">
              <span>Jetzt zum Training</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* SEKTION 2: ERSCHEINUNGSBILD (HELL- & DUNKELMODUS) */}
      <div className="space-y-3 pt-2">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Erscheinungsbild
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Design & Kontrast (Hell- / Dunkelmodus)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Jeder Spieler kann hier sein bevorzugtes Farbschema für sein Endgerät / Tablet auswählen.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Dunkelmodus */}
          <div
            onClick={() => handleSelectTheme('dark')}
            className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden ${
              theme === 'dark'
                ? 'bg-slate-900 border-amber-400 shadow-xl shadow-amber-500/20 ring-4 ring-amber-400/20'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
                <Moon className="w-6 h-6" />
              </div>
              {theme === 'dark' && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                  <Check className="w-3.5 h-3.5" />
                  Aktiviert
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white">
              Dunkelmodus (Standard / Darts-Night)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Dunkler High-Contrast Hintergrund. Optimal für Vereinsräume, Darts-Boards und akkuschonende Nutzung.
            </p>
          </div>

          {/* Hellmodus */}
          <div
            onClick={() => handleSelectTheme('light')}
            className={`p-5 sm:p-6 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden ${
              theme === 'light'
                ? 'bg-white border-amber-500 shadow-xl shadow-amber-500/20 ring-4 ring-amber-400/30 text-slate-950'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
                <Sun className="w-6 h-6" />
              </div>
              {theme === 'light' && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                  <Check className="w-3.5 h-3.5" />
                  Aktiviert
                </span>
              )}
            </div>
            <h3 className={`text-lg font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
              Hellmodus (Light Theme)
            </h3>
            <p className={`text-xs mt-1 leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              Heller Hintergrund mit dunkler Typografie. Ideal bei hellem Tageslicht oder hoher Umgebungshelligkeit.
            </p>
          </div>
        </div>

        {/* Info-Box Masteransicht */}
        <div className="bg-slate-900/90 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <strong className="text-sm font-black text-amber-300 block">
              🔒 Masteransicht bleibt dauerhaft dunkel
            </strong>
            <p className="text-slate-300 leading-relaxed">
              Gemäß den Vereins- und Wettkampfrichtlinien bleibt die <strong>Masteransicht</strong> (die Live-Boards auf den TV-Monitoren am Board sowie die Master-Accounts) unabhängig von deiner individuellen Einstellung immer im <strong>Dunkelmodus</strong>. Dies gewährleistet reflexionsfreie Sicht und maximalen Farbkontrast beim Wurf am Oche.
            </p>
          </div>
        </div>
      </div>

      {/* SEKTION 3: TABLET-SPIEGELUNG & EXTERNER ZWEIT-MONITOR (QUERFORMAT) */}
      <div className="space-y-4 pt-2">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-purple-400">
            Hardware & Display-Spiegelung
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Tablet auf zweiten Monitor / TV spiegeln (Querformat)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Wenn du dein Tablet per HDMI-Kabel, AirPlay, Miracast oder Chromecast mit einem externen Bildschirm verbindest:
          </p>
        </div>

        {/* 2 Spalten: Live-Board Popups vs. Querformat erzwingen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Modus A: Live-Board im Querformat (16:9 TV) */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-400/30 flex items-center justify-center mb-3">
                <Tv className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">
                📺 Zweit-Monitor Live-Board (16:9)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Öffne die optimierte 16:9 Querformat-Zuschaueransicht in einem separaten Fenster und schiebe sie auf den zweiten Monitor / TV:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => openLivePopup('/training/pdc-challenge/live', 'PDC Live-Board')}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-bold text-xs flex items-center justify-between transition-all cursor-pointer"
              >
                <span>PDC Challenge TV-Board (Querformat)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => openLivePopup('/doppelquote/live', 'Doppelquote Live-Board')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs flex items-center justify-between border border-slate-700 transition-all cursor-pointer"
              >
                <span>Doppelquote TV-Board (Querformat)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Modus B: Tablet-Vollbild im Querformat erzwingen */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-white/10 shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center mb-3">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white">
                🔄 Tablet-Querformat für Spiegelung
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Erzwingt das Querformat auf deinem Tablet im Vollbildmodus, damit die 1:1 Spiegelung auf dem externen Monitor den gesamten 16:9 Bildschirm ausfüllt (keine schwarzen Ränder).
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleToggleFullscreenLandscape}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>
                  {isLandscapeLocked ? 'Querformat / Vollbild beenden' : 'Querformat auf Monitor aktivieren'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
