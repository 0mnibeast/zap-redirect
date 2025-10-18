// app/t/[tenant]/api/status/route.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req, context) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env || {};
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'server not configured' }), { status: 500 });
  }

  const tenant_id = (context?.params?.tenant || 'default').toLowerCase();
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  if (!job_id) return new Response(JSON.stringify({ error: 'missing job_id' }), { status: 400 });

  const qs = new URLSearchParams({
    'tenant_id': `eq.${tenant_id}`,
    'job_id': `eq.${job_id}`,
    'select': 'redirect_url'
  });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/redirects?${qs.toString()}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!r.ok) return new Response(JSON.stringify({ error: 'supabase read error' }), { status: 502 });

  let rows = [];
  try { rows = await r.json(); } catch {}
  const redirect_url = rows?.[0]?.redirect_url ?? null;

  return new Response(JSON.stringify({ redirect_url }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'pragma': 'no-cache'
    }
  });
}
