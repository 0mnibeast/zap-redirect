export const runtime = 'edge';

// temporary in-memory store (resets on new deployments!)
const store = new Map();

export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const { job_id, redirect_url } = body || {};

  if (!job_id || !redirect_url) {
    return new Response('bad request: job_id and redirect_url required', { status: 400 });
  }

  // Save in memory (short-lived)
  store.set(job_id, redirect_url);

  return new Response('ok');
}

// Optional: allow GET to debug
export async function GET(req) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id');
  return Response.json({ redirect_url: store.get(job_id) || null });
}

// Export the store so /status can use it
export { store };
