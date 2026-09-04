import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../../lib/selfhost-db';
import { readAsset, saveGeneratedAsset } from '../../../../lib/image-storage';
import { changeCredits, reserveCredits } from '../../../../lib/credits';
import { getProviderByKey, ProviderConfig } from '../../../../lib/provider-config';

export const runtime='nodejs';
export const maxDuration=300;
type Provider='openai'|'gemini';
type Asset={id:string;ownerId:string;projectId:string;provider:Provider;model:string;slot:string;prompt:string;storageKey:string;mimeType:string;rootAssetId:string|null;versionNumber:number};
type Body={assetId?:string;provider?:Provider;instruction?:string;regions?:Array<{id:string;kind:'brush'|'rect';description?:string}>;mask?:string;mode?:'local'|'harmonize'};
type Generated={base64:string;mimeType:string;model:string};

function providerBaseUrl(envName:'OPENAI_BASE_URL'|'GEMINI_BASE_URL',fallback:string){const raw=(process.env[envName]||fallback).trim().replace(/\/+$/,'');const url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error(`${envName} 配置无效`);return raw;}
function dataUrl(value:string,label:string,maxBytes=12*1024*1024){const match=/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);if(!match)throw new Error(`${label}格式不支持`);const base64=match[2].replace(/\s/g,'');if(Buffer.byteLength(base64,'base64')>maxBytes)throw new Error(`${label}不能超过 ${Math.round(maxBytes/1024/1024)}MB`);return {mimeType:match[1]==='image/jpg'?'image/jpeg':match[1],base64};}
function extension(mime:string){return mime.includes('jpeg')?'jpg':mime.includes('webp')?'webp':'png';}

async function editWithOpenAI(asset:Asset,prompt:string,mask:string,config:ProviderConfig|null):Promise<Generated>{
  const key=config?.apiKey||process.env.OPENAI_API_KEY;if(!key)throw new Error('服务器尚未配置 GPT Image API 密钥，请联系管理员');
  const source=await readAsset(asset.storageKey);
  const parsedMask=dataUrl(mask,'修改遮罩',5*1024*1024);const form=new FormData();
  const model=config?.model||process.env.OPENAI_IMAGE_MODEL||'gpt-image-2';form.append('model',model);form.append('prompt',prompt);form.append('image[]',new Blob([Uint8Array.from(source)],{type:asset.mimeType}),'original.'+extension(asset.mimeType));form.append('mask',new Blob([Uint8Array.from(Buffer.from(parsedMask.base64,'base64'))],{type:'image/png'}),'edit-mask.png');form.append('size','1024x1024');form.append('quality','high');form.append('output_format','png');
  const baseUrl=config?.baseUrl||providerBaseUrl('OPENAI_BASE_URL','https://api.openai.com/v1');const response=await fetch(`${baseUrl}/images/edits`,{method:'POST',headers:{Authorization:`Bearer ${key}`},body:form,signal:AbortSignal.timeout(280_000)});
  const data=await response.json() as {data?:Array<{b64_json?:string}>;error?:{message?:string}};if(!response.ok||!data.data?.[0]?.b64_json)throw new Error(data.error?.message||`GPT Image 未返回编辑结果（HTTP ${response.status}）`);return {base64:data.data[0].b64_json,mimeType:'image/png',model};
}

async function editWithGemini(asset:Asset,prompt:string,mask:string,config:ProviderConfig|null):Promise<Generated>{
  const key=config?.apiKey||process.env.GEMINI_API_KEY;if(!key)throw new Error('服务器尚未配置 Nano Banana API 密钥，请联系管理员');
  const source=await readAsset(asset.storageKey);const parsedMask=dataUrl(mask,'修改遮罩',5*1024*1024);
  const input=[{type:'text',text:prompt},{type:'image',mime_type:asset.mimeType,data:source.toString('base64')},{type:'image',mime_type:'image/png',data:parsedMask.base64}];
  const model=config?.model||process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image';const baseUrl=config?.baseUrl||providerBaseUrl('GEMINI_BASE_URL','https://generativelanguage.googleapis.com/v1beta');const response=await fetch(`${baseUrl}/interactions`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({model,input,response_format:{type:'image',aspect_ratio:'1:1',image_size:'1K'}}),signal:AbortSignal.timeout(280_000)});
  const data=await response.json() as {output_image?:{data?:string;mime_type?:string};error?:{message?:string}};if(!response.ok||!data.output_image?.data)throw new Error(data.error?.message||`Nano Banana 未返回编辑结果（HTTP ${response.status}）`);return {base64:data.output_image.data,mimeType:data.output_image.mime_type||'image/png',model};
}

function buildPrompt(asset:Asset,body:Body){
  const regionText=(body.regions||[]).map((region,index)=>`区域 ${index+1}（${region.kind==='rect'?'矩形框选':'笔刷圈选'}）：${region.description?.trim()||'按用户标注调整'}`).join('\n');
  const scope=body.mode==='harmonize'?'可对未圈选区域做极轻微的光线或阴影协调，但不得改变商品事实。':'仅修改遮罩透明区域；遮罩外的像素、构图和内容必须尽量逐像素保持原样。';
  return `这是对既有 Amazon 商品图的局部编辑，不是重新设计。原始生成要求：\n${asset.prompt}\n\n用户修改说明：\n${body.instruction?.trim()||'按标注区域修正'}\n${regionText||'全图调整'}\n\n硬性约束：保持商品形状、颜色、材质、包装、Logo、标签、SKU、尺寸比例和实际包含配件完全真实且一致；不得增加水印、虚构配件、虚假文字或不实卖点。${asset.slot==='01'||asset.slot==='MAIN'?'该图为 Amazon MAIN 主图：保持纯白背景、无文字、无徽章、无水印、商品完整可见。':''}\n编辑范围：${scope}\n第三张图片为编辑遮罩：透明区域代表允许修改的位置，黑色不透明区域必须保留。`;
}

export async function GET(request:NextRequest){
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:'请先登录'},{status:401});const assetId=request.nextUrl.searchParams.get('assetId');if(!assetId)return NextResponse.json({error:'缺少素材 ID'},{status:400});await ensureSelfHostedSchema();
  const assets=await db()<Array<Asset & {createdAt:Date;editMetadata:unknown;isCurrent:boolean}>>`SELECT id,owner_id AS "ownerId",project_id AS "projectId",provider,model,slot,prompt,storage_key AS "storageKey",mime_type AS "mimeType",root_asset_id AS "rootAssetId",version_number AS "versionNumber",created_at AS "createdAt",edit_metadata AS "editMetadata",is_current AS "isCurrent" FROM generated_assets WHERE id=${assetId} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;
  const asset=assets[0];if(!asset)return NextResponse.json({error:'素材不存在或无权访问'},{status:404});const root=asset.rootAssetId||asset.id;
  const versions=await db()<Array<{id:string;versionNumber:number;createdAt:Date;provider:string;model:string;editMetadata:unknown;isCurrent:boolean}>>`SELECT id,version_number AS "versionNumber",created_at AS "createdAt",provider,model,edit_metadata AS "editMetadata",is_current AS "isCurrent" FROM generated_assets WHERE root_asset_id=${root} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) ORDER BY version_number ASC`;
  return NextResponse.json({asset:{...asset,imageUrl:`/api/assets/${asset.id}`},versions:versions.map(version=>({...version,imageUrl:`/api/assets/${version.id}`}))});
}

export async function POST(request:NextRequest){
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:'登录状态已失效，请重新登录'},{status:401});let body:Body;try{body=await request.json() as Body;}catch{return NextResponse.json({error:'请求格式不正确'},{status:400});}if(!body.assetId||!body.mask)return NextResponse.json({error:'请选择原图并完成修改标注'},{status:400});if((body.instruction||'').trim().length>3000)return NextResponse.json({error:'修改说明不能超过 3000 字'},{status:400});if((body.regions||[]).length>20)return NextResponse.json({error:'一次最多标注 20 个修改区域'},{status:400});
  await ensureSelfHostedSchema();const rows=await db()<Array<Asset>>`SELECT id,owner_id AS "ownerId",project_id AS "projectId",provider,model,slot,prompt,storage_key AS "storageKey",mime_type AS "mimeType",root_asset_id AS "rootAssetId",version_number AS "versionNumber" FROM generated_assets WHERE id=${body.assetId} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;const asset=rows[0];if(!asset)return NextResponse.json({error:'素材不存在或无权编辑'},{status:404});
  const provider:Provider=body.provider==='openai'?'openai':'gemini';const config=await getProviderByKey(provider);const creditCost=config?.creditCost??(provider==='openai'?10:6);const configured=Boolean(config?.apiKey||(provider==='openai'?process.env.OPENAI_API_KEY:process.env.GEMINI_API_KEY));if(!configured||config?.supportsEdit===false)return NextResponse.json({error:`${provider==='openai'?'GPT Image':'Nano Banana'} 未配置图像编辑能力，请联系管理员`},{status:422});
  const remaining=await reserveCredits({userId:user.id,amount:creditCost,type:'edit_reserve',actorId:user.id,note:`局部修改：${config?.name||provider}`});if(remaining===null)return NextResponse.json({error:`算力不足，本次需要 ${creditCost} 点`},{status:402});
  try{const prompt=buildPrompt(asset,body);const generated=provider==='openai'?await editWithOpenAI(asset,prompt,body.mask,config):await editWithGemini(asset,prompt,body.mask,config);const assetId=randomUUID();const storageKey=`${assetId}.${extension(generated.mimeType)}`;const image=Buffer.from(generated.base64,'base64');const stored=await saveGeneratedAsset(assetId,storageKey,image,generated.mimeType);const root=asset.rootAssetId||asset.id;const [next]=await db()<Array<{version:number}>>`SELECT coalesce(max(version_number),0)::int+1 AS version FROM generated_assets WHERE root_asset_id=${root}`;await db()`UPDATE generated_assets SET is_current=false WHERE root_asset_id=${root}`;await db()`INSERT INTO generated_assets(id,owner_id,project_id,provider,model,slot,prompt,storage_key,mime_type,credit_cost,parent_asset_id,root_asset_id,version_number,is_current,edit_metadata,thumbnail_key,storage_backend) VALUES(${assetId},${user.id},${asset.projectId},${provider},${generated.model},${asset.slot},${prompt},${storageKey},${generated.mimeType},${creditCost},${asset.id},${root},${next.version},true,${JSON.stringify({instruction:body.instruction||'',regions:body.regions||[],mode:body.mode||'local'})}::jsonb,${stored.thumbnailKey},${stored.storageBackend})`;await db()`UPDATE projects SET updated_at=now(),status='review',image_count=image_count+1 WHERE id=${asset.projectId}`;return NextResponse.json({assetId,imageUrl:`/api/assets/${assetId}`,versionNumber:next.version,creditsRemaining:remaining});
  }catch(error){await changeCredits({userId:user.id,delta:creditCost,type:'edit_refund',actorId:user.id,note:`局部修改失败返还：${config?.name||provider}`}).catch(refundError=>console.error('NovaCanvas edit refund failed',refundError));console.error('NovaCanvas image edit failed',error);return NextResponse.json({error:error instanceof Error?error.message:'图片修改失败'},{status:503});}
}

export async function PATCH(request:NextRequest){const user=await getCurrentUser();if(!user)return NextResponse.json({error:'请先登录'},{status:401});const body=await request.json() as {assetId?:string};if(!body.assetId)return NextResponse.json({error:'缺少素材 ID'},{status:400});await ensureSelfHostedSchema();const rows=await db()<Array<{id:string;root:string|null}>>`SELECT id,root_asset_id AS root FROM generated_assets WHERE id=${body.assetId} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;if(!rows[0])return NextResponse.json({error:'无权操作该素材'},{status:404});const root=rows[0].root||rows[0].id;await db()`UPDATE generated_assets SET is_current=false WHERE root_asset_id=${root}`;await db()`UPDATE generated_assets SET is_current=true WHERE id=${rows[0].id}`;return NextResponse.json({ok:true});}
