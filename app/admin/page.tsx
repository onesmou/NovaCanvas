import Link from 'next/link';
import { requireAdmin } from '../../lib/selfhost-auth';
import { db, ensureSelfHostedSchema } from '../../lib/selfhost-db';

export const dynamic='force-dynamic';

type Notice = { created?:string; userError?:string; creditUpdated?:string; creditError?:string };
type UserRow = { id:string; name:string; email:string; role:'owner'|'admin'|'member'; credits:number; projects:number; images:number };
type CreditLog = { id:string; name:string; email:string; type:string; delta:number; balance:number; note:string|null; createdAt:Date; operator:string|null };

export default async function AdminPage({searchParams}:{searchParams:Promise<Notice>}){
  const user=await requireAdmin('/admin');
  await ensureSelfHostedSchema();
  const notice=await searchParams;
  const [stats]=await db()<Array<{users:number;projects:number;images:number;creditsSpent:number}>>`
    SELECT (SELECT count(*)::int FROM app_users) AS users,
      (SELECT count(*)::int FROM projects) AS projects,
      (SELECT count(*)::int FROM generated_assets) AS images,
      (SELECT coalesce(sum(credit_cost),0)::int FROM generated_assets) AS "creditsSpent"`;
  const users=await db()<UserRow[]>`
    SELECT u.id,u.name,u.email,u.role,u.credits,count(DISTINCT p.id)::int AS projects,count(DISTINCT a.id)::int AS images
    FROM app_users u LEFT JOIN projects p ON p.owner_id=u.id LEFT JOIN generated_assets a ON a.owner_id=u.id
    GROUP BY u.id ORDER BY u.created_at DESC LIMIT 50`;
  const creditLog=await db()<CreditLog[]>`
    SELECT t.id,u.name,u.email,t.type,t.delta,t.balance_after AS balance,t.note,t.created_at AS "createdAt",actor.name AS operator
    FROM credit_transactions t JOIN app_users u ON u.id=t.user_id LEFT JOIN app_users actor ON actor.id=t.actor_id
    ORDER BY t.created_at DESC LIMIT 20`;
  const configured=[['GPT Image 2',Boolean(process.env.OPENAI_API_KEY),process.env.OPENAI_IMAGE_MODEL||'gpt-image-2'],['Nano Banana 2',Boolean(process.env.GEMINI_API_KEY),process.env.GEMINI_IMAGE_MODEL||'gemini-3.1-flash-image']];
  const canManage=(row:UserRow)=>row.role!=='owner'&&(user.role==='owner'||row.role==='member');
  const typeLabel:Record<string,string>={account_created:'开户分配',admin_adjustment:'管理员调整',generation_reserve:'生成扣点',generation_refund:'生成失败返还',edit_reserve:'修改扣点',edit_refund:'修改失败返还'};
  return <main className="admin-shell">
    <header className="admin-header"><div className="brand"><span className="brand-mark">N</span><span>NovaCanvas Admin</span></div><span>{user.email} · <Link href="/workbench">返回工作台</Link></span></header>
    <section className="admin-content">
      <h1>运营管理后台</h1><p>以下全部为当前服务器的真实数据。</p>
      {notice.created&&<div className="admin-notice success">已创建账号：{notice.created}</div>}
      {notice.creditUpdated&&<div className="admin-notice success">积分已调整：{notice.creditUpdated}</div>}
      {notice.userError&&<div className="admin-notice error">{notice.userError}</div>}
      {notice.creditError&&<div className="admin-notice error">{notice.creditError}</div>}
      <div className="stat-grid">{[['注册账号',stats?.users??0],['Listing 项目',stats?.projects??0],['生成素材',stats?.images??0],['累计消耗',`${stats?.creditsSpent??0} 点`]].map(([label,value])=><article className="stat-card" key={label}><span>{label}</span><b>{value}</b><small>实时数据库</small></article>)}</div>
      <section className="admin-panel create-user-panel"><h2>创建运营账号</h2><p>由管理员明确分配初始积分；普通管理员只能创建普通成员。</p><form action="/api/admin/users" method="post"><label>姓名<input name="name" required placeholder="例如：亚马逊运营 A"/></label><label>公司邮箱<input name="email" type="email" required placeholder="name@company.com"/></label><label>初始密码<input name="password" type="password" minLength={10} required placeholder="至少 10 位"/></label><label>初始积分<input name="initialCredits" type="number" min="0" step="1" defaultValue="0" required/></label><label>角色<select name="role"><option value="member">普通成员</option>{user.role==='owner'&&<option value="admin">管理员</option>}</select></label><button type="submit">创建账号</button></form></section>
      <section className="admin-panel"><h2>账号与用量</h2><div className="admin-list"><div><span>账号</span><span>角色 / 算力</span><span>项目</span><span>素材</span></div>{users.map(row=><div key={row.id}><span><b>{row.name}</b><small>{row.email}</small></span><span><em>{row.role}</em> · {row.credits} 点</span><span>{row.projects}</span><span>{row.images}</span></div>)}</div></section>
      <section className="admin-panel credit-panel"><h2>管理员分配积分</h2><p>正数为增加，负数为扣减；每次操作都会留下不可编辑流水。</p><div className="credit-forms">{users.filter(canManage).map(row=><form key={row.id} action="/api/admin/credits" method="post"><input name="userId" type="hidden" value={row.id}/><span><b>{row.name}</b><small>{row.email} · 当前 {row.credits} 点</small></span><input name="delta" type="number" step="1" required placeholder="例如 +100 或 -20" aria-label={`${row.name} 的积分变动`}/><input name="note" maxLength={200} minLength={3} required placeholder="调整原因（必填）" aria-label={`${row.name} 的调整原因`}/><button type="submit">确认调整</button></form>)}</div></section>
      <section className="admin-panel"><h2>最近积分流水</h2><div className="admin-list credit-log"><div><span>账号 / 时间</span><span>类型</span><span>变动 / 余额</span><span>操作人 / 原因</span></div>{creditLog.length?creditLog.map(row=><div key={row.id}><span><b>{row.name}</b><small>{new Date(row.createdAt).toLocaleString('zh-CN')}</small></span><span>{typeLabel[row.type]||row.type}</span><span className={row.delta>0?'credit-in':'credit-out'}>{row.delta>0?'+':''}{row.delta} 点 <small>余额 {row.balance} 点</small></span><span>{row.operator||'系统'}<small>{row.note||'—'}</small></span></div>):<div><span>暂无积分流水</span></div>}</div></section>
      <section className="admin-panel"><h2>作图引擎</h2><div className="admin-list"><div><span>引擎</span><span>状态</span><span>模型</span><span>配置位置</span></div>{configured.map(row=><div key={String(row[0])}><span>{String(row[0])}</span><span><em className={row[1]?'':'offline'}>{row[1]?'已配置':'未配置'}</em></span><span>{String(row[2])}</span><span>服务器 .env</span></div>)}</div></section>
    </section>
  </main>;
}
