import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export function assetDirectory(){return process.env.ASSET_DATA_DIR||path.join(process.cwd(),'data');}
export async function saveThumbnail(assetId:string, source:Buffer){const dir=path.join(assetDirectory(),'thumbs');const key=`${assetId}.webp`;await mkdir(dir,{recursive:true});await sharp(source,{limitInputPixels:80_000_000}).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:76}).toFile(path.join(dir,key));return key;}
