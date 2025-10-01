export const runtime = 'edge';

export async function POST(req) {
  // --- parse body (json or form) ---
  const ct = req.headers.get('content-type') || '';
  let form = {};
  try {
    if (ct.includes('application/json')) {
      form = await req.json();
    } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      form = Object.fromEntries(fd.entries());
    } else {
      const raw = await req.text();
      try { form = JSON.parse(raw); } catch { form = { raw }; }
    }
  } catch (_) {}

  // --- make job + callback ---
  const job_id = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/callback`;

  // --- send to Zapier (await once while debugging) ---
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });
  await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ job_id, callback_url, form })
  });

  // --- processing page (NO 302) ---
  const buildTag = 'build-2025-09-30-1'; // <-- change if you want to force-verify updates
  const html = `<!doctype html><meta charset="utf-8">
<title>Processing…</title>
<p>One moment… (${buildTag})</p>
<script>
  const jobId = ${JSON.stringify(job_id)};
  const start = Date.now(), timeoutMs = 60000, fallback = "/thanks";
  (async function poll(){
    try {
      const r = await fetch(${JSON.stringify(origin)} + '/api/status?job_id=' + jobId, { cache: 'no-store' });
      const j = await r.json();
      if (j.redirect_url) { top.location.replace(j.redirect_url); return; }
    } catch (e) {}
    if (Date.now() - start > timeoutMs) { top.location.replace(fallback); return; }
    setTimeout(poll, 600);
  })();
</script>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html', 'cache-control': 'no-store' }
  });
}

export async function GET() {
  const buildTag = 'build-2025-09-30-1';
  return new Response(`<!doctype html><p>Submit endpoint is live (${buildTag}).</p>
    <form method="post"><input name="email" placeholder="email"/><button>Test</button></form>`, {
    headers: { 'content-type': 'text/html', 'cache-control': 'no-store' }
  });
}
