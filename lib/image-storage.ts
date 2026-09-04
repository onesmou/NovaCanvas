import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import COS from 'cos-nodejs-sdk-v5';
import sharp from 'sharp';

type StorageArea = 'assets' | 'thumbs';

// 本地开发可使用项目 data 目录；生产环境由 ASSET_DATA_DIR 指向 Docker 数据卷。
// turbopackIgnore 避免文件追踪器把整个项目误判为动态资源目录。
export function assetDirectory(){return process.env.ASSET_DATA_DIR||path.join(/* turbopackIgnore: true */ process.cwd(),'data');}

export function usingCos(){return process.env.STORAGE_DRIVER==='cos';}

function safeName(key:string){
  const name=path.basename(key);
  if(name!==key||!name)throw new Error('素材存储路径无效');
  return name;
}

function cosConfig(){
  const region=process.env.COS_REGION?.trim();
  const bucket=process.env.COS_BUCKET?.trim();
  const secretId=process.env.COS_SECRET_ID?.trim();
  const secretKey=process.env.COS_SECRET_KEY?.trim();
  if(!region||!bucket||!secretId||!secretKey)throw new Error('腾讯云 COS 配置不完整，请联系管理员检查服务器环境变量');
  return {region,bucket,secretId,secretKey};
}

function cosClient(){
  const config=cosConfig();
  return {config,client:new COS({SecretId:config.secretId,SecretKey:config.secretKey})};
}

function objectKey(area:StorageArea,fileName:string){return `${area==='assets'?'originals':'thumbnails'}/${safeName(fileName)}`;}

async function writeLocal(area:StorageArea,fileName:string,contents:Buffer){
  const name=safeName(fileName);
  const dir=path.join(assetDirectory(),area);
  await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,name),contents,{mode:0o600});
}

async function writeCos(area:StorageArea,fileName:string,contents:Buffer,contentType:string){
  const name=safeName(fileName);
  const {config,client}=cosClient();
  await client.putObject({Bucket:config.bucket,Region:config.region,Key:objectKey(area,name),Body:contents,ContentType:contentType,CacheControl:area==='thumbs'?'public, max-age=31536000, immutable':'private, max-age=0, no-store'});
}

async function writeStored(area:StorageArea,fileName:string,contents:Buffer,contentType:string){
  if(!usingCos())return writeLocal(area,fileName,contents);
  return writeCos(area,fileName,contents,contentType);
}

async function readStored(area:StorageArea,fileName:string){
  const name=safeName(fileName);
  if(!usingCos())return readFile(path.join(assetDirectory(),area,name));
  try{
    const {config,client}=cosClient();
    const result=await client.getObject({Bucket:config.bucket,Region:config.region,Key:objectKey(area,name)});
    const body=result.Body;
    if(Buffer.isBuffer(body))return body;
    if(typeof body==='string')return Buffer.from(body);
    throw new Error('腾讯云 COS 未返回可读取的图片数据');
  }catch(cosError){
    // 启用 COS 前生成的历史素材仍留在本地数据卷，迁移完成前继续可访问。
    try{return await readFile(path.join(assetDirectory(),area,name));}
    catch{throw cosError;}
  }
}

async function removeStored(area:StorageArea,fileName:string){
  const name=safeName(fileName);
  if(!usingCos())return unlink(path.join(assetDirectory(),area,name)).catch(()=>undefined);
  try{
    const {config,client}=cosClient();
    await client.deleteObject({Bucket:config.bucket,Region:config.region,Key:objectKey(area,name)});
  }catch(error){
    // 本地历史素材尚未迁移，或对象已不存在时，继续清理本地副本即可。
    if((error as {statusCode?:number}).statusCode!==404)console.error('NovaCanvas COS delete failed',error);
  }
  await unlink(path.join(assetDirectory(),area,name)).catch(()=>undefined);
}

export async function saveAsset(storageKey:string,source:Buffer,mimeType:string){return writeStored('assets',storageKey,source,mimeType);}
export async function readAsset(storageKey:string){return readStored('assets',storageKey);}
export async function removeAsset(storageKey:string){return removeStored('assets',storageKey);}
export async function readThumbnail(thumbnailKey:string){return readStored('thumbs',thumbnailKey);}
export async function removeThumbnail(thumbnailKey:string){return removeStored('thumbs',thumbnailKey);}

export async function saveThumbnail(assetId:string,source:Buffer){
  const key=`${assetId}.webp`;
  const thumbnail=await sharp(source,{limitInputPixels:80_000_000}).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toBuffer();
  await writeStored('thumbs',key,thumbnail,'image/webp');
  return key;
}

/**
 * 写入原图与缩略图时以“成对成功”为准：COS 任一写入失败时保留本地副本，
 * 让生成结果继续可见，避免因对象存储短暂异常让用户丢失一张已经生成的图片。
 */
export async function saveGeneratedAsset(assetId:string,storageKey:string,source:Buffer,mimeType:string){
  const thumbnailKey=`${assetId}.webp`;
  const thumbnail=await sharp(source,{limitInputPixels:80_000_000}).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toBuffer();
  if(usingCos()){
    try{
      await writeCos('assets',storageKey,source,mimeType);
      await writeCos('thumbs',thumbnailKey,thumbnail,'image/webp');
      // COS/CDN 可用时仍保留本地热备，便于编辑、下载回退和故障恢复。
      await Promise.all([writeLocal('assets',storageKey,source),writeLocal('thumbs',thumbnailKey,thumbnail)]);
      return {thumbnailKey,storageBackend:'cos' as const};
    }catch(error){
      console.error('NovaCanvas COS upload failed; keeping generated asset locally',error);
      await Promise.all([writeLocal('assets',storageKey,source),writeLocal('thumbs',thumbnailKey,thumbnail)]);
      return {thumbnailKey,storageBackend:'local' as const};
    }
  }
  await Promise.all([writeLocal('assets',storageKey,source),writeLocal('thumbs',thumbnailKey,thumbnail)]);
  return {thumbnailKey,storageBackend:'local' as const};
}

function cdnUrl(area:StorageArea,fileName:string){
  if(!usingCos())return null;
  const domain=process.env.COS_CDN_DOMAIN?.trim().replace(/\/+$/,'');
  const authKey=process.env.COS_CDN_AUTH_KEY?.trim();
  if(!domain||!authKey)return null;
  const uri=`/${objectKey(area,fileName).split('/').map(encodeURIComponent).join('/')}`;
  // 腾讯云 CDN Type D：sign=md5(authKey + URI + timestamp)，有效期由 CDN 控制台的鉴权时长控制。
  const timestamp=Math.floor(Date.now()/1000).toString();
  const sign=createHash('md5').update(`${authKey}${uri}${timestamp}`).digest('hex');
  return `${domain}${uri}?sign=${sign}&t=${timestamp}`;
}

export function assetCdnUrl(storageKey:string){return cdnUrl('assets',storageKey);}
export function thumbnailCdnUrl(thumbnailKey:string){return cdnUrl('thumbs',thumbnailKey);}
