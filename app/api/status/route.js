export const runtime = 'edge';

export async function GET(req) {
  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = process.env;
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return Response.json({ error: 'server not configured' }, { status: 500 });
  }
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  if (!job_id) return Response.json({ error: 'missing job_id' }, { status: 400 });

  const key = `redir:${job_id}`;
  const r = await fetch(
    `${UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}` } }
  );
  const data = await r.json().catch(() => ({}));
  const redirect_url = data?.result ?? null;

  return Response.json({ redirect_url }, { headers: { 'cache-control': 'no-store' } });
}
