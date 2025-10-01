export const runtime = 'edge';

// In-memory store for testing
const store = new Map();

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};

  if (!job_id || !redirect_url) {
    return new Response('bad request: job_id and redirect_url required', { status: 400 });
  }

  store.set(job_id, redirect_url);
  return new Response('ok');
}

// Optional GET to debug in the browser
export async function GET(req) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id');
  return Response.json({ redirect_url: store.get(job_id) || null });
}

// Export store for /status
export { store };
