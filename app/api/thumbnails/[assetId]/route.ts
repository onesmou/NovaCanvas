import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { validThumbnailToken } from '../../../../lib/thumbnail-access';
import { readThumbnail, thumbnailCdnUrl } from '../../../../lib/image-storage';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const key = request.nextUrl.searchParams.get('k') || '';
  const ownerId = request.nextUrl.searchParams.get('o') || '';
  const expires = Number(request.nextUrl.searchParams.get('e'));
  const token = request.nextUrl.searchParams.get('s') || '';
  if (key !== path.basename(key) || !key.endsWith('.webp') || !validThumbnailToken(assetId, key, ownerId, expires, token)) return new NextResponse(null, { status: 404 });
  try {
    const cdnUrl=thumbnailCdnUrl(key);if(cdnUrl)return NextResponse.redirect(cdnUrl,302);
    const data = await readThumbnail(key);
    return new NextResponse(new Uint8Array(data), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400, immutable' } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
