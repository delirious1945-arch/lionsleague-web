import { Metadata } from 'next';
import { getUnifiedTvBoardDataAction } from './actions';
import UnifiedTvBoardClient from './UnifiedTvBoardClient';
import { UnifiedTvViewMode, UnifiedTvTimeframe } from './types';

export const metadata: Metadata = {
  title: 'TV-Board Live | Lions Weyhausen',
  description: 'Offizielles TV Live-Board für PDC Challenge & Checkout Battle des SC Weyhausen Dartsport',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    view?: string;
    filter?: string;
    date?: string;
  }>;
}

export default async function TrainingLivePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialViewMode = (params?.view as UnifiedTvViewMode) || 'both';
  const initialTimeframe = (params?.filter as UnifiedTvTimeframe) || 'today';
  const initialDate = params?.date;

  const initialData = await getUnifiedTvBoardDataAction({
    timeframe: initialTimeframe,
    customDate: initialDate,
  });

  return (
    <UnifiedTvBoardClient
      initialData={initialData}
      initialViewMode={initialViewMode}
      initialTimeframe={initialTimeframe}
    />
  );
}
