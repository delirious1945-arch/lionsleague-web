import UnifiedBoardLiveClient from '@/app/live/UnifiedBoardLiveClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ board?: string }>;
}

export default async function PdcLivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialBoardId = params?.board || '1';

  return <UnifiedBoardLiveClient initialBoardId={initialBoardId} />;
}
