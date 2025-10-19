// app/t/[tenant]/api/submit/route.js
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET(req, context) {
  const inUrl = new URL(req.url);
  const form = Object.fromEntries(inUrl.searchParams.entries());

  // Tenant from path segment
  const tenant_id = (context?.params?.tenant || 'default').toLowerCase();

  // Redirect scope default; parent-config may override it later
  const urlTarget = (inUrl.searchParams.get('target') || 'top').toLowerCase();

  // Create job + callback
  const job_id = crypto.randomUUID();
  const origin = inUrl.origin;
  const callback_url = `${origin}/t/${tenant_id}/api/callback`;

  // Notify Zapier (multi-tenant payload)
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (!hook) return new Response('Missing ZAPIER_CATCH_HOOK_URL', { status: 500 });

  const payload = JSON.stringify({ tenant_id, job_id, callback_url, form });
  const headers = {
    'content-type': 'application/json',
    'x-request-id': job_id,
    'cache-control': 'no-store',
  };

  try {
    await fetch(hook, { method: 'POST', headers, body: payload, cache: 'no-store' });
  } catch (e) {
    return new Response(`Failed to notify Zap: ${String(e?.message || e)}`, {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }

  const timeoutMs = 120000;

  const html = `<!doctype html>
<html lang="en">
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Loading…</title>
<style>
  :root { --spinColor: #ffffff; }
  html,body{
    height:100%;margin:0;display:flex;align-items:center;justify-content:center;
    background:#ff4f00;color:white; /* default bg; parent config can override */
    font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  }

  /* ===== Animations (default = spinner; parent config can swap) ===== */
  .spinner{width:60px;height:60px;border:6px solid rgba(255,255,255,0.3);
    border-top-color:var(--spinColor);border-radius:50%;
    animation:spin 1s linear infinite;margin:0 auto 24px;}
  @keyframes spin{to{transform:rotate(360deg)}}

  .pulse{width:40px;height:40px;border-radius:50%;background:var(--spinColor);
    animation:pulse 1.2s ease-in-out infinite;margin:0 auto 24px;}
  @keyframes pulse{0%,100%{transform:scale(.8);opacity:.6;}50%{transform:scale(1.2);opacity:1;}}

  .bar{width:60px;height:8px;border-radius:4px;background:var(--spinColor);
    animation:bar 1s ease-in-out infinite alternate;margin:0 auto 24px;}
  @keyframes bar{from{transform:scaleX(.3);opacity:.5;}to{transform:scaleX(1);opacity:1;}}

  .wave{display:flex;justify-content:center;align-items:end;height:40px;gap:3px;margin:0 auto 24px;}
  .wave div{width:6px;height:10px;background:var(--spinColor);
    animation:wave 1.2s ease-in-out infinite;}
  .wave div:nth-child(1){animation-delay:0s;}
  .wave div:nth-child(2){animation-delay:0.1s;}
  .wave div:nth-child(3){animation-delay:0.2s;}
  .wave div:nth-child(4){animation-delay:0.3s;}
  .wave div:nth-child(5){animation-delay:0.4s;}
  @keyframes wave{0%,100%{height:10px;opacity:.5;}50%{height:40px;opacity:1;}}

  .dots{display:flex;justify-content:center;gap:8px;margin:0 auto 24px;}
  .dots span{width:10px;height:10px;background:var(--spinColor);border-radius:50%;
    animation:dots 1.2s ease-in-out infinite;}
  .dots span:nth-child(2){animation-delay:.2s;}
  .dots span:nth-child(3){animation-delay:.4s;}
  @keyframes dots{0%,80%,100%{transform:scale(0);opacity:.5;}40%{transform:scale(1);opacity:1;}}

  .zlogo{width:64px;height:64px;margin:0 auto 24px;
    color:var(--spinColor);animation:zlogo 1.2s ease-in-out infinite alternate;}
  .zlogo svg{width:100%;height:100%;}
  @keyframes zlogo{0%{transform:scale(.9);opacity:.8;}100%{transform:scale(1.1);opacity:1;}}

  .msg{text-align:center;font-size:1.1rem;font-weight:500;margin-bottom:8px;}
  .job{text-align:center;font-size:.75rem;opacity:.7;}
</style>
<body>
  <div>
    <div id="anim" class="spinner"></div>
    <div class="msg">Hang tight while we route your request…</div>
    <div class="job">Job: ${job_id} • Tenant: ${tenant_id}</div>
  </div>

  <script>
    const jobId   = ${JSON.stringify(job_id)};
    const tenantId= ${JSON.stringify(tenant_id)};
    const origin  = ${JSON.stringify(origin)};
    let   target  = ${JSON.stringify(urlTarget)}; // may be overridden by parent config
    const start   = Date.now();
    const timeoutMs = ${timeoutMs};

    // --- Auto-resize so the parent iframe fits this page ---
    (function autoResizeUp(){
      function send(){
        const h = Math.max(
          document.body.scrollHeight, document.documentElement.scrollHeight,
          document.body.offsetHeight,  document.documentElement.offsetHeight
        );
        parent.postMessage({ type:'frame-height', height:h }, '*');
      }
      send();
      const ro = new ResizeObserver(send);
      ro.observe(document.body);
      setInterval(send, 1000);
    })();

    // --- Accept theme/target config from parent (no URL params needed) ---
    try { parent.postMessage({ type:'zap-config-request' }, '*'); } catch {}
    window.addEventListener('message', (ev) => {
      const m = ev.data || {};
      if (m.type === 'zap-config' && m.cfg) {
        const t = (m.cfg.theme || {});
        if (m.cfg.target) target = (m.cfg.target + '').toLowerCase();

        if (t.bg) document.body.style.background = t.bg;
        if (t.spinColor) document.documentElement.style.setProperty('--spinColor', t.spinColor);
        if (t.msg) {
          const el = document.querySelector('.msg');
          if (el) el.textContent = t.msg;
        }

        // swap animation node if requested
        const animName = (t.anim || '').toLowerCase();
        if (animName) {
          const host = document.getElementById('anim');
          if (host) {
            let html =
              animName==='pulse' ? '<div class="pulse"></div>' :
              animName==='bar'   ? '<div class="bar"></div>'   :
              animName==='wave'  ? '<div class="wave"><div></div><div></div><div></div><div></div><div></div></div>' :
              animName==='dots'  ? '<div class="dots"><span></span><span></span><span></span></div>' :
              animName==='zlogo' ? '<div class="zlogo"><svg viewBox="0 0 32 32"><path d="M3 6h26v5l-14 15h14v5H3v-5l14-15H3z" fill="currentColor"/></svg></div>' :
                                   '<div class="spinner"></div>';
            host.outerHTML = html; // replace
          }
        }
      }
    });

    // --- Safer navigate: prefer in-frame if embedded & target is wrong/missing ---
    function navigate(url){
      const inIframe = window.self !== window.top;
      try{
        if (target === 'frame' || (inIframe && target !== 'parent')) {
          window.location.replace(url);   // keep inside the iframe
        } else if (target === 'parent') {
          parent.postMessage({ type:'zap-redirect', url }, '*');
        } else {
          top.location.replace(url);      // only when not embedded
        }
      }catch{
        window.location.href = url;
      }
    }

    // --- Poll Supabase-backed status for the redirect_url ---
    (async function poll(){
      try{
        const r = await fetch(origin + '/t/' + tenantId + '/api/status?job_id=' + jobId, { cache:'no-store' });
        const j = await r.json();
        if (j && j.redirect_url) { navigate(j.redirect_url); return; }
      }catch{}
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
      'pragma': 'no-cache',
    },
  });
}
