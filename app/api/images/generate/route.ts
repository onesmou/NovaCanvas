import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { saveThumbnail } from '../../../../lib/image-storage';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';

export const runtime='nodejs';
export const maxDuration=300;
type Provider='openai'|'gemini';
type Body={provider?:Provider;prompt?:string;referenceImage?:string|null;size?:string;projectId?:string|null;projectTitle?:string;slot?:string;category?:string;market?:string;asin?:string};
type Generated={base64:string;mimeType:string;model:string};

function providerBaseUrl(envName:'OPENAI_BASE_URL'|'GEMINI_BASE_URL',fallback:string){
  const raw=(process.env[envName]||fallback).trim().replace(/\/+$/,'');
  let url:URL;try{url=new URL(raw);}catch{throw new Error(`${envName} 配置不是有效网址`);}
  if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error(`${envName} 仅支持 HTTP 或 HTTPS`);
  return raw;
}

function referenceParts(dataUrl:string){
  const match=/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if(!match)throw new Error('商品参考图格式不支持，请上传 PNG、JPG 或 WEBP');
  const base64=match[2].replace(/\s/g,'');
  if(Buffer.byteLength(base64,'base64')>10*1024*1024)throw new Error('商品参考图不能超过 10MB');
  return {mimeType:match[1]==='image/jpg'?'image/jpeg':match[1],base64};
}
function aspectRatio(size?:string){return size==='1536x1024'?'3:2':size==='1024x1536'?'2:3':'1:1'}

async function generateWithGemini(body:Body):Promise<Generated>{
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('服务器尚未配置 Nano Banana API 密钥，请联系管理员');
  const model=process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image';
  const input:Array<Record<string,string>>=[{type:'text',text:body.prompt!.trim()}];
  if(body.referenceImage){const image=referenceParts(body.referenceImage);input.push({type:'image',mime_type:image.mimeType,data:image.base64});}
  const baseUrl=providerBaseUrl('GEMINI_BASE_URL','https://generativelanguage.googleapis.com/v1beta');
  const response=await fetch(`${baseUrl}/interactions`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(280_000),body:JSON.stringify({model,input,response_format:{type:'image',aspect_ratio:aspectRatio(body.size),image_size:'1K'}})});
  const data=await response.json() as {output_image?:{data?:string;mime_type?:string};error?:{message?:string}};
  if(!response.ok||!data.output_image?.data)throw new Error(data.error?.message||`Nano Banana 未返回图片（HTTP ${response.status}）`);
  return {base64:data.output_image.data,mimeType:data.output_image.mime_type||'image/png',model};
}

async function generateWithOpenAI(body:Body):Promise<Generated>{
  const key=process.env.OPENAI_API_KEY;if(!key)throw new Error('服务器尚未配置 GPT Image API 密钥，请联系管理员');
  const model=process.env.OPENAI_IMAGE_MODEL||'gpt-image-2';
  const baseUrl=providerBaseUrl('OPENAI_BASE_URL','https://api.openai.com/v1');let response:Response;
  if(body.referenceImage){
    const image=referenceParts(body.referenceImage);const form=new FormData();
    form.append('model',model);form.append('prompt',body.prompt!.trim());form.append('size',body.size||'1024x1024');form.append('quality','high');form.append('output_format','png');
    form.append('image[]',new Blob([Buffer.from(image.base64,'base64')],{type:image.mimeType}),'product-reference.png');
    response=await fetch(`${baseUrl}/images/edits`,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(280_000)});
  }else{
    response=await fetch(`${baseUrl}/images/generations`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(280_000),body:JSON.stringify({model,prompt:body.prompt!.trim(),size:body.size||'1024x1024',quality:'high',output_format:'png'})});
  }
  const data=await response.json() as {data?:Array<{b64_json?:string}>;error?:{message?:string}};
  if(!response.ok||!data.data?.[0]?.b64_json)throw new Error(data.error?.message||`GPT Image 未返回图片（HTTP ${response.status}）`);
  return {base64:data.data[0].b64_json,mimeType:'image/png',model};
}

export async function POST(request:NextRequest){
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:'登录状态已失效，请重新登录'},{status:401});
  let body:Body;try{body=await request.json() as Body;}catch{return NextResponse.json({error:'请求格式不正确'},{status:400});}
  const prompt=body.prompt?.trim();if(!prompt)return NextResponse.json({error:'提示词不能为空'},{status:400});if(prompt.length>12_000)return NextResponse.json({error:'提示词过长，请控制在 12000 字以内'},{status:400});if(!body.projectTitle?.trim())return NextResponse.json({error:'请填写商品名称'},{status:400});if(!body.referenceImage)return NextResponse.json({error:'请先上传真实商品参考图，才能生成商品素材'},{status:400});
  const provider:Provider=body.provider==='openai'?'openai':'gemini';const creditCost=provider==='openai'?10:6;
  if(user.credits<creditCost)return NextResponse.json({error:`算力不足，本次需要 ${creditCost} 点，当前剩余 ${user.credits} 点`},{status:402});
  await ensureSelfHostedSchema();
  const reserved=await db()<Array<{credits:number}>>`UPDATE app_users SET credits=credits-${creditCost} WHERE id=${user.id} AND credits>=${creditCost} RETURNING credits`;
  if(!reserved[0])return NextResponse.json({error:'算力余额发生变化，请刷新后重试'},{status:409});
  try{
    const generated=provider==='openai'?await generateWithOpenAI({...body,prompt}):await generateWithGemini({...body,prompt});
    let projectId=body.projectId||null;
    if(projectId){const owned=await db()<Array<{id:string}>>`SELECT id FROM projects WHERE id=${projectId} AND owner_id=${user.id} LIMIT 1`;if(!owned[0])projectId=null;}
    if(!projectId){projectId=randomUUID();await db()`INSERT INTO projects(id,owner_id,asin,title,category,market,status) VALUES(${projectId},${user.id},${body.asin||null},${body.projectTitle?.trim()||'未命名 Amazon 项目'},${body.category||'Amazon'},${body.market||'Amazon US'},'review')`;}
    const assetId=randomUUID();const extension=generated.mimeType.includes('jpeg')?'jpg':generated.mimeType.includes('webp')?'webp':'png';const storageKey=`${assetId}.${extension}`;
    const dataDir=process.env.ASSET_DATA_DIR||path.join(process.cwd(),'data');const image=Buffer.from(generated.base64,'base64');await mkdir(path.join(dataDir,'assets'),{recursive:true});await writeFile(path.join(dataDir,'assets',storageKey),image,{mode:0o600});const thumbnailKey=await saveThumbnail(assetId,image);
    await db()`INSERT INTO generated_assets(id,owner_id,project_id,provider,model,slot,prompt,storage_key,mime_type,credit_cost,root_asset_id,version_number,is_current,thumbnail_key) VALUES(${assetId},${user.id},${projectId},${provider},${generated.model},${body.slot||'IMAGE'},${prompt},${storageKey},${generated.mimeType},${creditCost},${assetId},1,true,${thumbnailKey})`;
    await db()`UPDATE projects SET image_count=image_count+1,status='review',updated_at=now() WHERE id=${projectId}`;
    return NextResponse.json({imageUrl:`/api/assets/${assetId}`,assetId,projectId,creditsRemaining:reserved[0].credits,provider:provider==='openai'?'GPT Image 2':'Nano Banana 2'});
  }catch(error){await db()`UPDATE app_users SET credits=credits+${creditCost} WHERE id=${user.id}`;console.error('NovaCanvas image generation failed',error);return NextResponse.json({error:error instanceof Error?error.message:'图片生成失败'},{status:503});}
}
