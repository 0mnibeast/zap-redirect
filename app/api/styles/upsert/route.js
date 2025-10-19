export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STYLES_INGEST_SECRET } = process.env || {};
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !STYLES_INGEST_SECRET) {
    return new Response('server not configured', { status: 500 });
  }

  // Simple shared-secret auth so only your Zap can write
  const provided = req.headers.get('x-styles-secret') || '';
  if (provided !== STYLES_INGEST_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  let body;
  try { body = await req.json(); } catch { return new Response('bad json', { status: 400 }); }
  const ttheme = (body.ttheme || '').toLowerCase();
  const key = (body.key || 'default').toLowerCase();
  const ttheme = body.ttheme || null;

  if (!ttheme || !ttheme) return new Response('missing ttheme or ttheme', { status: 400 });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/styles`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ ttheme, key, ttheme, updated_at: new Date().toISOString() })
  });

  if (!r.ok) {
    const err = await r.text().catch(()=>'');
    return new Response(`supabase error: ${err}`, { status: 502 });
  }

  return new Response('ok');
}
