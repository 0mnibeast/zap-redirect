export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('callback endpoint is live; use POST', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
  });
}

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};
  if (!job_id || !redirect_url) return new Response('bad request', { status: 400 });
  // For now, just echo (we’ll wire storage later)
  return new Response('ok');
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,x-callback-secret',
      'access-control-allow-methods': 'POST,OPTIONS,GET',
    }
  });
}
