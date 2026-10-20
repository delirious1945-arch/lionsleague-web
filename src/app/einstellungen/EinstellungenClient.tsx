'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon, ShieldCheck, Tag } from 'lucide-react';

interface EinstellungenClientProps {
  isAdmin?: boolean;
}

export default function EinstellungenClient({ isAdmin = false }: EinstellungenClientProps) {
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [showUiLabels, setShowUiLabels] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lions_theme');
      const activeTheme = savedTheme === 'light';
      setIsLightMode(activeTheme);
      if (activeTheme) {
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }

      const savedLabels = localStorage.getItem('lions_show_ui_labels') === 'true';
      setShowUiLabels(savedLabels);
      if (savedLabels) {
        document.documentElement.classList.add('show-ui-labels');
      } else {
        document.documentElement.classList.remove('show-ui-labels');
      }
    } catch (e) {}
    setMounted(true);
  }, []);

  const handleToggleTheme = () => {
    const nextState = !isLightMode;
    setIsLightMode(nextState);
    try {
      const themeVal = nextState ? 'light' : 'dark';
      localStorage.setItem('lions_theme', themeVal);
      document.cookie = `lions_theme=${themeVal}; path=/; max-age=31536000`;
      if (nextState) {
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
  };

  const handleToggleUiLabels = () => {
    const nextState = !showUiLabels;
    setShowUiLabels(nextState);
    try {
      localStorage.setItem('lions_show_ui_labels', nextState ? 'true' : 'false');
      if (nextState) {
        document.documentElement.classList.add('show-ui-labels');
      } else {
        document.documentElement.classList.remove('show-ui-labels');
      }
    } catch (e) {}
  };

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-12 px-3 sm:px-6 space-y-8 animate-fadeIn select-none">
      {/* Oben nur die Möglichkeit, zurück zur Startseite zu gehen */}
      <div>
        <Link
          href="/"
          data-ui-id="SETTINGS.NAV.BACK_BTN"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-sm font-bold transition-all shadow-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur Startseite</span>
        </Link>
      </div>

      {/* Titel */}
      <div className="space-y-1" data-ui-id="SETTINGS.HEADER.TITLE">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Einstellungen
        </h1>
        <p className="text-sm text-slate-400">
          Persönliche Anzeigeoptionen für dieses Gerät
        </p>
      </div>

      {/* Klarschriftspalte mit Schieberegler für Hellmodus / Dunkelmodus */}
      <div
        data-ui-id="SETTINGS.THEME.CARD"
        className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 pr-2">
            <div className="flex items-center gap-2">
              {mounted && isLightMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-cyan-400" />
              )}
              <h2 className="text-lg sm:text-xl font-black text-white">
                Hellmodus
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {mounted && isLightMode
                ? 'Hellmodus ist aktiv (heller Bildschirmhintergrund).'
                : 'Dunkelmodus ist aktiv (standardmäßiger dunkler Bildschirmhintergrund).'}
            </p>
          </div>

          {/* Schieberegler (Toggle Switch) */}
          <button
            type="button"
            role="switch"
            data-ui-id="SETTINGS.THEME.TOGGLE_BTN"
            aria-checked={isLightMode}
            onClick={handleToggleTheme}
            className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
              isLightMode
                ? 'bg-amber-500 border-amber-300'
                : 'bg-slate-800 border-slate-700'
            }`}
          >
            <span className="sr-only">Hellmodus umschalten</span>
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out mt-0.5 ml-0.5 flex items-center justify-center text-xs ${
                isLightMode ? 'translate-x-9 text-amber-600' : 'translate-x-0 text-slate-700'
              }`}
            >
              {isLightMode ? '☀️' : '🌙'}
            </span>
          </button>
        </div>

        {/* Status in Klarschrift */}
        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Status:</span>
          <span
            data-ui-id="SETTINGS.THEME.STATUS_PILL"
            className={`font-black uppercase tracking-wider px-3 py-1 rounded-full ${
              isLightMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/30'
            }`}
          >
            {isLightMode ? 'An (Hellmodus)' : 'Aus (Dunkelmodus)'}
          </span>
        </div>
      </div>

      {/* Admin-Bereich: UI-Inspektor Schalter (NUR FUER ADMIN) */}
      {isAdmin && (
        <div
          data-ui-id="SETTINGS.INSPECTOR.CARD"
          className="bg-amber-950/20 border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <span>UI-Element-IDs anzeigen</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Admin
                  </span>
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {mounted && showUiLabels
                  ? 'UI-Inspektor aktiv: An allen Kacheln & Buttons werden eindeutige Adressierungs-Labels ([SEITE].[BEREICH].[FELD]) für präzise UI-Anpassungen eingeblendet.'
                  : 'UI-Inspektor deaktiviert: Standardansicht ohne Entwickler-Badges.'}
              </p>
            </div>

            {/* Schieberegler (Toggle Switch) */}
            <button
              type="button"
              role="switch"
              data-ui-id="SETTINGS.INSPECTOR.TOGGLE_BTN"
              aria-checked={showUiLabels}
              onClick={handleToggleUiLabels}
              className={`relative inline-flex h-9 w-18 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                showUiLabels
                  ? 'bg-amber-500 border-amber-300'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <span className="sr-only">UI-Inspektor umschalten</span>
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-300 ease-in-out mt-0.5 ml-0.5 flex items-center justify-center text-xs ${
                  showUiLabels ? 'translate-x-9 text-amber-700' : 'translate-x-0 text-slate-700'
                }`}
              >
                {showUiLabels ? '🏷️' : '🔒'}
              </span>
            </button>
          </div>

          {/* Status in Klarschrift */}
          <div className="pt-4 border-t border-amber-500/20 flex items-center justify-between text-xs text-slate-400">
            <span>Inspektor-Status:</span>
            <span
              data-ui-id="SETTINGS.INSPECTOR.STATUS_PILL"
              className={`font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                showUiLabels
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {showUiLabels ? 'Aktiv (Labels eingeblendet)' : 'Inaktiv (Ausgeblendet)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
