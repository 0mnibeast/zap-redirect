export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req) {
  const inUrl = new URL(req.url);
  const form = Object.fromEntries(inUrl.searchParams.entries());

  const target = (inUrl.searchParams.get('target') || 'top').toLowerCase();
  const bg = decodeURIComponent(inUrl.searchParams.get('bg') || '#ff4f00'); // default Zapier orange
  const msg = decodeURIComponent(inUrl.searchParams.get('msg') || 'Hang tight while we route your request…');

  const job_id = crypto.randomUUID();
  const origin = inUrl.origin;
  const callback_url = `${origin}/api/callback`;
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;

  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });

  const payload = JSON.stringify({ job_id, callback_url, form });
  const headers = { 'content-type': 'application/json', 'x-request-id': job_id, 'cache-control': 'no-store' };
  await fetch(hook, { method: 'POST', headers, body: payload, cache: 'no-store' }).catch(() => {});

  const timeoutMs = 120000;

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Loading…</title>
<style>
  html, body {
    height: 100%;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${bg};
    color: white;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }
  .spinner {
    width: 60px;
    height: 60px;
    border: 6px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .msg {
    font-size: 1.1rem;
    font-weight: 500;
    text-align: center;
    margin-bottom: 8px;
  }
  .job {
    font-size: 0.75rem;
    text-align: center;
    opacity: 0.7;
  }
</style>
<body>
  <div>
    <div class="spinner"></div>
    <div class="msg">${msg}</div>
    <div class="job">Job: ${job_id}</div>
  </div>

  <script>
    const jobId=${JSON.stringify(job_id)}, origin=${JSON.stringify(origin)}, target=${JSON.stringify(target)};
    const start=Date.now(), timeoutMs=${timeoutMs};

    function navigate(url){
      try{
        if(target==='frame'){ window.location.replace(url); }
        else if(target==='parent'){ parent.postMessage({type:'zap-redirect',url},'*'); }
        else{ top.location.replace(url); }
      }catch{ window.location.href=url; }
    }

    (async function poll(){
      try{
        const r=await fetch(origin+'/api/status?job_id='+jobId,{cache:'no-store'});
        const j=await r.json();
        if(j && j.redirect_url){ navigate(j.redirect_url); return; }
      }catch{}
      if(Date.now()-start>timeoutMs){ navigate('/thanks'); return; }
      setTimeout(poll,800);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      pragma: 'no-cache'
    }
  });
}
