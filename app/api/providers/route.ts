import { NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/selfhost-auth';
export async function GET(){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'请先登录'},{status:401});return NextResponse.json({openai:{configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_IMAGE_MODEL||'gpt-image-2',cost:10},gemini:{configured:Boolean(process.env.GEMINI_API_KEY),model:process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image',cost:6}});}
