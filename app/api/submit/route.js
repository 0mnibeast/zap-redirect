export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  // 1) Read the fields Interfaces appended as query params
  const inUrl = new URL(req.url);
  const data = Object.fromEntries(inUrl.searchParams.entries());

  // 2) Decide your base destination (ABSOLUTE URL only)
  const base = decideDestination(data);
  const out = new URL(base);

  // 3) Append the same fields to the destination (whitelist if needed)
  for (const [k, v] of Object.entries(data)) {
    if (v != null) out.searchParams.append(k, String(v));
  }

  // 4) Optional: fire-and-forget webhook to your Zap (does NOT block redirect)
  if (process.env.ZAPIER_CATCH_HOOK_URL) {
    fetch(process.env.ZAPIER_CATCH_HOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form: data, redirected_to: out.toString(), source: 'interfaces-top-level' })
    }).catch(() => {});
  }

  // 5) Send a 302 + HTML+JS fallback to be extra bulletproof
  const html = `<!doctype html><meta charset="utf-8">
<title>Redirecting…</title>
<meta http-equiv="refresh" content="0;url=${out.toString().replace(/"/g, '%22')}">
<script>try{ top.location.replace(${JSON.stringify(out.toString())}); }catch(e){ location.href=${JSON.stringify(out.toString())}; }</script>
<p>Redirecting…</p>`;

  return new Response(html, {
    status: 302, // 302 works fine for GET; some networks mishandle 303s
    headers: {
      'Location': out.toString(),
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer'
    }
  });
}
