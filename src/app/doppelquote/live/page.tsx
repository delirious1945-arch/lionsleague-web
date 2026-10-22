import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function DoppelquoteLivePage() {
  redirect('/training/live?view=doppelquote');
}
