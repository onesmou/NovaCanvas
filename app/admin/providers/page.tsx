import Link from 'next/link';
import ProviderForm from '../provider-form';
import { requireAdmin } from '../../../lib/selfhost-auth';
import { publicProviders } from '../../../lib/provider-config';
export const dynamic='force-dynamic';
export default async function ProviderSettings(){await requireAdmin('/admin/providers');const providers=await publicProviders();return <main className="admin-shell"><header className="admin-header"><div className="brand"><span className="brand-mark">N</span><span>NovaCanvas Admin</span></div><Link href="/admin">返回运营后台</Link></header><section className="admin-content"><h1>作图引擎配置中心</h1><p>密钥仅在服务器加密保存，普通运营无法读取。支持 OpenAI Images 兼容接口（官方、中转站、Azure 兼容服务）和 Gemini Interactions（Nano Banana）。</p><ProviderForm initial={providers}/></section></main>}
