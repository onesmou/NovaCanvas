import { createHmac, timingSafeEqual } from 'node:crypto';

const DAY = 86_400;
const secret = process.env.ASSET_URL_SECRET || process.env.DATABASE_URL || 'novacanvas-thumbnail-secret';

function signature(assetId: string, thumbnailKey: string, ownerId: string, expires: number) {
  return createHmac('sha256', secret).update(`${assetId}|${thumbnailKey}|${ownerId}|${expires}`).digest('base64url');
}

export function thumbnailUrl(assetId: string, thumbnailKey: string, ownerId: string) {
  const expires = (Math.floor(Date.now() / 1000 / DAY) + 2) * DAY;
  const token = signature(assetId, thumbnailKey, ownerId, expires);
  return `/api/thumbnails/${assetId}?k=${encodeURIComponent(thumbnailKey)}&o=${ownerId}&e=${expires}&s=${token}`;
}

export function validThumbnailToken(assetId: string, thumbnailKey: string, ownerId: string, expires: number, token: string) {
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(assetId, thumbnailKey, ownerId, expires));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
