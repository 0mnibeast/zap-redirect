export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const url = new URL(req.url);
  const job_id = url.searchParams.get('job_id') || '';
  return Response.json({ ok: true, job_id, redirect_url: null }, {
    headers: { 'cache-control': 'no-store' }
  });
}
