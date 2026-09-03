import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const { key } = await params;
  const id = key?.[0];
  if (!id) return NextResponse.json({ error: '素材不存在' }, { status: 404 });
  await ensureSelfHostedSchema();
  const rows = await db()<Array<{ storageKey: string; thumbnailKey: string | null; mimeType: string }>>`
    SELECT storage_key AS "storageKey",thumbnail_key AS "thumbnailKey",mime_type AS "mimeType"
    FROM generated_assets WHERE id=${id} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;
  const asset = rows[0];
  if (!asset) return NextResponse.json({ error: '素材不存在或无权访问' }, { status: 404 });
  const safeName = path.basename(asset.storageKey);
  if (safeName !== asset.storageKey) return NextResponse.json({ error: '素材路径无效' }, { status: 400 });
  try {
    const dataDir = process.env.ASSET_DATA_DIR || path.join(process.cwd(), 'data');
    const download = request.nextUrl.searchParams.get('download') === '1';
    const useThumbnail = request.nextUrl.searchParams.get('thumb') === '1' && !download && asset.thumbnailKey;
    const fileName = useThumbnail ? path.basename(asset.thumbnailKey!) : safeName;
    const folder = useThumbnail ? 'thumbs' : 'assets';
    const data = await readFile(path.join(dataDir, folder, fileName));
    return new NextResponse(data, { headers: { 'Content-Type': useThumbnail ? 'image/webp' : asset.mimeType, 'Cache-Control': 'private, max-age=31536000, immutable', 'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"` } });
  } catch { return NextResponse.json({ error: '素材文件暂时不可用' }, { status: 404 }); }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: '请先登录' }, { status: 401 });
  const { key } = await params;
  const id = key?.[0];
  if (!id) return NextResponse.json({ error: '素材不存在' }, { status: 404 });
  await ensureSelfHostedSchema();
  const rows = await db()<Array<{ id: string; projectId: string; rootAssetId: string | null; storageKey: string; thumbnailKey: string | null }>>`
    SELECT id,project_id AS "projectId",root_asset_id AS "rootAssetId",storage_key AS "storageKey",thumbnail_key AS "thumbnailKey"
    FROM generated_assets WHERE id=${id} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;
  const asset = rows[0];
  if (!asset) return NextResponse.json({ error: '素材不存在或无权删除' }, { status: 404 });
  const root = asset.rootAssetId || asset.id;
  const deletingRoot = asset.id === root;
  const targets = deletingRoot
    ? await db()<Array<{ id: string; storageKey: string; thumbnailKey: string | null }>>`SELECT id,storage_key AS "storageKey",thumbnail_key AS "thumbnailKey" FROM generated_assets WHERE root_asset_id=${root}`
    : [asset];
  await db()`DELETE FROM generated_assets WHERE id = ANY(${targets.map(item => item.id)})`;
  if (!deletingRoot) {
    const [latest] = await db()<Array<{ id: string }>>`SELECT id FROM generated_assets WHERE root_asset_id=${root} ORDER BY version_number DESC LIMIT 1`;
    if (latest) await db()`UPDATE generated_assets SET is_current=(id=${latest.id}) WHERE root_asset_id=${root}`;
  }
  await db()`UPDATE projects SET image_count=GREATEST(0,image_count-${targets.length}),updated_at=now() WHERE id=${asset.projectId}`;
  const dataDir = process.env.ASSET_DATA_DIR || path.join(process.cwd(), 'data');
  await Promise.all(targets.flatMap(item => [
    unlink(path.join(dataDir, 'assets', path.basename(item.storageKey))).catch(() => undefined),
    item.thumbnailKey ? unlink(path.join(dataDir, 'thumbs', path.basename(item.thumbnailKey))).catch(() => undefined) : Promise.resolve(),
  ]));
  return NextResponse.json({ ok: true, deleted: targets.length });
}
