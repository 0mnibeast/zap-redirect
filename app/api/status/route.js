export const runtime = 'edge';
import { store } from '../callback/route';

export async function GET(req) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  const redirect_url = store.get(job_id) || null;
  return Response.json({ redirect_url }, { headers: { 'cache-control': 'no-store' } });
}
