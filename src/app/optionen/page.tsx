import React from 'react';
import { getSettings } from '@/lib/data';
import { sql } from '@/lib/db';
import SettingsClient from './SettingsClient';
import { getSessionAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function OptionenPage() {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  const settings = await getSettings();

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
    <div className="py-2">
      <SettingsClient initialSettings={settings} players={players} />
    </div>
  );
}
