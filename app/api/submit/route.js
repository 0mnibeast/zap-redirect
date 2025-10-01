export const runtime = 'edge';

export async function POST(req) {
  const ct = req.headers.get('content-type') || '';
  let form = {};
  try {
    if (ct.includes('application/json')) form = await req.json();
    else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await req.formData(); form = Object.fromEntries(fd.entries());
    } else { const raw = await req.text(); try { form = JSON.parse(raw); } catch { form = { raw }; } }
  } catch {}

  const job_id = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/callback`;

  // send to Zap
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });
  await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ job_id, callback_url, form })
  });

  const html = `<!doctype html><meta charset="utf-8"><title>Processing…</title>
  <style>body{font:16px system-ui;max-width:680px;margin:2rem auto;line-height:1.4}</style>
  <h1>Processing…</h1>
  <p><b>job_id:</b> <code id="jid">${job_id}</code></p>
  <p>Status endpoint: <a id="slink" target="_blank" href="${origin}/api/status?job_id=${job_id}">${origin}/api/status?job_id=${job_id}</a></p>
  <pre id="log" style="background:#f6f8fa;padding:12px;border-radius:8px;max-height:260px;overflow:auto"></pre>
  <script>
    const jobId=${JSON.stringify(job_id)}, origin=${JSON.stringify(origin)};
    const timeoutMs=120000, started=Date.now(), logEl=document.getElementById('log');
    function log(s){ logEl.textContent += s + "\\n"; }
    async function poll(){
      try{
        const r=await fetch(origin+'/api/status?job_id='+jobId, {cache:'no-store'});
        const j=await r.json();
        log(new Date().toISOString()+" → "+JSON.stringify(j));
        if(j && j.redirect_url){ top.location.replace(j.redirect_url); return; }
      }catch(e){ log("error: "+(e&&e.message||e)); }
      if(Date.now()-started>timeoutMs){ log("timeout → /thanks"); top.location.replace('/thanks'); return; }
      setTimeout(poll, 800);
    }
    poll();
  </script>`;
  return new Response(html, { headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } });
}

export async function GET() {
  return new Response(`<!doctype html><p>Submit is live.</p>
  <form method="post"><input name="email" placeholder="email"><button>Test</button></form>`,
  { headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } });
}
