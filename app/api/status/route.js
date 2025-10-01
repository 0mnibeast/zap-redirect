export const runtime = 'edge';
import { store } from '../callback/route';

// Browser polls here: GET /api/status?job_id=...
export async function GET(req) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id');

  if (!job_id) {
    return Response.json({ error: 'missing job_id' }, { status: 400 });
  }

  const redirect_url = store.get(job_id) || null;
  return Response.json({ redirect_url });
}
