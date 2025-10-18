// app/t/[tenant]/api/status/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Params = { params: { tenant: string } };

export async function GET(req: Request, { params }: Params) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env as Record<string, string>;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return Response.json({ error: 'server not configured' }, { status: 500 });
  }

  const tenant_id = (params.tenant || 'default').toLowerCase();
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  if (!job_id) return Response.json({ error: 'missing job_id' }, { status: 400 });

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/redirects?tenant_id=eq.${encodeURIComponent(tenant_id)}&job_id=eq.${encodeURIComponent(job_id)}&select=redirect_url`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, Accept: 'application/json' }, cache: 'no-store' }
  );

  if (!r.ok) return Response.json({ error: 'supabase read error' }, { status: 502 });

  const rows = await r.json().catch(() => []);
  const redirect_url = rows?.[0]?.redirect_url ?? null;

  return Response.json({ redirect_url }, {
    headers: { 'cache-control': 'no-store, no-cache, must-revalidate, max-age=0', pragma: 'no-cache' }
  });
}
