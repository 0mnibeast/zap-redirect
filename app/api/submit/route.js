export const runtime = 'edge'; // run on Vercel Edge (fast, free tier)

export async function POST(req) {
  const contentType = req.headers.get('content-type') || '';
  let payload = {};

  if (contentType.includes('application/json')) {
    payload = await req.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const fd = await req.formData();
    payload = Object.fromEntries(fd.entries());
  } else {
    payload.raw = await req.text();
  }

  // Fire your Zap in the background (no waiting)
  const hook = process.env.ZAPIER_CATCH_HOOK_URL;
  if (hook) {
    fetch(hook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {});
  }

  // Compute where to send the user (replace with your own logic)
  const redirectUrl = chooseRedirect(payload);

  // Real HTTP redirect
  return new Response(null, { status: 302, headers: { Location: redirectUrl } });
}

