(function(){
  const s = document.currentScript;
  const tenant = s.dataset.tenant || 'default';
  const params = new URLSearchParams({
    target: s.dataset.target || 'parent',
    bg: s.dataset.bg || '#ff4f00',
    anim: s.dataset.anim || 'circle',
    msg: s.dataset.msg || 'Routing...',
    _ts: Date.now()
  });
  const iframe = document.createElement('iframe');
  iframe.src = `https://<your-app>.vercel.app/t/${tenant}/api/submit?${params}`;
  iframe.style = 'width:100%;height:100%;border:0;';
  s.parentNode.insertBefore(iframe, s);
})();
