'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon } from 'lucide-react';

export default function EinstellungenClient() {
  const [isLightMode, setIsLightMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lions_theme');
      const active = savedTheme === 'light';
      setIsLightMode(active);
      if (active) {
        document.documentElement.classList.add('theme-light');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.remove('theme-light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch (e) {}
    setMounted(true);
  }, []);

  const handleToggle = () => {
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

  return (
    <div className="max-w-xl mx-auto py-6 sm:py-12 px-3 sm:px-6 space-y-8 animate-fadeIn select-none">
      {/* Oben nur die Möglichkeit, zurück zur Startseite zu gehen */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-sm font-bold transition-all shadow-md cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Zurück zur Startseite</span>
        </Link>
      </div>

      {/* Titel */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Einstellungen
        </h1>
        <p className="text-sm text-slate-400">
          Persönliche Anzeigeoptionen für dieses Gerät
        </p>
      </div>

      {/* Klarschriftspalte mit Schieberegler für Hellmodus / Dunkelmodus */}
      <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
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
            aria-checked={isLightMode}
            onClick={handleToggle}
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
    </div>
  );
}
