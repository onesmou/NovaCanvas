import Link from 'next/link';
import { requireChatGPTUser } from '../chatgpt-auth';
export const dynamic = 'force-dynamic';

export default async function AccountPage(){
  const user=await requireChatGPTUser('/account');
  const initials=(user.fullName??user.email).slice(0,2).toUpperCase();
  return <main className="auth-page"><section className="account-shell">
    <aside className="account-nav"><div className="brand"><span className="brand-mark">N</span><span>NovaCanvas</span></div><Link className="active" href="/account">◎ 账号概览</Link><Link href="/">▦ Listing 项目</Link><a>▤ 团队成员</a><a>✦ 算力与套餐</a><a>⌘ 品牌资产</a><form action="/api/auth/logout" method="post"><button className="account-signout" type="submit">↗ 退出登录</button></form></aside>
    <section className="account-main"><h1>账号与工作空间</h1><p>管理 Amazon 项目、团队权限、套餐和品牌资料。</p>
      <div className="profile-banner"><i>{initials}</i><span><b>{user.displayName}</b><small>{user.email}</small></span><em>管理员</em></div>
      <div className="account-grid">
        <article className="account-card"><h2>JinYuu Amazon Team</h2><dl><div><dt>默认站点</dt><dd>Amazon US</dd></div><div><dt>团队成员</dt><dd>4 人</dd></div><div><dt>Listing 项目</dt><dd>28 个</dd></div><div><dt>本月生成</dt><dd>186 张</dd></div></dl></article>
        <article className="account-card"><h2>当前套餐</h2><div className="plan"><div><strong>Pro</strong><p>2,400 算力 / 月<br/>5 个团队席位</p></div><button>管理套餐</button></div></article>
        <article className="account-card"><h2>品牌资产</h2><dl><div><dt>品牌</dt><dd>NORTHPEAK</dd></div><div><dt>主色</dt><dd>#14213D</dd></div><div><dt>默认语言</dt><dd>English (US)</dd></div><div><dt>提示词模板</dt><dd>12 个</dd></div></dl></article>
        <article className="account-card"><h2>安全与权限</h2><dl><div><dt>登录方式</dt><dd>ChatGPT 安全登录</dd></div><div><dt>账号角色</dt><dd>Owner</dd></div><div><dt>数据隔离</dt><dd>团队空间</dd></div><div><dt>最近登录</dt><dd>刚刚</dd></div></dl></article>
      </div><Link className="back-link" href="/">← 返回 Amazon 套图工作台</Link>
    </section>
  </section></main>;
}
