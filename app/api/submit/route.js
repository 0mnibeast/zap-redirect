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
  const html = `<!doctype html><meta charset="utf-8"><title>Processing…</title>
  <style>body{font:16px system-ui;margin:3rem;line-height:1.45}</style>
  <h1>Processing…</h1>
  <p style="color:#666">Job: <code>${job_id}</code></p>
  <script>
    const jobId=${JSON.stringify(job_id)}, origin=${JSON.stringify(origin)};
    const start=Date.now(), timeoutMs=${timeoutMs};
    (async function poll(){
      try{
        const r=await fetch(origin + '/api/status?job_id=' + jobId, {cache:'no-store'});
        const j=await r.json();
        if (j && j.redirect_url) { top.location.replace(j.redirect_url); return; }
      }catch{}
      if (Date.now()-start > timeoutMs) { top.location.replace('/thanks'); return; }
      setTimeout(poll, 800);
    })();
  </script>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
