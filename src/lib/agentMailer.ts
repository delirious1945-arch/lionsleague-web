import postgres from 'postgres';

export interface SendApprovalEmailParams {
  cycleId: string;
  agentName: string;
  summary: string;
  details: string;
  changesDiff?: string;
  recipientEmail?: string;
}

function getDb() {
  const dbUrl = process.env.DATABASE_URL?.replace(/^['"]|['"]$/g, '');
  if (!dbUrl) throw new Error('DATABASE_URL nicht konfiguriert');
  return postgres(dbUrl, { ssl: 'require' });
}

export async function createApprovalRequestAndSendEmail(params: SendApprovalEmailParams): Promise<{ success: boolean; token?: string; error?: string; emailId?: string }> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lionsweyhausen.vercel.app').replace(/\/$/, '');
  const resendApiKey = process.env.RESEND_API_KEY;
  const recipientEmail = params.recipientEmail || process.env.AGENT_NOTIFICATION_EMAIL || 'delirious1945@gmail.com';
  const token = 'appr_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

  // 1. In Supabase agent_approvals Tabelle speichern
  const sql = getDb();
  try {
    await sql`
      INSERT INTO agent_approvals (
        cycle_id,
        agent_name,
        summary,
        changes_diff,
        status,
        token
      ) VALUES (
        ${params.cycleId},
        ${params.agentName},
        ${params.summary},
        ${params.changesDiff || null},
        'pending',
        ${token}
      );
    `;
  } catch (err: any) {
    console.error('Fehler beim Speichern des Approvals:', err);
    await sql.end();
    return { success: false, error: err.message };
  } finally {
    await sql.end();
  }

  // 2. Mobile 1-Click URLs
  const approveAllUrl = `${siteUrl}/api/agent/approval?token=${token}&action=approve`;
  const approveBioUrl = `${siteUrl}/api/agent/approval?token=${token}&action=approve_biomechanics`;
  const rejectUrl = `${siteUrl}/api/agent/approval?token=${token}&action=reject`;
  const feedbackUrl = `${siteUrl}/api/agent/approval?token=${token}&action=feedback`;

  // 3. Hochwertiges, mobiles HTML-E-Mail Template
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 15px; color: #f1f5f9; }
    .container { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); padding: 22px 20px; text-align: center; border-bottom: 1px solid #10b98133; }
    .header h2 { margin: 0; font-size: 18px; color: #34d399; font-weight: 800; }
    .header p { margin: 5px 0 0; font-size: 12px; color: #a7f3d0; }
    .content { padding: 22px 20px; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
    .summary-box { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
    .actions-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 12px; text-align: center; }
    .btn { display: block; text-align: center; padding: 13px 18px; margin-bottom: 9px; border-radius: 10px; font-weight: 700; font-size: 14px; text-decoration: none; transition: all 0.2s; }
    .btn-green { background: #10b981; color: #022c22 !important; box-shadow: 0 4px 12px rgba(16,185,129,0.3); }
    .btn-blue { background: #0284c7; color: #ffffff !important; }
    .btn-yellow { background: #334155; color: #e2e8f0 !important; border: 1px solid #475569; }
    .btn-red { background: #450a0a; color: #f87171 !important; border: 1px solid #7f1d1d; }
    .footer { text-align: center; font-size: 11px; color: #64748b; padding: 16px 20px; background: #020617; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🦁 Lions Agenten-Zentrale</h2>
      <p>Täglicher Management- & Optimierungsbericht</p>
    </div>
    <div class="content">
      <span class="badge">${params.agentName}</span>
      <h3 style="margin: 0 0 10px; font-size: 16px; color: #ffffff;">${params.summary}</h3>
      
      <div class="summary-box">
        ${params.details.replace(/\n/g, '<br/>')}
      </div>

      <div class="actions-title">📱 1-Klick-Freigabe (Direkt vom Smartphone):</div>

      <a href="${approveAllUrl}" class="btn btn-green">
        ✅ Alle Optimierungen freigeben
      </a>

      <a href="${approveBioUrl}" class="btn btn-blue">
        🎯 Nur Wurf-KI-Optimierung freigeben
      </a>

      <a href="${feedbackUrl}" class="btn btn-yellow">
        💬 Notiz / Korrektur eingeben
      </a>

      <a href="${rejectUrl}" class="btn btn-red">
        ❌ Ablehnen / Verwerfen
      </a>
    </div>
    <div class="footer">
      Lions Weyhausen 2.0 • Autonomes Entwickler- & Biomechanik-Netzwerk<br/>
      Empfänger: ${recipientEmail} • Cycle: ${params.cycleId}
    </div>
  </div>
</body>
</html>
  `;

  // 4. E-Mail über Resend versenden (falls RESEND_API_KEY vorhanden)
  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY ist nicht in .env.local gesetzt. E-Mail wurde vorbereitet und in Supabase gespeichert.');
    return {
      success: true,
      token,
      error: 'RESEND_API_KEY fehlt in .env.local. Sobald der Key hinterlegt ist, wird die Mail automatisch versendet.'
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Lions Agenten-Zentrale <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `🦁 [Lions Optimierung] ${params.summary}`,
        html: emailHtml
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Fehler von Resend API:', data);
      return { success: false, token, error: data.message || 'Resend API Fehler' };
    }

    return { success: true, token, emailId: data.id };
  } catch (err: any) {
    console.error('Netzwerkfehler beim E-Mail-Versand:', err);
    return { success: false, token, error: err.message };
  }
}
