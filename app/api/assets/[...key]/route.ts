import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';
export const runtime='nodejs';
export async function GET(_request:NextRequest,{params}:{params:Promise<{key:string[]}>}){
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:'请先登录'},{status:401});const {key}=await params;const id=key?.[0];if(!id)return NextResponse.json({error:'素材不存在'},{status:404});
  await ensureSelfHostedSchema();const rows=await db()<Array<{storageKey:string;mimeType:string}>>`SELECT storage_key AS "storageKey", mime_type AS "mimeType" FROM generated_assets WHERE id=${id} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;
  const asset=rows[0];if(!asset)return NextResponse.json({error:'素材不存在或无权访问'},{status:404});const safeName=path.basename(asset.storageKey);if(safeName!==asset.storageKey)return NextResponse.json({error:'素材路径无效'},{status:400});
  try{const dataDir=process.env.ASSET_DATA_DIR||path.join(process.cwd(),'data');const data=await readFile(path.join(dataDir,'assets',safeName));return new NextResponse(data,{headers:{'Content-Type':asset.mimeType,'Cache-Control':'private, max-age=31536000, immutable','Content-Disposition':`inline; filename="${safeName}"`}});}catch{return NextResponse.json({error:'素材文件暂时不可用'},{status:404});}
}
