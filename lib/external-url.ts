import { NextRequest } from 'next/server';

export function externalAppOrigin(request: NextRequest) {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    try { return new URL(configured).origin; } catch { console.error('Invalid APP_URL configuration'); }
  }
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host')?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const proto = forwardedProto || request.nextUrl.protocol.replace(':', '');
  if (host && !/^0\.0\.0\.0(?::\d+)?$/i.test(host) && !/^localhost(?::\d+)?$/i.test(host)) return `${proto === 'http' ? 'http' : 'https'}://${host}`;
  return request.nextUrl.origin;
}
