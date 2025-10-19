export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env || {};
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'server not configured' }), { status: 500 });
  }

  const url = new URL(req.url);
  const ttheme = (url.searchParams.get('ttheme') || 'default').toLowerCase();
  const key = (url.searchParams.get('key') || 'default').toLowerCase();

  const qs = new URLSearchParams({
    ttheme: `eq.${ttheme}`,
    key: `eq.${key}`,
    select: 'theme,updated_at',
    limit: '1'
  });

  const r = await fetch(`${SUPABASE_URL}/rest/v1/styles?${qs}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    },
    cache: 'no-store'
  });

  if (!r.ok) return new Response(JSON.stringify({ error: 'supabase read error' }), { status: 502 });

  const rows = await r.json().catch(()=>[]);
  const theme = rows?.[0]?.theme || null;

  return new Response(JSON.stringify({ theme }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}
