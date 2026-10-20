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
  return (
    <main className="min-h-screen px-2 sm:px-4 py-4 sm:py-6 flex flex-col justify-center">
      <EinstellungenClient />
    </main>
  );
}
