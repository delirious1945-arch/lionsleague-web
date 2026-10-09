import React from 'react';
import LigaClient from './LigaClient';
import { getSessionAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function LigaPage() {
  const session = await getSessionAction();
  if (!session) {
    return null;
  }

  return (
    <div className="py-2">
      <LigaClient />
    </div>
  );
}
