import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function PdcLivePage() {
  redirect('/training/live?view=pdc');
}
