// app/t/[tenant]/api/callback/route.ts
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

type Params = { params: { tenant: string } };

export async function POST(req: Request, { params }: Params) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string, string>;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('server not configured', { status: 500 });
  }

  const tenant_id_path = (params.tenant || 'default').toLowerCase();
  const { tenant_id = tenant_id_path, job_id, redirect_url } = await req.json().catch(() => ({}));
  if (!tenant_id || !job_id || !redirect_url) return new Response('bad request', { status: 400 });

  // (Optional) Verify a per-tenant secret header
  // const secret = req.headers.get('x-callback-secret') || '';
  // ...look up tenant, compare secret, allowlist URL hostname...

  const r = await fetch(`${SUPABASE_URL}/rest/v1/redirects`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ tenant_id, job_id, redirect_url })
  });

  return r.ok ? new Response('ok', { headers: { 'cache-control': 'no-store' } })
              : new Response('supabase write error', { status: 502 });
}
