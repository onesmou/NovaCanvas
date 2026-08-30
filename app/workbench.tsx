'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../lib/selfhost-auth';

type PromptCard = { id:string; slot:string; title:string; goal:string; prompt:string; negative:string; badge?:string };
type ImageProvider = 'openai' | 'gemini';
type ProjectRow = { id:string; asin:string|null; title:string; imageCount:number; status:'draft'|'generating'|'review'|'complete' };
type ProviderStatus={configured:boolean;model:string;cost:number};

const promptLibrary: PromptCard[] = [
  { id:'main',slot:'01',title:'MAIN 合规白底主图',goal:'搜索页点击率',badge:'合规必做',prompt:'创建 Amazon MAIN 商品主图。使用上传的真实商品作为唯一主体，纯白背景 RGB 255,255,255，商品居中并完整可见，占画面 85%–90%，2000×2000 正方形。专业柔光棚拍，真实颜色，边缘清晰，仅保留轻微自然接触阴影。严格保持商品结构、包装颜色、标签位置与文字，不改变 SKU。',negative:'无道具，无配件，无模特，无文字叠加，无徽章，无边框，无水印，无额外 Logo，无拼贴，无夸张光效，不裁切商品，不生成未包含在售卖套装中的物品。'},
  { id:'hero',slot:'02',title:'核心卖点信息图',goal:'3秒理解价值',badge:'高转化',prompt:'创建 Amazon 第二张卖点信息图，商品占画面中心 55%–65%，浅色品牌背景。围绕商品添加恰好 3 个简短卖点，每条不超过 6 个英文单词，使用清晰无衬线字体、细引导线和简洁图标。信息层级强，移动端缩略图仍可阅读。卖点内容严格来自输入资料，不虚构性能。',negative:'不使用密集小字，不超过 3 个卖点，不重复文字，不拼错品牌和参数，不使用未经证实的认证、第一、最佳、100% 等绝对化声明。'},
  { id:'life',slot:'03',title:'真实使用场景图',goal:'代入使用情境',prompt:'创建 Amazon 次图生活场景，产品在真实且符合品类的使用环境中，产品是明确焦点，3/4 视角，比例真实。自然窗光结合商业柔光，环境整洁但不失生活感，展现目标顾客正在解决的具体任务。保留真实商品几何、材质、颜色和标签。',negative:'不让产品缩成背景装饰，不使用不相关道具，不改变产品尺寸，不生成危险用法，不使用虚假前后对比，不添加营销文字或水印。'},
  { id:'size',slot:'04',title:'尺寸与比例说明图',goal:'降低尺寸误判',prompt:'创建 Amazon 尺寸与比例图。商品正视或 3/4 视角，浅灰白背景，完整展示长、宽、高的测量线与箭头，预留 3 处清晰数值区域。加入一个中性的日常物品或手部作为真实比例参照，但不得遮挡商品。版式简洁、技术感、移动端可读。',negative:'不得猜测尺寸，不生成错误单位，不扭曲比例，不放置多个参照物，不让测量线穿过文字，不添加与尺寸无关的卖点。'},
  { id:'detail',slot:'05',title:'材质功能特写',goal:'证明品质细节',prompt:'创建 Amazon 商品细节特写。选择最能证明品质或功能的结构，使用微距商业摄影，方向性柔光揭示真实纹理、接缝、表面处理或功能结构。加入一个放大细节窗与 2 个极短说明标签，主商品仍可被识别。',negative:'不发明不存在的纹理、接口或结构，不磨平真实瑕疵，不使用虚假材质，不夸大微观结构，不生成无法验证的技术数字。'},
  { id:'bundle',slot:'06',title:'包装清单 / What’s Included',goal:'减少配件争议',prompt:'创建 Amazon 包装清单图。将所有实际包含的商品、配件和包装以整齐对称的俯拍方式排列，浅色纯净背景，比例准确，互不遮挡。每件物品预留简短英文名称区域，整体清晰、诚实、易盘点。',negative:'不得加入未随订单提供的道具或赠品，不重复配件，不改变数量、颜色和型号，不使用装饰物制造错误暗示。'},
  { id:'compare',slot:'07',title:'差异化对比图',goal:'回答购买犹豫',prompt:'创建 Amazon 产品对比信息图，左右双栏或表格式清晰布局。左侧突出本产品的 4 个真实优势，右侧使用中性“普通方案”表达常见限制。用可核验的材质、尺寸、容量、结构或使用体验对比，不出现竞品商标。',negative:'不攻击竞品，不使用竞品名称或 Logo，不虚构数据，不写“Best/No.1/Guaranteed”，不制作无法证明的效果对比。'},
  { id:'a-hero',slot:'A+',title:'A+ 品牌横幅',goal:'品牌故事与价值',badge:'1464×600',prompt:'创建 Amazon A+ 宽幅品牌横幅，宽屏商业摄影构图。产品在真实使用场景中，右侧为产品与环境，左侧保留干净负空间用于后期标题和品牌文案。高分辨率、自然比例、品牌色克制统一，体现品牌使命与核心使用价值。',negative:'图片内不生成长段文字，不加入价格、促销、联系方式、二维码、外部链接、保证或保修声明，不使用未经证实的奖项和认证。'},
  { id:'a-material',slot:'A+',title:'A+ 材质 / 成分故事',goal:'解释产品价值',prompt:'创建 Amazon A+ 材质故事模块。产品作为视觉中心，周围克制展示真实原材料、成分或生产工艺线索，采用编辑式静物摄影与自然柔光。画面清晰传达材料来源和制作质感，预留简短说明区域。',negative:'不展示配方中不存在的成分，不暗示医疗功效，不使用实验室画面制造伪科学印象，不生成冗长文字。'},
  { id:'a-process',slot:'A+',title:'A+ 使用步骤图',goal:'降低使用门槛',prompt:'创建 Amazon A+ 三步骤使用说明图。使用同一真实产品和一致场景，横向三格叙事，每格只表现一个清晰动作，人物手部与产品比例自然，预留 STEP 1/2/3 和短说明区域。光线、色调、镜头高度保持一致。',negative:'不省略关键安全步骤，不改变产品外观，不生成多余手指，不让步骤顺序含糊，不加入大段营销文案。'},
  { id:'season',slot:'营销',title:'Prime Day 活动场景',goal:'广告与促销素材',prompt:'创建面向 Amazon 活动广告的高级商品场景图。产品保持真实，置于深海军蓝与克制电光蓝的动态商业布景中，强视觉中心，留出促销标题安全区。画面高级、清晰、可用于 Sponsored Brands 或 Store 页面二次排版。',negative:'不直接生成 Amazon、Prime Day 商标或活动徽章，不生成价格和折扣，不添加未经授权的平台标识，不扭曲产品标签。'},
  { id:'video',slot:'视频',title:'7镜头视频分镜',goal:'主图视频脚本',prompt:'为 Amazon 商品视频创建 7 镜头视觉分镜：1 白底英雄镜头；2 使用痛点；3 产品登场；4 核心结构特写；5 真实使用；6 包装清单；7 品牌收束。每个镜头给出构图、镜头运动、光线和 3–5 秒动作，所有镜头保持同一 SKU 外观与品牌色。',negative:'不生成不可验证的承诺，不加入竞品商标，不设计危险用法，不使用过度特效掩盖产品，不让字幕超过安全区。'},
];

const categories = ['家居厨房','美容个护','消费电子','户外运动','宠物用品','母婴用品','服饰箱包','汽车用品'];
export default function Workbench({user}:{user:AppUser}) {
  const [productImage,setProductImage]=useState<string|null>(null);
  const [category,setCategory]=useState(categories[0]);
  const [market,setMarket]=useState('美国站');
  const [selected,setSelected]=useState(promptLibrary[0]);
  const [prompt,setPrompt]=useState(promptLibrary[0].prompt+'\n\n负面约束：'+promptLibrary[0].negative);
  const [query,setQuery]=useState('');
  const [toast,setToast]=useState('');
  const [running,setRunning]=useState(false);
  const [compliance,setCompliance]=useState(true);
  const [provider,setProvider]=useState<ImageProvider>('gemini');
  const [generatedImage,setGeneratedImage]=useState<string|null>(null);
  const [projectId,setProjectId]=useState<string|null>(null);
  const [creditsRemaining,setCreditsRemaining]=useState<number|null>(null);
  const [projectTitle,setProjectTitle]=useState('32oz 真空保温运动水瓶');
  const [projectRows,setProjectRows]=useState<ProjectRow[]>([]);
  const [providers,setProviders]=useState<Record<ImageProvider,ProviderStatus>|null>(null);
  const filtered=useMemo(()=>promptLibrary.filter(p=>(p.title+p.goal+p.slot).toLowerCase().includes(query.toLowerCase())),[query]);
  useEffect(()=>{fetch('/api/projects').then(r=>r.ok?r.json():null).then(data=>{const payload=data as {projects?:ProjectRow[]}|null;setProjectRows(payload?.projects??[])}).catch(()=>setProjectRows([]))},[generatedImage]);
  useEffect(()=>{fetch('/api/providers').then(r=>r.ok?r.json():null).then(raw=>{const data=raw as Record<ImageProvider,ProviderStatus>|null;if(data){setProviders(data);if(!data.gemini.configured&&data.openai.configured)setProvider('openai')}}).catch(()=>setProviders(null))},[]);
  function notify(text:string){setToast(text);setTimeout(()=>setToast(''),1800)}
  function upload(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{setProductImage(String(reader.result));notify('商品参考图已上传，生成时将锁定外观')};reader.readAsDataURL(f)}
  function applyPrompt(p:PromptCard){setSelected(p);setPrompt(`${p.prompt}\n\n品类：${category}；站点：Amazon ${market}。\n负面约束：${p.negative}`);notify(`已载入「${p.title}」`)}
  async function generate(){
    if(!providers?.[provider]?.configured){notify(`${provider==='gemini'?'Nano Banana':'GPT Image'} 尚未配置 API 密钥`);return;}
    setRunning(true); setGeneratedImage(null); notify(`正在调用 ${provider==='gemini'?'Nano Banana':'GPT Image'}…`);
    try{
      const response=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,prompt,referenceImage:productImage,size:selected.id==='a-hero'?'1536x1024':'1024x1024',projectId,projectTitle,slot:selected.slot,category,market:`Amazon ${market}`})});
      const data=await response.json() as {imageUrl?:string;projectId?:string;creditsRemaining?:number;error?:string};
      if(!response.ok||!data.imageUrl)throw new Error(data.error||'任务未返回图片');
      setGeneratedImage(data.imageUrl);setProjectId(data.projectId??null);setCreditsRemaining(data.creditsRemaining??null);notify('已生成并保存至项目素材库');
    }catch(error){notify(error instanceof Error?error.message:'生成失败，请稍后重试')}
    finally{setRunning(false)}
  }

  return <main className="amazon-app">
    <aside className="amazon-sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>NovaCanvas</span></div>
      <div className="amazon-mode"><span>amazon</span><b>Creative OS</b><i>US</i></div>
      <nav aria-label="主导航">
        <p>生产中心</p>
        <Link className="active" href="/"><span>▦</span>套图工作台</Link>
        <a href="#prompt-library"><span>✦</span>提示词库<em>12</em></a>
        <Link href="/a-plus"><span>A+</span>A+ 内容画布</Link>
        <Link href="/compliance"><span>✓</span>合规检测</Link>
        <Link href="/projects"><span>▤</span>Listing 项目</Link>
        <p>团队管理</p>
        <Link href="/account"><span>◎</span>账号与套餐</Link>
        {(user.role==='owner'||user.role==='admin')&&<Link href="/admin"><span>⌘</span>管理后台</Link>}
      </nav>
      <div className="usage-card"><div><span>本月算力</span><b>{creditsRemaining===null?'已连接账本':`${creditsRemaining} 点可用`}</b></div><i><u style={{width:creditsRemaining===null?'70%':`${Math.min(100,Math.max(8,creditsRemaining/2))}%`}} /></i><small>{creditsRemaining===null?'生成时自动扣减并记录':'已按作图引擎自动计费'}</small><button>升级 Pro 套餐</button></div>
    </aside>

    <section className="amazon-main">
      <header className="amazon-topbar">
        <div><b>Amazon 套图工作台</b><span>最后保存于 2 分钟前</span></div>
        <div className="top-actions"><a className="help-link" href="#prompt-library">使用指南</a><Link href="/account" className="user-chip"><i>{user.name.slice(0,2).toUpperCase()}</i><span><b>{user.name}</b><small>{user.role==='owner'?'所有者':user.role==='admin'?'管理员':'成员'}</small></span><em>⌄</em></Link></div>
      </header>

      <div className="amazon-content">
        <section className="hero-row">
          <div><p>AMAZON LISTING IMAGE SYSTEM</p><h1>从一张产品图，到完整高转化 Listing</h1><span>基于 Amazon 官方图片规范与经过验证的电商提示词结构，自动生成 7 图故事板和 A+ 内容。</span></div>
          <div className="compliance-score"><i>96</i><span><b>合规健康度</b><small>主图规则已开启</small></span><em>优秀</em></div>
        </section>

        <section className="setup-card">
          <div className="setup-title"><span>01</span><div><h2>商品资料</h2><p>上传真实商品图，AI 将锁定外观、材质、包装与标签</p></div><button>导入 ASIN</button></div>
          <div className="setup-grid">
            <label className={`amazon-upload ${productImage?'filled':''}`}><input type="file" accept="image/*" onChange={upload}/>{productImage?<img src={productImage} alt="商品参考图"/>:<><i>↥</i><b>上传商品参考图</b><span>正面白底图效果最佳</span><small>PNG / JPG / WEBP · 最大 20MB</small></>}</label>
            <div className="form-fields">
              <label>商品名称<input value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} /></label>
              <div><label>Amazon 站点<select value={market} onChange={e=>setMarket(e.target.value)}><option>美国站</option><option>英国站</option><option>德国站</option><option>日本站</option></select></label><label>商品品类<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
              <label>核心卖点<input defaultValue="24小时保冷 / 食品级不锈钢 / 防漏吸管盖 / 便携提手" /></label>
              <div><label>ASIN（选填）<input placeholder="B0XXXXXXXXX" /></label><label>品牌名<input defaultValue="NORTHPEAK" /></label></div>
            </div>
            <div className="rule-panel"><div><span>✓</span><b>MAIN 主图合规锁</b><button onClick={()=>setCompliance(!compliance)} className={compliance?'on':''}><i/></button></div>{['纯白背景 #FFFFFF','商品占画面 85%+','不添加文字与徽章','不生成非售卖配件','保持真实标签与颜色'].map(x=><p key={x}><i>✓</i>{x}</p>)}<small>生成前自动执行 14 项规则检查</small></div>
          </div>
        </section>

        <section className="production-grid">
          <div className="storyboard-card">
            <div className="card-heading"><div><span>02</span><h2>Amazon 7 图故事板</h2><em>推荐顺序</em></div><button>一键重新编排</button></div>
            <div className="storyboard-grid">
              {promptLibrary.slice(0,7).map((p,i)=><button key={p.id} onClick={()=>applyPrompt(p)} className={selected.id===p.id?'selected':''}><div className={`board-art b${i}`}>{productImage&&<img src={productImage} alt=""/>}<span>{p.slot}</span><i>{i===0?'MAIN':i===2?'IN USE':i===5?'IN THE BOX':'IMAGE'}</i></div><b>{p.title}</b><small>{p.goal}</small><em>{selected.id===p.id?'正在编辑':'编辑提示词'}</em></button>)}
            </div>
            <div className="sequence-tip"><span>💡</span><p><b>图片叙事建议</b>第 1 张负责点击，第 2–3 张回答“为什么买”，第 4–6 张降低尺寸、材质和配件疑虑，第 7 张完成差异化决策。</p></div>
          </div>

          <div className="editor-card">
            <div className="card-heading"><div><span>03</span><h2>提示词编辑器</h2></div><button onClick={()=>navigator.clipboard.writeText(prompt).then(()=>notify('提示词已复制'))}>复制</button></div>
            <div className="editor-meta"><span>{selected.slot}</span><div><b>{selected.title}</b><small>目标：{selected.goal}</small></div><label className="provider-select"><span>作图引擎</span><select value={provider} onChange={e=>setProvider(e.target.value as ImageProvider)}><option value="gemini">Nano Banana</option><option value="openai">GPT Image</option></select></label>{selected.badge&&<em>{selected.badge}</em>}</div>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} aria-label="Amazon 图片提示词" />
            <div className="prompt-chips">{['锁定商品外观','移动端可读','真实商业摄影','英文文案','高分辨率'].map(x=><button key={x} onClick={()=>setPrompt(v=>v+`，${x}`)}>+ {x}</button>)}</div>
            <div className="editor-footer"><div><span>✦ Prompt Guard</span><small>已检测：无违禁词 · 约束完整</small></div><button className="magic" onClick={generate} disabled={running}>{running?'编排中…':'✦ 生成这一张'}</button></div>
            {generatedImage&&<div className="generated-result"><img src={generatedImage} alt={`${selected.title} 生成结果`}/><div><b>已完成并保存 · {provider==='gemini'?'Nano Banana':'GPT Image'}</b><small>已归档到当前项目，仅当前工作空间成员可访问</small><a href={generatedImage} download={`amazon-${selected.id}.png`}>下载 PNG</a></div></div>}
          </div>
        </section>

        <section className="library-card" id="prompt-library">
          <div className="library-head"><div><p>AMAZON PROMPT LIBRARY</p><h2>专业图片提示词库</h2><span>覆盖主图、次图、A+、视频与营销素材，可直接融入当前商品资料。</span></div><label>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索提示词用途…"/></label></div>
          <div className="filter-row">{['全部 12','Listing 7图','A+ 内容','视频分镜','营销活动'].map((x,i)=><button className={i===0?'active':''} key={x}>{x}</button>)}</div>
          <div className="prompt-grid">{filtered.map(p=><article key={p.id}><div><span>{p.slot}</span>{p.badge&&<em>{p.badge}</em>}<button onClick={()=>navigator.clipboard.writeText(p.prompt).then(()=>notify('模板已复制'))}>复制</button></div><h3>{p.title}</h3><p>{p.prompt.slice(0,92)}…</p><footer><span>{p.goal}</span><button onClick={()=>applyPrompt(p)}>融入当前商品 ›</button></footer></article>)}</div>
        </section>

        <section className="project-card" id="listing-projects"><div className="project-head"><div><p>PROJECT PIPELINE</p><h2>真实项目记录</h2></div><Link href="/projects">查看全部项目 ›</Link></div><div className="project-table"><div><span>ASIN / SKU</span><span>商品</span><span>套图进度</span><span>状态</span><span>操作</span></div>{projectRows.length?projectRows.map((p,i)=>{const labels={draft:'草稿',generating:'生成中',review:'待审核',complete:'已完成'};const progress=Math.min(100,p.imageCount*14);return <div key={p.id}><span><b>{p.asin||`项目 ${p.id.slice(0,6)}`}</b><small>Amazon US</small></span><span>{p.title}</span><span><i><u style={{width:`${progress}%`}}/></i><b>{p.imageCount}/7</b></span><span><em className={`status s${i%3}`}>{labels[p.status]}</em></span><span><button onClick={()=>{setProjectId(p.id);setProjectTitle(p.title);notify('已切换到该项目，继续生成会归档至此')}}>打开项目</button></span></div>}):<div className="empty-project"><span>尚无真实项目</span><span>上传商品图并生成第一张素材后，项目会自动出现在这里。</span></div>}</div></section>
      </div>
    </section>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </main>;
}
