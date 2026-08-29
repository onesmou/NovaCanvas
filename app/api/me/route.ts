import { NextResponse } from 'next/server';
import { getChatGPTUser } from '../../chatgpt-auth';
export async function GET(){const user=await getChatGPTUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json({user});}
