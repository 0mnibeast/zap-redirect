// app/t/[tenant]/api/callback/route.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req, context) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env || {};
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('server not configured', { status: 500 });
  }

  const tenant_id_path = (context?.params?.tenant || 'default').toLowerCase();
  let body = {};
  try { body = await req.json(); } catch {}

  const tenant_id = (body.tenant_id || tenant_id_path).toLowerCase();
  const job_id = body.job_id;
  const redirect_url = body.redirect_url;

  if (!tenant_id || !job_id || !redirect_url) {
    return new Response('bad request', { status: 400 });
  }

  // (Optional) Verify a per-tenant secret + allowlist here if you’ve created a `tenants` table:
  // const secret = req.headers.get('x-callback-secret') || '';
  // ...load tenant row, check secret & domain allowlist...

  const payload = { tenant_id, job_id, redirect_url };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/redirects`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  if (!r.ok) return new Response('supabase write error', { status: 502 });

  return new Response('ok', { headers: { 'cache-control': 'no-store' } });
}
