import { NextRequest, NextResponse } from 'next/server';
import { changeCredits } from '../../../../lib/credits';
import { requireAdmin } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';
import { externalAppOrigin } from '../../../../lib/external-url';

export const runtime='nodejs';
export async function POST(request:NextRequest){
  const operator=await requireAdmin('/admin');const form=await request.formData();const userId=String(form.get('userId')||'');const delta=Number(form.get('delta'));const note=String(form.get('note')||'').trim();const target=new URL('/admin',externalAppOrigin(request));
  if(!userId||!Number.isInteger(delta)||delta===0||note.length<3||note.length>200){target.searchParams.set('creditError','请填写非零整数积分变动，以及 3–200 字的调整原因');return NextResponse.redirect(target,303);}
  await ensureSelfHostedSchema();const users=await db()<Array<{id:string;role:'owner'|'admin'|'member';name:string}>>`SELECT id,role,name FROM app_users WHERE id=${userId} LIMIT 1`;const targetUser=users[0];
  if(!targetUser){target.searchParams.set('creditError','目标账号不存在');return NextResponse.redirect(target,303);}
  if(targetUser.role==='owner'||(targetUser.role==='admin'&&operator.role!=='owner')){target.searchParams.set('creditError','你没有调整该账号积分的权限');return NextResponse.redirect(target,303);}
  try{const balance=await changeCredits({userId,delta,type:'admin_adjustment',actorId:operator.id,note});if(balance===null)target.searchParams.set('creditError','扣减后积分不能小于 0');else target.searchParams.set('creditUpdated',`${targetUser.name}：${delta>0?'+':''}${delta} 点，当前 ${balance} 点`);}catch(error){console.error('Credit adjustment failed',error);target.searchParams.set('creditError','积分调整失败，请稍后重试');}
  return NextResponse.redirect(target,303);
}
