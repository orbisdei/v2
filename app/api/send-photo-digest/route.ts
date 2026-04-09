import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSitesWithoutPhotos } from '@/lib/data';

const resend = new Resend(process.env.RESEND_API_KEY);

const INTEREST_LABEL: Record<string, string> = {
  global: '🌍 Global',
  regional: '📍 Regional',
  local: '🏘 Local',
  personal: '👤 Personal',
};

export async function GET(req: NextRequest) {
  const secret =
    req.nextUrl.searchParams.get('secret') ?? req.headers.get('x-cron-secret');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sites = await getSitesWithoutPhotos();

  if (sites.length === 0) {
    return NextResponse.json({ message: 'No sites without photos.' });
  }

  const cronSecret = process.env.CRON_SECRET!;
  const baseUrl = 'https://orbisdei.org';

  const rows = sites
    .map((s) => {
      const siteUrl = `${baseUrl}/site/${s.id}`;
      const editUrl = `${baseUrl}/site/${s.id}/edit`;
      const markUrl = `${baseUrl}/api/mark-no-image?id=${encodeURIComponent(s.id)}&secret=${encodeURIComponent(cronSecret)}`;
      const label = INTEREST_LABEL[s.interest ?? 'local'] ?? s.interest ?? '—';
      return `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;">
            <a href="${siteUrl}" style="color:#1e1e5f;text-decoration:none;font-weight:500;">${s.id}</a>
            <div style="font-size:12px;color:#666;margin-top:2px;">${s.name}</div>
          </td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font-size:12px;color:#888;">${label}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;white-space:nowrap;">
            <a href="${editUrl}" style="display:inline-block;padding:3px 10px;background:#1e1e5f;color:#fff;font-size:12px;text-decoration:none;border-radius:4px;margin-right:8px;">Edit</a>
            <a href="${markUrl}" style="color:#c9950c;font-size:12px;text-decoration:none;">Mark no image</a>
          </td>
        </tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:24px;">
      <h2 style="color:#1e1e5f;margin-bottom:4px;">Orbis Dei — Sites Without Photos</h2>
      <p style="color:#888;font-size:13px;margin-top:0;">${new Date().toDateString()} · ${sites.length} site${sites.length !== 1 ? 's' : ''}</p>
      <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#999;letter-spacing:.05em;">Site</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#999;letter-spacing:.05em;">Interest</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#999;letter-spacing:.05em;">Action</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  const { error } = await resend.emails.send({
    from: 'Orbis Dei <digest@orbisdei.org>',
    to: process.env.DIGEST_EMAIL_TO!,
    subject: `Orbis Dei — ${sites.length} site${sites.length !== 1 ? 's' : ''} without photos`,
    html,
  });

  if (error) {
    console.error('Resend error:', error);
    return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  }

  return NextResponse.json({ sent: true, count: sites.length });
}
