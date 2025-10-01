export const runtime = 'edge';
const store = new Map();

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};
  if (!job_id || !redirect_url) return new Response('bad request', { status: 400 });
  store.set(job_id, redirect_url);
  return new Response('ok');
}

export async function GET() {
  return new Response('callback endpoint is live; use POST', {
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
  });
}

export { store };
