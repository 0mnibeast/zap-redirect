export const runtime = 'edge';

export async function POST(req) {
  const ct = req.headers.get('content-type') || '';
  let data = {};
  if (ct.includes('application/json')) data = await req.json();
  else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
    const fd = await req.formData(); data = Object.fromEntries(fd.entries());
  }

  const base = decideDestination(data);
  const dest = new URL(base);
  for (const [k, v] of Object.entries(data || {})) {
    if (v != null) dest.searchParams.append(k, String(v));
  }

  // Optional: ping Zap in the background
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (hook) fetch(hook, {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({ form: data, redirected_to: dest.toString() })
  }).catch(()=>{});

  // Return HTML that breaks out of the iframe
  const html = `<!doctype html><meta charset="utf-8"><title>Redirecting…</title>
  <script>
    const url = ${JSON.stringify(dest.toString())};
    try { parent.postMessage({ type: 'zap-redirect', url }, '*'); } catch (e) {}
    try { top.location.replace(url); } catch (e) {}
  </script>
  <p>Redirecting…</p>`;
  return new Response(html, { headers: { 'content-type': 'text/html' } });
}

function decideDestination({ email = '' }) {
  const e = String(email).toLowerCase();
  return e.endsWith('@enterprise.com')
    ? 'https://example.com/enterprise-thankyou'
    : 'https://example.com/thankyou';
}
