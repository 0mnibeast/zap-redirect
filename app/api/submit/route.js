export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Interfaces will hit: GET /api/submit?email=...&name=...
export async function GET(req) {
  const urlIn = new URL(req.url);
  const data = Object.fromEntries(urlIn.searchParams.entries());

  // (optional) fire-and-forget to your Zap's Catch Hook
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (hook) {
    fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form: data, source: 'interfaces-get' })
    }).catch(() => {});
  }

  // Decide the base destination (customize as needed)
  const base = decideDestination(data);              // must be ABSOLUTE https://...
  const out = new URL(base);

  // Append original fields to the destination as query params
  // (Consider whitelisting allowed keys to avoid leaking PII)
  for (const [k, v] of Object.entries(data)) {
    if (v != null) out.searchParams.append(k, String(v));
  }

  // 303 = POST-redirect-get semantics, but also fine for GET
  return new Response(null, { status: 303, headers: { Location: out.toString() } });
}

function decideDestination({ email = '' }) {
  const e = String(email).toLowerCase();
  return e.endsWith('@enterprise.com')
    ? 'https://example.com/enterprise-thankyou'
    : 'https://example.com/thankyou';
}
