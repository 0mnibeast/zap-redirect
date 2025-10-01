// app/api/status/route.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
  // ...your current Supabase read...
  return Response.json({ redirect_url }, {
    headers: { 'cache-control': 'no-store, no-cache, must-revalidate, max-age=0', 'pragma': 'no-cache' }
  });
}
