import StellenCheckenLiveMonitorClient from './StellenCheckenLiveMonitorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function StellenCheckenLivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialBoardId = params?.board || '1';

  return <StellenCheckenLiveMonitorClient initialBoardId={initialBoardId} />;
}
