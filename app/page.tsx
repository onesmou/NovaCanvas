import Link from 'next/link';

export const dynamic='force-dynamic';

export default function Home(){
  return <main className="public-home">
    <header className="public-nav"><Link className="brand" href="/"><span className="brand-mark">N</span><span>NovaCanvas</span></Link><nav><a href="#capabilities">产品能力</a><a href="#workflow">使用流程</a><a className="login-link" href="/login?next=%2Fworkbench">登录</a></nav></header>
    <section className="public-hero">
      <div><p>AMAZON CREATIVE OPERATING SYSTEM</p><h1>让每一张 Amazon 商品图<br/><em>都有清晰的制作依据</em></h1><span>面向跨境电商运营团队的私有化 AI 作图工作台。商品、提示词、项目和素材都由您的公司自己管理。</span><div className="public-hero-actions"><a className="primary-link" href="/login?next=%2Fworkbench">登录工作空间 →</a><a className="secondary-link" href="#workflow">了解工作流程</a></div><small>公司独立账号 · 私有素材存储 · 可连接 GPT Image 与 Nano Banana</small></div>
      <aside><div className="preview-toolbar"><i></i><i></i><i></i><b>Amazon 套图项目</b></div><a className="preview-product" href="/login?next=%2Fworkbench" aria-label="登录后上传商品参考图"><span>上传商品参考图</span><b>登录后开始上传</b><small>真实产品外观锁定</small></a><div className="preview-steps"><div><b>01</b><span>主图合规</span></div><div><b>02</b><span>卖点说明</span></div><div><b>03</b><span>场景展示</span></div></div></aside>
    </section>
    <section id="capabilities" className="public-capabilities"><article><b>01</b><h2>商品外观锁定</h2><p>围绕上传的真实商品图制作，不用通用演示商品替代您的 SKU。</p></article><article><b>02</b><h2>Amazon 图组方案</h2><p>主图、卖点、场景、尺寸、包装与 A+ 方案均有对应的提示词模板。</p></article><article><b>03</b><h2>团队账号和项目</h2><p>运营账号、用量、项目和素材在您的服务器内管理，权限可控。</p></article></section>
    <section id="workflow" className="public-workflow"><p>WORKFLOW</p><h2>三步开始一个真实商品项目</h2><div><span><b>1</b>登录公司工作空间</span><span><b>2</b>上传真实商品参考图</span><span><b>3</b>按图组方案并行生成与下载</span></div></section>
  </main>;
}
