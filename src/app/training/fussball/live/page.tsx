import FussballLiveMonitorClient from './FussballLiveMonitorClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function FussballLivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialBoardId = params?.board || '1';

  return <FussballLiveMonitorClient initialBoardId={initialBoardId} />;
}
