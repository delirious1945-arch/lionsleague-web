import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

// Direkte DB-Verbindung über DATABASE_URL
function getDb() {
  const dbUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, '');
  if (!dbUrl) throw new Error('DATABASE_URL nicht konfiguriert');
  return postgres(dbUrl, { ssl: 'require' });
}

// Standalone HTML Renderer für das Smartphone (100% isoliert außerhalb der Dart-App UI)
function renderStandaloneMobileHtml(title: string, badge: string, message: string, detailHtml?: string) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} • Lions Agenten-Zentrale</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #020617; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.25rem; }
    .card { background: linear-gradient(180deg, #0f172a 0%, #020617 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; max-width: 480px; width: 100%; padding: 2rem 1.5rem; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); }
    .logo { width: 52px; height: 52px; border-radius: 1rem; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.4); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin: 0 auto 1.25rem; }
    .badge { display: inline-block; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; }
    .badge-approved { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); }
    .badge-rejected { background: rgba(244,63,94,0.2); color: #fb7185; border: 1px solid rgba(244,63,94,0.4); }
    .badge-feedback { background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); }
    h1 { font-size: 1.35rem; font-weight: 900; margin-bottom: 0.5rem; color: #ffffff; }
    p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
    .detail { background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.06); border-radius: 1rem; padding: 1rem; text-align: left; font-size: 0.825rem; color: #cbd5e1; margin-bottom: 1.5rem; max-height: 220px; overflow-y: auto; }
    textarea { width: 100%; background: #020617; border: 1px solid rgba(255,255,255,0.15); border-radius: 0.75rem; color: #fff; padding: 0.75rem; font-size: 0.875rem; min-height: 100px; margin-bottom: 1rem; outline: none; }
    textarea:focus { border-color: #38bdf8; }
    button { width: 100%; background: #0284c7; color: #fff; border: none; border-radius: 0.75rem; padding: 0.85rem; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; }
    button:hover { background: #0369a1; }
    .footer { font-size: 0.75rem; color: #64748b; margin-top: 1.25rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🦁</div>
    <div class="badge ${badge}">${title}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    ${detailHtml || ''}
    <div class="footer">Lions Weyhausen • Autonomes Agenten-Netzwerk</div>
  </div>
</body>
</html>`;
}

// GET: 1-Click Auswertung vom Smartphone
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action') || 'approve';

  if (!token) {
    return new NextResponse(
      renderStandaloneMobileHtml('Ungültiger Link', 'badge-rejected', 'Der Freigabelink ist unvollständig oder abgelaufen.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
    );
  }

  const sql = getDb();
  try {
    const rows = await sql`
      SELECT id, cycle_id, agent_name, summary, status, feedback, created_at 
      FROM agent_approvals 
      WHERE token = ${token} 
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return new NextResponse(
        renderStandaloneMobileHtml('Nicht gefunden', 'badge-rejected', 'Dieser Freigabe-Datensatz existiert nicht oder wurde bereits archiviert.'),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 404 }
      );
    }

    const item = rows[0];

    // Fall 1: Feedback / Korrektur-Formular aufrufen
    if (action === 'feedback') {
      const feedbackFormHtml = `
        <form method="POST" action="/api/agent/approval">
          <input type="hidden" name="token" value="${token}" />
          <textarea name="feedback" placeholder="z. B.: 'Übernehme die Wurfkurve, aber lass den Zoom bei 2.15x'">${item.feedback || ''}</textarea>
          <button type="submit">Korrektur an Agenten übermitteln</button>
        </form>
      `;
      return new NextResponse(
        renderStandaloneMobileHtml('Korrektur eingeben', 'badge-feedback', 'Teile dem Agenten mit, welche Anpassungen vor der Übernahme vorgenommen werden sollen:', feedbackFormHtml),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Fall 2: Ablehnen
    if (action === 'reject') {
      await sql`
        UPDATE agent_approvals 
        SET status = 'rejected', decided_at = NOW() 
        WHERE token = ${token};
      `;
      return new NextResponse(
        renderStandaloneMobileHtml(
          '❌ Änderungen verworfen',
          'badge-rejected',
          'Du hast die vorgeschlagenen Änderungen abgelehnt. Der Agent wird die vorgeschlagene Code-Änderung verwerfen und den aktuellen Stand beibehalten.'
        ),
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    // Fall 3: Freigeben (approve oder approve_biomechanics)
    const newStatus = action === 'approve_biomechanics' ? 'approved_biomechanics' : 'approved';
    await sql`
      UPDATE agent_approvals 
      SET status = ${newStatus}, decided_at = NOW() 
      WHERE token = ${token};
    `;

    const statusMsg = action === 'approve_biomechanics'
      ? 'Freigabe erteilt: Ausschließlich die Wurf-KI-Optimierungen werden beim nächsten Agentenlauf übernommen.'
      : 'Vollständige Freigabe erteilt: Alle vorgeschlagenen Optimierungen werden beim nächsten Agentenlauf in den Code übernommen.';

    const detailBlock = `
      <div class="detail">
        <strong>Cycle:</strong> ${item.cycle_id}<br/>
        <strong>Agent:</strong> ${item.agent_name}<br/>
        <strong>Zusammenfassung:</strong> ${item.summary}
      </div>
    `;

    return new NextResponse(
      renderStandaloneMobileHtml('✅ Freigabe bestätigt', 'badge-approved', statusMsg, detailBlock),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err: any) {
    console.error('Fehler bei Agenten-Freigabe:', err);
    return new NextResponse(
      renderStandaloneMobileHtml('Server-Fehler', 'badge-rejected', 'Die Freigabe konnte nicht in der Datenbank gespeichert werden: ' + err.message),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  } finally {
    await sql.end();
  }
}

// POST: Korrekturtext vom Smartphone speichern
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const token = formData.get('token')?.toString();
  const feedback = formData.get('feedback')?.toString() || '';

  if (!token) {
    return new NextResponse(
      renderStandaloneMobileHtml('Fehler', 'badge-rejected', 'Ungültiges Token.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
    );
  }

  const sql = getDb();
  try {
    await sql`
      UPDATE agent_approvals 
      SET status = 'corrected', feedback = ${feedback}, decided_at = NOW() 
      WHERE token = ${token};
    `;

    const detailBlock = `
      <div class="detail">
        <strong>Deine Notiz:</strong><br/>
        ${feedback}
      </div>
    `;

    return new NextResponse(
      renderStandaloneMobileHtml(
        '💬 Korrektur übermittelt',
        'badge-feedback',
        'Deine Anweisung wurde erfolgreich gespeichert! Der Agent wird sie vor dem Rollout berücksichtigen.',
        detailBlock
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (err: any) {
    return new NextResponse(
      renderStandaloneMobileHtml('Fehler', 'badge-rejected', err.message),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  } finally {
    await sql.end();
  }
}
