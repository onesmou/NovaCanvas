import { NextResponse } from 'next/server';
export const runtime='nodejs';
export async function GET(){return NextResponse.json({error:'素材库将在自托管存储启用后提供'},{status:501});}
