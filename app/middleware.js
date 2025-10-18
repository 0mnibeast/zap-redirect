// middleware.js
import { NextResponse } from 'next/server';

const PUBLIC_ASSET_PREFIXES = [
  '/_next', '/favicon', '/robots.txt', '/sitemap', '/manifest', '/assets', '/static'
];

// Treat these as "base" hosts (no subdomain tenant extraction)
const BASE_HOSTS = new Set([
  'yourdomain.com',
  'www.yourdomain.com',
  // keep vercel host base-like
  // replace with your real vercel project host if you want to treat it as base:
  // '<your-app>.vercel.app'
]);

export function middleware(req) {
  const url = req.nextUrl.clone();

  // Skip static/public assets
  if (PUBLIC_ASSET_PREFIXES.some(p => url.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If already under /t/:tenant, do nothing
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 't' && parts[1]) {
    return NextResponse.next();
  }

  const host = req.headers.get('host') || '';
  const isBase = BASE_HOSTS.has(host) || host.endsWith('.vercel.app');

  // 1) Subdomain → /t/:tenant
  if (!isBase) {
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
    url.searchParams.delete('tenant_id'); // optional: keep URL pretty
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/heartbeat).*)'],
};
