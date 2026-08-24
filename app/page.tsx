'use client';

import { ChangeEvent, useMemo, useState } from 'react';

const tools = [
  { icon: '✦', label: 'AI 商品图' }, { icon: '▧', label: '智能套图' },
  { icon: '◇', label: 'AI 模特' }, { icon: '◉', label: '背景工厂' },
  { icon: '文', label: 'Listing 文案' },
];
const scenes = [
  { name: '自然日光影棚', tag: '百搭', cls: 'scene-sand' },
  { name: '都市金属台', tag: '科技', cls: 'scene-blue' },
  { name: '柔雾浴室', tag: '美妆', cls: 'scene-rose' },
  { name: '热带晨光', tag: '户外', cls: 'scene-green' },
];
const formats = [
  ['Amazon 主图', '1:1 · 2000 × 2000'], ['TikTok Shop', '3:4 · 1500 × 2000'],
  ['Shopee / Lazada', '1:1 · 1200 × 1200'], ['独立站 Banner', '16:9 · 1920 × 1080'],
];

export default function Home() {
  const [activeTool, setActiveTool] = useState('AI 商品图');
  const [selectedScene, setSelectedScene] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState(0);
  const [productImage, setProductImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('保留商品真实材质与结构，生成高级自然光商业摄影，柔和阴影，画面干净，突出产品');
  const [generated, setGenerated] = useState(false);
  const [toast, setToast] = useState('');
  const progress = useMemo(() => productImage ? 75 : 38, [productImage]);

  function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setProductImage(URL.createObjectURL(file)); setGenerated(false); setToast('商品图已上传');
    setTimeout(() => setToast(''), 1800);
  }
  function generate() {
    setGenerated(false); setToast('正在生成 4 张商业级商品图…');
    setTimeout(() => { setGenerated(true); setToast('生成完成，可继续微调或下载'); setTimeout(() => setToast(''), 2400); }, 1100);
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>NovaCanvas</span></div>
      <nav aria-label="设计工具">
        <p className="nav-title">创作工具</p>
        {tools.map(item => <button key={item.label} className={`nav-item ${activeTool === item.label ? 'active' : ''}`} onClick={() => setActiveTool(item.label)}><span className="nav-icon">{item.icon}</span>{item.label}{item.label === '智能套图' && <em>HOT</em>}</button>)}
        <p className="nav-title secondary">资产管理</p>
        <button className="nav-item"><span className="nav-icon">▦</span>我的作品</button>
        <button className="nav-item"><span className="nav-icon">⬡</span>品牌中心</button>
        <button className="nav-item"><span className="nav-icon">▤</span>团队空间</button>
      </nav>
      <div className="credit-card"><div><span>本月算力</span><b>{progress}%</b></div><div className="progress"><i style={{ width: `${progress}%` }} /></div><p>{productImage ? '1,240' : '1,680'} / 2,400 点</p><button>升级专业版</button></div>
    </aside>

    <section className="workspace">
      <header className="topbar">
        <div className="mobile-brand"><span className="brand-mark">N</span>NovaCanvas</div>
        <div className="project-name"><span>工作台</span><b>/</b><strong>未命名商品项目</strong></div>
        <div className="top-actions"><button className="icon-btn" aria-label="帮助">?</button><button className="icon-btn" aria-label="通知">⌁</button><button className="avatar">JE</button></div>
      </header>
      <div className="content">
        <div className="page-heading">
          <div><p className="eyebrow">AI PRODUCT STUDIO</p><h1>把一张随手拍，变成全球卖场主图</h1><p>上传商品，选择场景与平台规格。由 AI 自动完成抠图、布光、构图和批量适配。</p></div>
          <div className="trust-badge"><span>✓</span><div><b>商用无忧</b><small>生成素材支持商业使用</small></div></div>
        </div>
        <div className="studio-grid">
          <section className="panel input-panel">
            <div className="panel-title"><span>01</span><div><h2>上传商品</h2><p>建议使用清晰、无遮挡的商品图</p></div></div>
            <label className={`dropzone ${productImage ? 'has-image' : ''}`}>
              <input type="file" accept="image/*" onChange={upload} />
              {productImage ? <img src={productImage} alt="已上传商品" /> : <><span className="upload-icon">↥</span><b>点击或拖拽上传商品图</b><small>JPG、PNG、WEBP · 最大 20MB</small><i>选择图片</i></>}
              {productImage && <span className="replace">更换图片</span>}
            </label>
            <div className="section-label"><span>02</span><b>选择出图场景</b><button>查看全部 48 个 ›</button></div>
            <div className="scene-grid">{scenes.map((scene, i) => <button key={scene.name} className={`scene-card ${scene.cls} ${selectedScene === i ? 'selected' : ''}`} onClick={() => setSelectedScene(i)}><span>{scene.tag}</span><b>{scene.name}</b>{selectedScene === i && <i>✓</i>}</button>)}</div>
            <div className="section-label"><span>03</span><b>描述想要的画面</b><small>AI 已优化</small></div>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} maxLength={300} aria-label="画面描述" />
            <div className="prompt-footer"><span>✦ 智能润色</span><small>{prompt.length}/300</small></div>
          </section>

          <section className="panel output-panel">
            <div className="output-head"><div><span>04</span><h2>选择平台规格</h2></div><button className="history-btn">↻ 历史版本</button></div>
            <div className="format-list">{formats.map((format, i) => <button key={format[0]} onClick={() => setSelectedFormat(i)} className={selectedFormat === i ? 'selected' : ''}><i>{selectedFormat === i ? '●' : '○'}</i><span><b>{format[0]}</b><small>{format[1]}</small></span><em>{i === 0 ? '推荐' : ''}</em></button>)}</div>
            <div className={`preview-stage ${scenes[selectedScene].cls}`}>
              <div className="stage-toolbar"><span>实时预览</span><small>{formats[selectedFormat][1].split(' · ')[0]}</small></div>
              <div className={`product-preview ${generated ? 'generated' : ''}`}>
                {productImage ? <img src={productImage} alt="商品合成预览" /> : <div className="sample-product"><span>NOVA</span><b>ESSENTIAL</b><i>SERUM</i></div>}
                <span className="preview-shadow" />{generated && <><i className="spark s1">✦</i><i className="spark s2">✦</i></>}
              </div>
              <div className="preview-copy"><small>NEW / 2026</small><b>Designed to be<br/>remembered.</b></div>
            </div>
            <div className="generate-row"><div><span>将消耗</span><b> 20 算力</b><small>预计 25 秒 · 生成 4 张</small></div><button className="generate-btn" onClick={generate}><span>✦</span>{generated ? '重新生成' : '立即生成'}</button></div>
          </section>
        </div>
        <section className="recent-section">
          <div className="recent-head"><div><p className="eyebrow">RECENT CREATIONS</p><h2>最近创作</h2></div><button>查看全部作品 ›</button></div>
          <div className="recent-grid">{['极简护肤精华', '户外轻量水杯', '复古通勤女包', '无线降噪耳机'].map((name, i) => <article key={name}><div className={`recent-art art-${i}`}><span>{['SKIN','GO WILD','ATELIER','SOUND'][i]}</span></div><div><b>{name}</b><small>{['Amazon 主图','TikTok Shop','独立站 Banner','Shopee 套图'][i]}</small></div><button aria-label={`更多 ${name}`}>•••</button></article>)}</div>
        </section>
      </div>
    </section>
    {toast && <div className="toast" role="status"><span>✦</span>{toast}</div>}
  </main>;
}
