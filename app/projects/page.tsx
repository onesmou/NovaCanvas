import Link from 'next/link';
import { requireAppUser } from '../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../lib/selfhost-db';
import { thumbnailUrl } from '../../lib/thumbnail-access';
import { AssetActions } from './asset-actions';

export const dynamic = 'force-dynamic';
type Asset = { id: string; projectId: string; slot: string; versionNumber: number; parentId: string | null; isCurrent: boolean; thumbnailKey: string | null; storageBackend:string };

export default async function ProjectsPage() {
  const user = await requireAppUser('/projects');
  await ensureSelfHostedSchema();
  const projects = await db()<Array<{ id: string; title: string; asin: string | null; market: string; imageCount: number; updatedAt: Date }>>`
    SELECT id,title,asin,market,image_count AS "imageCount",updated_at AS "updatedAt" FROM projects p WHERE owner_id=${user.id} AND EXISTS (SELECT 1 FROM generated_assets a WHERE a.project_id=p.id) ORDER BY updated_at DESC`;
  const assets = await db()<Asset[]>`
    SELECT id,project_id AS "projectId",slot,version_number AS "versionNumber",parent_asset_id AS "parentId",is_current AS "isCurrent",thumbnail_key AS "thumbnailKey",storage_backend AS "storageBackend" FROM generated_assets WHERE owner_id=${user.id} AND (parent_asset_id IS NULL OR is_current=true) ORDER BY created_at DESC`;

  return <main className="workspace-page">
    <header className="workspace-header"><Link className="workspace-brand" href="/workbench"><span className="brand-mark">N</span><b>NovaCanvas</b></Link><nav><Link href="/workbench">套图工作台</Link><Link className="active" href="/projects">Listing 项目</Link><Link href="/a-plus">A+ 画布</Link><Link href="/compliance">合规检测</Link><Link href="/account">账号</Link></nav></header>
    <section className="workspace-content">
      <div className="page-title"><div><p>PROJECT LIBRARY</p><h1>Listing 项目与素材</h1><span>原图与修改版本都会保留；当前采用版本会在素材上标明。</span></div><Link className="primary-link" href="/workbench">＋ 新建套图</Link></div>
      {projects.length ? <div className="project-gallery">{projects.map(project => {
        const items = assets.filter(asset => asset.projectId === project.id);
        return <article key={project.id} className="project-item">
          <header><div><span>{project.market}</span><h2>{project.title}</h2><small>{project.asin || `项目 ${project.id.slice(0, 8)}`}</small></div><em>已生成 {project.imageCount} 张</em></header>
          <div className="asset-strip">{items.length ? items.map((asset, index) => <figure key={asset.id}>
            <a href={`/api/assets/${asset.id}`} target="_blank" rel="noreferrer"><img src={asset.thumbnailKey ? thumbnailUrl(asset.id, asset.thumbnailKey, user.id, asset.storageBackend) : `/api/assets/${asset.id}?thumb=1`} loading={index < 6 ? 'eager' : 'lazy'} fetchPriority={index < 2 ? 'high' : 'auto'} alt={`${project.title} ${asset.slot}`} /><span>{asset.versionNumber > 1 ? `V${asset.versionNumber}` : asset.slot}</span>{asset.isCurrent && asset.versionNumber > 1 && <i>当前</i>}</a>
            <AssetActions assetId={asset.id} />
          </figure>) : <div className="no-assets">尚无生成素材</div>}</div>
          <footer><span>更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span><Link href={`/workbench?project=${project.id}#product-info`}>选择项目并新建图片 →</Link></footer>
        </article>;
      })}</div> : <div className="empty-state"><b>还没有 Listing 项目</b><p>在套图工作台生成第一张图片后，项目与素材会自动归档到这里。</p><Link className="primary-link" href="/workbench">开始制作第一套图</Link></div>}
    </section>
  </main>;
}
