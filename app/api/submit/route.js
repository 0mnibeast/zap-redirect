export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
  const u = new URL(req.url);
  const tenant = (u.searchParams.get('tenant_id') || '').toLowerCase();
  if (!tenant) return new Response('tenant_id required', { status: 400 });
  u.pathname = `/t/${tenant}/api/submit`;
  u.searchParams.delete('tenant_id');
  return fetch(u.toString(), { cache: 'no-store' });
}
