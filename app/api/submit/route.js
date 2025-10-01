export const runtime = 'edge';

export async function POST(req) {
  const form = await req.json().catch(()=> ({}));
  const job_id = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/callback`;

  await fetch(process.env.ZAPIER_CATCH_HOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ job_id, callback_url, form })
  });

  return Response.json({
    job_id,
    status_url: `${origin}/api/status?job_id=${job_id}`
  }, { headers: { 'cache-control': 'no-store' } });
}
