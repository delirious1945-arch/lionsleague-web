import UnifiedBoardLiveClient from '../UnifiedBoardLiveClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveBoardPage({ params }: PageProps) {
  const resolved = await params;
  const boardId = resolved?.id || '1';

  return <UnifiedBoardLiveClient initialBoardId={boardId} />;
}
