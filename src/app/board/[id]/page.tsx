import UnifiedBoardLiveClient from '@/app/live/UnifiedBoardLiveClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardShortcutPage({ params }: PageProps) {
  const resolved = await params;
  const boardId = resolved?.id || '1';

  return <UnifiedBoardLiveClient initialBoardId={boardId} />;
}
