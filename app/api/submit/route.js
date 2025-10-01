export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  // 1) Gather the form fields that Interfaces added as ?foo=bar
  const inUrl = new URL(req.url);
  const form = Object.fromEntries(inUrl.searchParams.entries());

  // 2) Make job + callback url
  const job_id = crypto.randomUUID();
  const origin = inUrl.origin;
  const callback_url = `${origin}/api/callback`;

  // 3) Kick off your Zap (fire-and-forget; DO NOT await)
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) {
    return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });
  }
  fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ job_id, callback_url, form })
  }).catch(() => {});

  // 4) Return a tiny page that polls /api/status until Zap responds
  const timeoutMs = 120000; // 2 minutes while testing
  const html = `<!doctype html><meta charset="utf-8">
  <title>Processing…</title>
  <style>body{font:16px system-ui;margin:3rem;max-width:680px;line-height:1.45}</style>
  <h1>Processing…</h1>
  <p>We’re finishing your submission. This usually takes a few seconds.</p>
  <p style="color:#666">Job: <code>${job_id}</code></p>
  <script>
    const jobId = ${JSON.stringify(job_id)};
    const origin = ${JSON.stringify(origin)};
    const started = Date.now();
    const timeoutMs = ${timeoutMs};

    async function poll() {
      try {
        const r = await fetch(origin + '/api/status?job_id=' + jobId, { cache: 'no-store' });
        const j = await r.json();
        if (j && j.redirect_url) {
          top.location.replace(j.redirect_url);
          return;
        }
      } catch (_) {}
      if (Date.now() - started > timeoutMs) {
        // optional: default/fallback if the Zap never replies
        top.location.replace('/thanks');
        return;
      }
      setTimeout(poll, 800);
    }
    poll();
  </script>`;
  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}
