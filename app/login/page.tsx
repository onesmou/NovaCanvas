import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/selfhost-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string;next?:string}>}){if(await getCurrentUser())redirect('/');const query=await searchParams;return <main className="login-page"><form className="login-card" action="/api/auth/login" method="post"><div className="brand"><span className="brand-mark">N</span><span>NovaCanvas</span></div><h1>登录工作空间</h1><p>使用公司分配的账号继续。</p>{query.error&&<div className="login-error">邮箱或密码不正确，请重试。</div>}<input type="hidden" name="next" value={query.next||'/'} /><label>公司邮箱<input name="email" type="email" required autoComplete="email" /></label><label>密码<input name="password" type="password" required minLength={10} autoComplete="current-password" /></label><button type="submit">登录并进入工作台</button><small>账号由公司管理员统一开通。</small></form></main>}
