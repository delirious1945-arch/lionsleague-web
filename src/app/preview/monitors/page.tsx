import type { Metadata } from 'next';
import MonitorsPreviewClient from './MonitorsPreviewClient';

export const metadata: Metadata = {
  title: 'Lokale UI-Vorschau · Externe TV-Monitore',
};

export default function MonitorsPreviewPage() {
  return <MonitorsPreviewClient />;
}
