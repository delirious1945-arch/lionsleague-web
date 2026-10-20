import React from 'react';
import { Metadata } from 'next';
import { getSessionAction } from '@/app/actions';
import EinstellungenClient from './EinstellungenClient';

export const metadata: Metadata = {
  title: 'Einstellungen | Lions League',
  description: 'Design (Hell-/Dunkelmodus), Monitor-Spiegelung im Querformat und Bereichsauswahl für Spieler des SC Weyhausen',
};

export const dynamic = 'force-dynamic';

export default async function EinstellungenPage() {
  const session = await getSessionAction();

  return (
    <main className="min-h-[calc(100vh-80px)] px-2 sm:px-4 py-4 sm:py-6">
      <EinstellungenClient user={session} />
    </main>
  );
}
