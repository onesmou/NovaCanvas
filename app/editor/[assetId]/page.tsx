import { notFound } from 'next/navigation';
import { requireAppUser } from '../../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../../lib/selfhost-db';
import ImageEditor from '../../image-editor';

type Props={params:Promise<{assetId:string}>};
export default async function EditorPage({params}:Props){
  const user=await requireAppUser('/editor');const {assetId}=await params;await ensureSelfHostedSchema();
  const rows=await db()<Array<{id:string;projectId:string;slot:string;prompt:string;rootAssetId:string|null;versionNumber:number;createdAt:Date}>>`SELECT id,project_id AS "projectId",slot,prompt,root_asset_id AS "rootAssetId",version_number AS "versionNumber",created_at AS "createdAt" FROM generated_assets WHERE id=${assetId} AND (owner_id=${user.id} OR ${user.role} IN ('owner','admin')) LIMIT 1`;
  const asset=rows[0];if(!asset)notFound();const root=asset.rootAssetId||asset.id;
  const versions=await db()<Array<{id:string;versionNumber:number;createdAt:Date;provider:string;model:string;isCurrent:boolean;editMetadata:unknown}>>`SELECT id,version_number AS "versionNumber",created_at AS "createdAt",provider,model,is_current AS "isCurrent",edit_metadata AS "editMetadata" FROM generated_assets WHERE root_asset_id=${root} ORDER BY version_number ASC`;
  return <ImageEditor initialAsset={{...asset,imageUrl:`/api/assets/${asset.id}`}} initialVersions={versions.map(version=>({...version,createdAt:version.createdAt.toISOString(),imageUrl:`/api/assets/${version.id}`}))}/>;
}
