import { NextResponse } from 'next/server';
import { signOut } from '../../../../lib/selfhost-auth';
export const runtime = 'nodejs';
export async function POST(){await signOut();return NextResponse.redirect(new URL('/login',process.env.APP_URL||'http://localhost:3000'),303);}
