import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getSettings, getAvailableSeasons } from '@/lib/data';
import { sql } from '@/lib/db';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function OptionenPage() {
  const settings = await getSettings();
  const seasons = await getAvailableSeasons();

  const playersRows = await sql`
    SELECT id, name, team, role, must_change_password
    FROM players
    ORDER BY team, name
  `;

  const players = playersRows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    team: String(r.team),
    role: String(r.role || 'player'),
    must_change_password: Number(r.must_change_password || 0),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-[#050811] text-slate-100">
      <Header currentSeason="2026/2027" seasons={seasons} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <SettingsClient initialSettings={settings} players={players} />
      </main>
      <Footer />
    </div>
  );
}
