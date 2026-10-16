import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import {
  scanDirectoryForSpieltage,
  batchImportSpieltage,
  processSpieltagImport,
  DEFAULT_SPIELTAGE_DIR,
} from '@/lib/importSpieltag';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rootDir = searchParams.get('rootDir') || DEFAULT_SPIELTAGE_DIR;
    const season = searchParams.get('season') || '2026/2027';

    const items = await scanDirectoryForSpieltage(rootDir, season);
    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error('Error in GET /api/spieltage:', err);
    return NextResponse.json(
      { success: false, items: [], error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'scan') {
      const rootDir = body.rootDir || DEFAULT_SPIELTAGE_DIR;
      const season = body.season || '2026/2027';
      const items = await scanDirectoryForSpieltage(rootDir, season);
      return NextResponse.json({ success: true, items });
    }

    if (action === 'batch_import') {
      const selectedSpieltage = body.selectedSpieltage || [];
      const season = body.season || '2026/2027';
      const syncLeague = body.syncLeague !== false;
      const rootDir = body.rootDir || DEFAULT_SPIELTAGE_DIR;

      const summary = await batchImportSpieltage(
        selectedSpieltage,
        season,
        syncLeague
      );

      revalidatePath('/', 'layout');
      revalidatePath('/analytics');
      revalidatePath('/teams');
      revalidatePath('/spieler');
      revalidatePath('/verwaltung');
      revalidatePath('/eingabe');

      const updatedItems = await scanDirectoryForSpieltage(rootDir, season);

      return NextResponse.json({
        success: true,
        summary,
        items: updatedItems,
      });
    }

    if (action === 'single_import') {
      const result = await processSpieltagImport(body.payload);
      if (result.success) {
        revalidatePath('/', 'layout');
        revalidatePath('/analytics');
        revalidatePath('/teams');
        revalidatePath('/spieler');
        revalidatePath('/verwaltung');
        revalidatePath('/eingabe');
      }
      const rootDir = body.rootDir || DEFAULT_SPIELTAGE_DIR;
      const season = body.payload?.season || '2026/2027';
      const updatedItems = await scanDirectoryForSpieltage(rootDir, season);
      return NextResponse.json({
        ...result,
        items: updatedItems,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unbekannte Aktion' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('Error in POST /api/spieltage:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
