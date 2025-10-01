export const runtime = 'edge';

// Zapier posts: { job_id, redirect_url }
export async function POST(req) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('server not configured', { status: 500 });
  }

  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};
  if (!job_id || !redirect_url) {
    return new Response('bad request: job_id and redirect_url required', { status: 400 });
  }

  // Upsert so repeated callbacks won’t error
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/redirects`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates' // upsert on primary key
    },
    body: JSON.stringify({ job_id, redirect_url })
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return new Response(`supabase error: ${txt}`, { status: 502 });
  }

  return new Response('ok');
}

// optional: GET for quick sanity in a browser
export async function GET() {
  return new Response('callback live; POST {job_id, redirect_url}', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
  });
}
