'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Calendar, LogOut } from 'lucide-react';
import { logoutAction, UserSession } from '@/app/actions';

interface HeaderProps {
  currentSeason?: string;
  seasons?: string[];
  user?: UserSession | null;
}

export default function Header({
  currentSeason = '2026/2027',
  seasons = ['2026/2027'],
  user,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Admin status from user role or toggle
  const userIsAdminRole = user?.role === 'admin';
  const [isAdminMode, setIsAdminMode] = useState<boolean>(true);


  useEffect(() => {
    const savedMode = localStorage.getItem('lions_role_mode');
    if (savedMode !== null) {
      setIsAdminMode(savedMode === 'admin');
    } else {
      setIsAdminMode(userIsAdminRole);
    }
  }, [userIsAdminRole]);

  const toggleAdmin = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    localStorage.setItem('lions_role_mode', newMode ? 'admin' : 'player');
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('season', selected);
    router.push(`${pathname}?${params.toString()}`);
  };

  const mainNav = [
    { label: 'Dashboard', href: '/' },
    { label: 'Teams', href: '/teams' },
    { label: 'Spieler', href: '/spieler' },
    { label: 'Liga', href: '/liga' },
    { label: 'Dart Analytics Engine', href: '/analytics' },
    { label: 'Hilfe', href: '/hilfe' },
  ];

  const adminNav = [
    { label: 'Eingabe', href: '/eingabe' },
    { label: 'Verwaltung', href: '/verwaltung' },
    { label: 'Optionen', href: '/optionen' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#050811]/95 border-b border-white/10 px-3 sm:px-6 py-2.5 transition-all shadow-xl">
      <div className="max-w-[1400px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center justify-between w-full xl:w-auto shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 shrink-0 transition-transform group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Lions Weyhausen"
                width={36}
                height={36}
                className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]"
                priority
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-wider text-white">
                  LIONS LEAGUE
                </span>
                <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.2 rounded font-mono">
                  2.0
                </span>
              </div>
              <p className="text-[10px] font-semibold tracking-wide text-blue-400 uppercase">
                SC Weyhausen von 1921 e.V.
              </p>
            </div>
          </Link>

          {/* Mobile Right Controls */}
          <div className="flex items-center gap-2 xl:hidden">
            <button
              onClick={toggleAdmin}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                isAdminMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-blue-600/20 text-blue-300 border-blue-500/40'
              }`}
            >
              {isAdminMode ? '👑 Admin' : '🎯 Spieler'}
            </button>
            <button
              onClick={handleLogout}
              disabled={isPending}
              className="p-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 transition-all"
              title="Abmelden"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 text-xs font-bold w-full xl:w-auto">
          {/* Main Navigation */}
          {mainNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600/25 text-white font-extrabold border-b-2 border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Trennlinie für Adminbereich */}
          {isAdminMode && (
            <>
              <span className="text-white/20 px-1 hidden sm:inline select-none">
                |
              </span>

              {/* Admin Navigation */}
              {adminNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 font-extrabold border-b-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'text-slate-300 hover:text-amber-300 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* Right Section: Season Selector, User Profile & Switcher */}
        <div className="hidden xl:flex items-center gap-2.5 shrink-0">
          {/* Season Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1 shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={currentSeason}
              onChange={handleSeasonChange}
              className="bg-transparent text-xs font-bold text-cyan-300 focus:outline-none cursor-pointer pr-1"
            >
              {seasons.map((s) => (
                <option key={s} value={s} className="bg-slate-900 text-white">
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* User Badge */}
          {user && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300">
              <span className="font-bold text-white truncate max-w-[120px]">
                {user.name}
              </span>
              <span
                className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                  user.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-blue-500/20 text-blue-300'
                }`}
              >
                {user.role === 'admin' ? 'Admin' : 'Spieler'}
              </span>
            </div>
          )}

          {/* Admin / Spieler Mode Switcher */}
          <button
            onClick={toggleAdmin}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center gap-1.5 shadow-sm ${
              isAdminMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 shadow-amber-500/10'
                : 'bg-blue-600/20 text-blue-300 border-blue-500/40 hover:bg-blue-600/30 shadow-blue-500/10'
            }`}
          >
            <span>{isAdminMode ? '👑 Admin' : '🎯 Spieler'}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-white/10 text-slate-400 transition-all cursor-pointer"
            title="Abmelden"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Abmelden</span>
          </button>
        </div>
      </div>
    </header>
  );
}
