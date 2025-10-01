export const runtime = 'edge';

export async function POST(req) {
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;

  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};
  if (!job_id || !redirect_url) return new Response('bad request: job_id and redirect_url required', { status: 400 });
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) return new Response('server not configured', { status: 500 });

  const key = `redir:${job_id}`;
  const ttlSeconds = 600; // 10 minutes to be safe
  const r = await fetch(
    `${UPSTASH_REDIS_REST_URL}/setex/${encodeURIComponent(key)}/${ttlSeconds}/${encodeURIComponent(redirect_url)}`,
    { headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` } }
  );

  if (!r.ok) {
    const txt = await r.text().catch(()=>'');
    return new Response(`redis error: ${txt}`, { status: 502 });
  }
  return new Response('ok');
}

// Optional GET for sanity in browser
export async function GET() {
  return new Response('callback is live; POST job_id + redirect_url', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
  });
}
