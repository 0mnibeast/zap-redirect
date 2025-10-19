(function(){
  const s = document.currentScript;
  const ttheme = (s.dataset.ttheme || 'default').toLowerCase();
  const key    = (s.dataset.key || 'default').toLowerCase();

  // Build the processing iframe (no style in URL)
  const frame = document.createElement('iframe');
  frame.id = s.dataset.id || 'lead-frame';
  frame.style.cssText = s.dataset.style || 'max-width:900px;width:100%;height:500px;border:0;';
  frame.src = `/t/${ttheme}/api/submit?_ts=${Date.now()}`;
  s.parentNode.insertBefore(frame, s);

  // Fetch theme from your API (near-zero latency)
  fetch(`/api/styles/get?ttheme=${encodeURIComponent(ttheme)}&key=${encodeURIComponent(key)}`, { cache: 'no-store' })
    .then(r => r.json())
    .then(({ theme }) => {
      const cfg = {
        target: (theme?.target || 'parent').toLowerCase(),
        theme: {
          bg: theme?.bg,
          msg: theme?.msg,
          anim: (theme?.anim || 'spinner').toLowerCase(),
          spinColor: theme?.spinColor
        }
      };

      // Listen for processing page handshake + messages
      function onMsg(ev){
        const m = ev.data || {};
        if (m.type === 'zap-config-request') {
          frame.contentWindow?.postMessage({ type:'zap-config', cfg }, '*');
        } else if (m.type === 'zap-redirect' && typeof m.url === 'string') {
          try { frame.src = m.url; } catch { window.open(m.url, '_blank', 'noopener'); }
        } else if ((m.type === 'frame-height' || m.type === 'resize') && typeof m.height === 'number') {
          frame.style.height = m.height + 'px';
        }
      }
      window.addEventListener('message', onMsg);

      // Push config even if request is missed
      setTimeout(() => frame.contentWindow?.postMessage({ type:'zap-config', cfg }, '*'), 1200);
    })
    .catch(err => console.warn('theme load failed', err));
})();
