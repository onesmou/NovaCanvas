import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';

export const runtime='nodejs';

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const user=await getCurrentUser();
  if(!user)return NextResponse.json({error:'请先登录'},{status:401});
  const body=await request.json() as {status?:string};
  if(body.status!=='complete')return NextResponse.json({error:'不支持的项目状态'},{status:400});
  await ensureSelfHostedSchema();
  const {id}=await params;
  const rows=await db()<Array<{id:string}>>`UPDATE projects SET status='complete',updated_at=now() WHERE id=${id} AND owner_id=${user.id} AND EXISTS (SELECT 1 FROM generated_assets WHERE project_id=${id}) RETURNING id`;
  if(!rows[0])return NextResponse.json({error:'项目不存在、无权操作或尚无素材'},{status:404});
  return NextResponse.json({ok:true,status:'complete'});
}
