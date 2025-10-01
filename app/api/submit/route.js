export const runtime = 'edge';

export async function POST(req) {
  const ct = req.headers.get('content-type') || '';
  let form = {};
  try {
    if (ct.includes('application/json')) form = await req.json();
    else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const fd = await req.formData();
      form = Object.fromEntries(fd.entries());
    } else {
      const raw = await req.text();
      try { form = JSON.parse(raw); } catch { form = { raw }; }
    }
  } catch {}

  const job_id = crypto.randomUUID();
  const origin = new URL(req.url).origin;
  const callback_url = `${origin}/api/callback`;

  // send to Zapier
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });
  await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ job_id, callback_url, form })
  });

  // return processing page that polls /status
  const html = `<!doctype html><meta charset="utf-8">
  <title>Processing…</title>
  <style>body{font:16px system-ui;padding:2rem;}</style>
  <h1>Processing…</h1>
  <p><b>job_id:</b> ${job_id}</p>
  <script>
    const jobId=${JSON.stringify(job_id)}, origin=${JSON.stringify(origin)};
    const start=Date.now(), timeoutMs=120000;
    (async function poll(){
      try {
        const r=await fetch(origin+'/api/status?job_id='+jobId,{cache:'no-store'});
        const j=await r.json();
        if(j && j.redirect_url){ top.location.replace(j.redirect_url); return; }
      }catch(e){}
      if(Date.now()-start>timeoutMs){ top.location.replace('/thanks'); return; }
      setTimeout(poll,800);
    })();
  </script>`;
  return new Response(html, { headers: { 'content-type': 'text/html', 'cache-control': 'no-store' } });
}
