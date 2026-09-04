import { NextRequest, NextResponse } from 'next/server';
import { createUser, requireAdmin } from '../../../../lib/selfhost-auth';
import { externalAppOrigin } from '../../../../lib/external-url';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  const operator=await requireAdmin('/admin');const form=await request.formData();const name=String(form.get('name')||'').trim();const email=String(form.get('email')||'').trim().toLowerCase();const password=String(form.get('password')||'');const role=String(form.get('role')||'member')==='admin'?'admin':'member';const initialCredits=Number(form.get('initialCredits')||0);
  const target=new URL('/admin',externalAppOrigin(request));
  if(!name||!/^\S+@\S+\.\S+$/.test(email)||password.length<10||!Number.isInteger(initialCredits)||initialCredits<0){target.searchParams.set('userError','请填写有效姓名、公司邮箱、至少 10 位密码和非负整数初始积分');return NextResponse.redirect(target,303);}
  if(role==='admin'&&operator.role!=='owner'){target.searchParams.set('userError','仅总管理员可以创建管理员账号');return NextResponse.redirect(target,303);}
  try{await createUser(email,name,password,role,initialCredits,operator.id);target.searchParams.set('created',email);}catch(error){console.error('Create member failed',error);target.searchParams.set('userError','创建失败：邮箱可能已存在或数据暂时不可用');}
  return NextResponse.redirect(target,303);
}
