import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// 本地开发可使用项目 data 目录；生产环境由 ASSET_DATA_DIR 指向 Docker 数据卷。
// turbopackIgnore 避免文件追踪器把整个项目误判为动态资源目录。
export function assetDirectory(){return process.env.ASSET_DATA_DIR||path.join(/* turbopackIgnore: true */ process.cwd(),'data');}
export async function saveThumbnail(assetId:string, source:Buffer){const dir=path.join(assetDirectory(),'thumbs');const key=`${assetId}.webp`;await mkdir(dir,{recursive:true});await sharp(source,{limitInputPixels:80_000_000}).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toFile(path.join(dir,key));return key;}
