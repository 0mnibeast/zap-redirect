export const runtime = 'edge';

// GET /api/status?job_id=...
export async function GET(req) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ error: 'server not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  if (!job_id) return Response.json({ error: 'missing job_id' }, { status: 400 });

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/redirects?job_id=eq.${encodeURIComponent(job_id)}&select=redirect_url`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: 'application/json',
        Prefer: 'count=exact'
      },
      cache: 'no-store'
    }
  );

  if (!r.ok) {
    const txt = await r.text().catch(() => '');
    return Response.json({ error: `supabase read error: ${txt}` }, { status: 502 });
  }

  const rows = await r.json().catch(() => []);
  const redirect_url = rows?.[0]?.redirect_url ?? null;
  return Response.json({ redirect_url }, { headers: { 'cache-control': 'no-store' } });
}
