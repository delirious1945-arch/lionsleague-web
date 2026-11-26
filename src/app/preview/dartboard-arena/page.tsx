import type { Metadata } from 'next';
import DartboardArenaPreviewClient from './DartboardArenaPreviewClient';

export const metadata: Metadata = {
  title: 'UI-Vorschau · Einheitliche Dartboard-Arena (Lokal)',
};

export default function DartboardArenaPreviewPage() {
  return <DartboardArenaPreviewClient />;
}
