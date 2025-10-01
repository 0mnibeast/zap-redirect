export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req) {
  const inUrl = new URL(req.url);
  const form = Object.fromEntries(inUrl.searchParams.entries());

  const job_id = crypto.randomUUID();
  const origin = inUrl.origin;
  const callback_url = `${origin}/api/callback`;

  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) {
    return new Response('Missing ZAPIER_CATCH_HOOK_URL (set the **LIVE** Catch Hook URL and redeploy)', { status: 500 });
  }

  // --- await + retry once ---
  const payload = JSON.stringify({ job_id, callback_url, form });
  const headers = { 'content-type': 'application/json', 'x-request-id': job_id };
  let ok = false, lastErr = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch(hook, { method: 'POST', headers, body: payload, cache: 'no-store' });
      ok = r.ok;
      if (!ok) lastErr = `${r.status} ${await r.text().catch(()=>'')}`;
      if (ok) break;
    } catch (e) {
      lastErr = String(e?.message || e);
    }
    await new Promise(res => setTimeout(res, 150)); // tiny backoff
  }

  if (!ok) {
    return new Response(
      `Failed to notify Zap (check Zap is ON and URL is LIVE). Last error: ${lastErr}`,
      { status: 502, headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } }
    );
  }

  // Processing page that polls /status and redirects when your Zap posts back
  const timeoutMs = 120000;
 const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Processing…</title>
<style>
  :root {
    --zapier-orange: #ff4f00;
    --zapier-orange-2: #ff7a33; /* lighter blend for gradient */
    --text: #ffffff;
    --text-dim: rgba(255,255,255,0.85);
    --shadow: rgba(0,0,0,0.18);
    --spinner: #ffffff;
  }
  html, body { height: 100%; margin: 0; }
  body {
    display: grid;
    place-items: center;
    background: radial-gradient(1200px 800px at 30% 20%, var(--zapier-orange-2), var(--zapier-orange));
    font: 16px/1.4 system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
    color: var(--text);
  }
  .card {
    text-align: center;
    padding: 56px 36px;
    border-radius: 20px;
    background: rgba(255,255,255,0.06);
    box-shadow: 0 10px 30px var(--shadow);
    backdrop-filter: blur(6px);
    max-width: 560px;
    width: min(92vw, 560px);
  }
  h1 {
    margin: 0 0 12px;
    font-size: clamp(22px, 4vw, 32px);
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  p {
    margin: 0;
    color: var(--text-dim);
    font-size: clamp(14px, 2.2vw, 16px);
  }
  .spinner {
    margin: 26px auto 24px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 4px solid rgba(255,255,255,0.35);
    border-top-color: var(--spinner);
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hint {
    margin-top: 14px;
    font-size: 12px;
    opacity: 0.85;
  }
</style>
<body>
  <div class="card" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Hang tight while we find your dedicated sales rep!</h1>
    <p>We’re finishing your submission — this usually takes a few seconds.</p>
    <p class="hint">You’ll be redirected automatically.</p>
  </div>

  <script>
    const jobId = ${JSON.stringify(job_id)};
    const origin = ${JSON.stringify(origin)};
    const start = Date.now();
    const timeoutMs = ${timeoutMs};

    async function poll() {
      try {
        const r = await fetch(origin + '/api/status?job_id=' + jobId, { cache: 'no-store' });
        const j = await r.json();
        if (j && j.redirect_url) {
          top.location.replace(j.redirect_url);
          return;
        }
      } catch (e) { /* ignore */ }
      if (Date.now() - start > timeoutMs) {
        top.location.replace('/thanks'); // optional fallback
        return;
      }
      setTimeout(poll, 800);
    }
    poll();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'pragma': 'no-cache'
    }
  });
}
