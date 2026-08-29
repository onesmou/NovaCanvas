import Link from 'next/link';
import { requireChatGPTUser } from '../chatgpt-auth';
export const dynamic = 'force-dynamic';

export default async function AdminPage(){
  const user=await requireChatGPTUser('/admin');
  const rows=[['JinYuu Amazon Team','Pro','4','1,680 / 2,400'],['Northpeak Outdoor','Team','8','5,820 / 8,000'],['Aurelia Beauty','Pro','3','2,110 / 2,400'],['Demo Workspace','Trial','1','82 / 200']];
  return <main className="admin-shell"><header className="admin-header"><div className="brand"><span className="brand-mark">N</span><span>NovaCanvas Admin</span></div><span>{user.email} · <Link href="/">返回工作台</Link></span></header>
    <section className="admin-content"><h1>运营管理后台</h1><p>查看用户、团队、项目、算力消耗和系统运行情况。</p>
      <div className="stat-grid">{[['注册用户','1,284','↑ 12.8%'],['活跃团队','326','↑ 8.4%'],['本月生成','48,920','↑ 21.6%'],['合规通过率','96.4%','↑ 1.7%']].map(x=><article className="stat-card" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><small>{x[2]} 较上月</small></article>)}</div>
      <section className="admin-panel"><h2>团队与套餐</h2><div className="admin-list"><div><span>工作空间</span><span>套餐</span><span>成员</span><span>算力使用</span></div>{rows.map(r=><div key={r[0]}><span><b>{r[0]}</b></span><span><em>{r[1]}</em></span><span>{r[2]} 人</span><span>{r[3]}</span></div>)}</div></section>
      <section className="admin-panel"><h2>系统模块</h2><div className="admin-list"><div><span>模块</span><span>状态</span><span>调用量</span><span>操作</span></div>{[['Amazon 合规检测','正常','12,842'],['提示词编排引擎','正常','18,326'],['图片生成队列','正常','9,441'],['A+ 内容画布','正常','3,904']].map(r=><div key={r[0]}><span>{r[0]}</span><span><em>{r[1]}</em></span><span>{r[2]}</span><span>查看详情</span></div>)}</div></section>
    </section>
  </main>;
}
