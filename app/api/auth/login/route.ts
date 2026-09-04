import { NextRequest, NextResponse } from 'next/server';
import { createSession, login, provisionBootstrapOwner } from '../../../../lib/selfhost-auth';
import { externalAppOrigin } from '../../../../lib/external-url';
export const runtime = 'nodejs';
export async function POST(request:NextRequest){
  const form=await request.formData();
  const email=String(form.get('email')||'').trim();
  const password=String(form.get('password')||'');
  const next=String(form.get('next')||'/workbench');
  const safeNext=next.startsWith('/')&&!next.startsWith('//')?next:'/workbench';
  const base=externalAppOrigin(request);
  try{
    const authenticated=await login(email,password);
    if(authenticated)return NextResponse.redirect(new URL(safeNext,base),303);
    if(email.toLowerCase()===process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase()&&password===process.env.BOOTSTRAP_ADMIN_PASSWORD){
      const user=await provisionBootstrapOwner(email,process.env.BOOTSTRAP_ADMIN_NAME||'Company Owner',password);
      await createSession(user.id);
      return NextResponse.redirect(new URL(safeNext,base),303);
    }
  }catch(error){
    console.error('NovaCanvas login failed',error);
  }
  const failure=new URL('/login',base);
  failure.searchParams.set('error','1');
  failure.searchParams.set('next',safeNext);
  return NextResponse.redirect(failure,303);
}
