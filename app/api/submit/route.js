// app/api/submit/route.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
  const inUrl = new URL(req.url);
  const form = Object.fromEntries(inUrl.searchParams.entries());

  // NEW: choose how to redirect when the Zap returns the final URL
  // target=frame  -> only the embedded iframe navigates
  // target=top    -> whole browser window navigates (default)
  // target=parent -> send a postMessage; parent decides
  const target = (inUrl.searchParams.get('target') || 'top').toLowerCase();

  // 1) Make job + callback and notify Zap (await + retry)
  const job_id = crypto.randomUUID();
  const origin = inUrl.origin;
  const callback_url = `${origin}/api/callback`;

  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });

  const payload = JSON.stringify({ job_id, callback_url, form });
  const headers = { 'content-type': 'application/json', 'x-request-id': job_id, 'cache-control': 'no-store' };
  let ok = false, lastErr = '';
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(hook, { method: 'POST', headers, body: payload, cache: 'no-store' });
      ok = r.ok;
      if (ok) break;
      lastErr = `${r.status} ${await r.text().catch(()=> '')}`;
    } catch (e) { lastErr = String(e?.message || e); }
    await new Promise(res => setTimeout(res, 150));
  }
  if (!ok) {
    return new Response(`Failed to notify Zap: ${lastErr}`, {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }

  // 2) Branded processing page that polls /api/status and then redirects
  const timeoutMs = 120000;
  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Processing…</title>
<style>
  :root { --zapier-orange:#ff4f00; --zapier-orange-2:#ff7a33; --text:#fff; --dim:rgba(255,255,255,.85); --shadow:rgba(0,0,0,.18); }
  html,body{height:100%;margin:0}
  body{display:grid;place-items:center;background:radial-gradient(1200px 800px at 30% 20%,var(--zapier-orange-2),var(--zapier-orange));
       font:16px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial;color:var(--text)}
  .card{padding:56px 36px;border-radius:20px;background:rgba(255,255,255,.06);box-shadow:0 10px 30px var(--shadow);backdrop-filter:blur(6px);text-align:center;width:min(92vw,560px)}
  h1{margin:0 0 10px;font-size:clamp(22px,4vw,32px);font-weight:700}
  p{margin:0;color:var(--dim);font-size:clamp(14px,2.2vw,16px)}
  .spinner{margin:26px auto 24px;width:44px;height:44px;border-radius:50%;border:4px solid rgba(255,255,255,.35);border-top-color:#fff;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
<body>
  <div class="card" role="status" aria-live="polite">
    <div class="spinner" aria-hidden="true"></div>
    <h1>Hang tight while we find your dedicated sales rep!</h1>
    <p>We’re finishing your submission — this usually takes a few seconds.</p>
  </div>
  <script>
    const jobId = ${JSON.stringify(job_id)};
    const origin = ${JSON.stringify(origin)};
    const target = ${JSON.stringify(target)};
    const start = Date.now();
    const timeoutMs = ${timeoutMs};

    function navigate(url){
      try {
        if (target === 'frame') {
          // stay inside the embed only
          window.location.replace(url);
        } else if (target === 'parent') {
          // let the parent page handle it (e.g., update a section/SPA route)
          parent.postMessage({ type: 'zap-redirect', url }, '*');
        } else {
          // default: redirect the whole browser window
          top.location.replace(url);
        }
      } catch (e) {
        // last-resort: same-frame
        window.location.href = url;
      }
    }

    (async function poll(){
      try {
        const r = await fetch(origin + '/api/status?job_id=' + jobId, { cache: 'no-store' });
        const j = await r.json();
        if (j && j.redirect_url) { navigate(j.redirect_url); return; }
      } catch {}
      if (Date.now() - start > timeoutMs) { navigate('/thanks'); return; }
      setTimeout(poll, 800);
    })();
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
