import { NextRequest, NextResponse } from 'next/server';
import { createUser, requireAdmin } from '../../../../lib/selfhost-auth';
export const runtime='nodejs';
export async function POST(request:NextRequest){
  await requireAdmin('/admin');const form=await request.formData();const name=String(form.get('name')||'').trim();const email=String(form.get('email')||'').trim();const password=String(form.get('password')||'');const role=String(form.get('role')||'member')==='admin'?'admin':'member';
  const target=new URL('/admin',request.url);
  if(!name||!email||password.length<10){target.searchParams.set('userError','请完整填写资料，密码至少 10 位');return NextResponse.redirect(target,303);}
  try{await createUser(email,name,password,role);target.searchParams.set('created',email);}catch(error){console.error('Create member failed',error);target.searchParams.set('userError','创建失败：邮箱可能已存在');}
  return NextResponse.redirect(target,303);
}
