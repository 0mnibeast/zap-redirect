// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ASSET_PREFIXES = [
  '/_next', '/favicon', '/robots.txt', '/sitemap', '/manifest', '/assets', '/static'
];

// Change this to your apex prod host if you want to treat it as "base"
const BASE_HOSTS = new Set([
  'yourdomain.com',
  'www.yourdomain.com',
  // also allow your Vercel preview/prod hosts to behave as base
  'your-app.vercel.app'
]);

export function middleware(req: NextRequest) {
  const { nextUrl, headers } = req;
  const url = nextUrl.clone();

  // Skip static/public assets
  if (PUBLIC_ASSET_PREFIXES.some(p => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If already under /t/:tenant, do nothing
  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts[0] === 't' && pathParts[1]) {
    return NextResponse.next();
  }

  const host = headers.get('host') || '';
  const isBaseHost = BASE_HOSTS.has(host) || host.endsWith('.vercel.app');

  // 1) Subdomain → /t/:tenant
  if (!isBaseHost) {
    const [sub] = host.split('.');
    const tenant = sub && sub.toLowerCase() !== 'www' ? sub.toLowerCase() : '';
    if (tenant) {
      url.pathname = `/t/${tenant}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 2) ?tenant_id=acme → /t/acme/...
  const tenantParam = url.searchParams.get('tenant_id');
  if (tenantParam) {
    url.pathname = `/t/${tenantParam}${url.pathname}`;
    // we can drop tenant_id from query to keep pretty URLs
    url.searchParams.delete('tenant_id');
    return NextResponse.rewrite(url);
  }

  // otherwise passthrough
  return NextResponse.next();
}

export const config = {
  // Run on all routes
  matcher: ['/((?!api/heartbeat).*)'],
};
