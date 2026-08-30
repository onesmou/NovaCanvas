import { NextRequest, NextResponse } from 'next/server';
import { createSession, createUser, login } from '../../../../lib/selfhost-auth';
export const runtime = 'nodejs';
export async function POST(request:NextRequest){
  const form=await request.formData();
  const email=String(form.get('email')||'').trim();
  const password=String(form.get('password')||'');
  const next=String(form.get('next')||'/');
  const safeNext=next.startsWith('/')&&!next.startsWith('//')?next:'/';
  try{
    const authenticated=await login(email,password);
    if(authenticated)return NextResponse.redirect(new URL(safeNext,request.url),303);
    if(email.toLowerCase()===process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()&&password===process.env.BOOTSTRAP_ADMIN_PASSWORD){
      const user=await createUser(email,process.env.BOOTSTRAP_ADMIN_NAME||'Company Owner',password,'owner');
      await createSession(user.id);
      return NextResponse.redirect(new URL(safeNext,request.url),303);
    }
  }catch(error){
    console.error('NovaCanvas login failed',error);
  }
  const failure=new URL('/login',request.url);
  failure.searchParams.set('error','1');
  failure.searchParams.set('next',safeNext);
  return NextResponse.redirect(failure,303);
}
