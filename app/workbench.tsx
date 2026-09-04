'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { AppUser } from '../lib/selfhost-auth';

type PromptCard = { id:string; slot:string; title:string; goal:string; prompt:string; negative:string; badge?:string };
type ImageProvider = 'openai' | 'gemini';
type ProjectRow = { id:string; asin:string|null; title:string; imageCount:number; status:'draft'|'generating'|'review'|'complete' };
type ProviderStatus={configured:boolean;model:string;cost:number};
type GenerationTask={id:string;slot:string;title:string;state:'generating'|'complete'|'failed';imageUrl?:string;message?:string;provider:ImageProvider};

const promptLibrary: PromptCard[] = [
  { id:'main',slot:'01',title:'MAIN 合规白底主图',goal:'搜索页点击率',badge:'合规必做',prompt:'创建 Amazon MAIN 商品主图。使用上传的真实商品作为唯一主体，纯白背景 RGB 255,255,255，商品居中并完整可见，占画面 85%–90%，2000×2000 正方形。专业柔光棚拍，真实颜色，边缘清晰，仅保留轻微自然接触阴影。严格保持商品结构、包装颜色、标签位置与文字，不改变 SKU。',negative:'无道具，无配件，无模特，无文字叠加，无徽章，无边框，无水印，无额外 Logo，无拼贴，无夸张光效，不裁切商品，不生成未包含在售卖套装中的物品。'},
  { id:'hero',slot:'02',title:'核心卖点信息图',goal:'3秒理解价值',badge:'高转化',prompt:'创建 Amazon 第二张卖点信息图，商品占画面中心 55%–65%，浅色品牌背景。围绕商品设计 3 组简洁图标、细引导线和清晰的文字安全区；图内不生成具体文字、数字、品牌名或参数，后续由系统叠加真实卖点。信息层级强，移动端缩略图仍可阅读。卖点所表达的能力必须严格来自输入资料，不虚构性能。',negative:'不使用密集小字，不超过 3 组信息，不生成乱码、伪文字或猜测参数，不使用未经证实的认证、第一、最佳、100% 等绝对化声明。'},
  { id:'life',slot:'03',title:'真实使用场景图',goal:'代入使用情境',prompt:'创建 Amazon 次图生活场景，产品在真实且符合品类的使用环境中，产品是明确焦点，3/4 视角，比例真实。自然窗光结合商业柔光，环境整洁但不失生活感，展现目标顾客正在解决的具体任务。保留真实商品几何、材质、颜色和标签。',negative:'不让产品缩成背景装饰，不使用不相关道具，不改变产品尺寸，不生成危险用法，不使用虚假前后对比，不添加营销文字或水印。'},
  { id:'size',slot:'04',title:'尺寸与比例说明图',goal:'降低尺寸误判',prompt:'创建 Amazon 尺寸与比例图。商品正视或 3/4 视角，浅灰白背景，完整展示长、宽、高的测量线与箭头，并为每个测量值预留清晰的空白标签安全区；图内不生成尺寸数字和单位，后续由系统填入真实参数。可加入一个中性的日常物品或手部作为真实比例参照，但不得遮挡商品。版式简洁、技术感、移动端可读。',negative:'不得猜测尺寸，不生成错误单位、乱码或伪数字，不扭曲比例，不放置多个参照物，不让测量线穿过标签安全区，不添加与尺寸无关的卖点。'},
  { id:'detail',slot:'05',title:'材质功能特写',goal:'证明品质细节',prompt:'创建 Amazon 商品细节特写。选择最能证明品质或功能的结构，使用微距商业摄影，方向性柔光揭示真实纹理、接缝、表面处理或功能结构。加入一个放大细节窗与 2 个极短说明标签，主商品仍可被识别。',negative:'不发明不存在的纹理、接口或结构，不磨平真实瑕疵，不使用虚假材质，不夸大微观结构，不生成无法验证的技术数字。'},
  { id:'bundle',slot:'06',title:'包装清单 / What’s Included',goal:'减少配件争议',prompt:'创建 Amazon 包装清单图。将所有实际包含的商品、配件和包装以整齐对称的俯拍方式排列，浅色纯净背景，比例准确，互不遮挡。为每件物品预留简短名称标签安全区，图内不生成英文名称，后续由系统填入真实清单；整体清晰、诚实、易盘点。',negative:'不得加入未随订单提供的道具或赠品，不重复配件，不改变数量、颜色和型号，不生成乱码或猜测名称，不使用装饰物制造错误暗示。'},
  { id:'compare',slot:'07',title:'差异化对比图',goal:'回答购买犹豫',prompt:'创建 Amazon 产品对比信息图，左右双栏或表格式清晰布局。左侧和右侧各设计 4 行可编辑的对比标签安全区，图内不生成具体文字、数字或竞品名称；后续由系统填入经核验的材质、尺寸、容量、结构或使用体验。左栏突出本产品，右栏以中性“普通方案”表达常见限制，不出现竞品商标。',negative:'不攻击竞品，不使用竞品名称或 Logo，不虚构数据，不生成乱码、伪表格文字或“Best/No.1/Guaranteed”，不制作无法证明的效果对比。'},
  { id:'a-hero',slot:'A+',title:'A+ 品牌横幅',goal:'品牌故事与价值',badge:'1464×600',prompt:'创建 Amazon A+ 宽幅品牌横幅，宽屏商业摄影构图。产品在真实使用场景中，右侧为产品与环境，左侧保留干净负空间用于后期标题和品牌文案。高分辨率、自然比例、品牌色克制统一，体现品牌使命与核心使用价值。',negative:'图片内不生成长段文字，不加入价格、促销、联系方式、二维码、外部链接、保证或保修声明，不使用未经证实的奖项和认证。'},
  { id:'a-material',slot:'A+',title:'A+ 材质 / 成分故事',goal:'解释产品价值',prompt:'创建 Amazon A+ 材质故事模块。产品作为视觉中心，周围克制展示真实原材料、成分或生产工艺线索，采用编辑式静物摄影与自然柔光。画面清晰传达材料来源和制作质感，预留简短说明区域。',negative:'不展示配方中不存在的成分，不暗示医疗功效，不使用实验室画面制造伪科学印象，不生成冗长文字。'},
  { id:'a-process',slot:'A+',title:'A+ 使用步骤图',goal:'降低使用门槛',prompt:'创建 Amazon A+ 三步骤使用说明图。使用同一真实产品和一致场景，横向三格叙事，每格只表现一个清晰动作，人物手部与产品比例自然，预留 STEP 1/2/3 和短说明区域。光线、色调、镜头高度保持一致。',negative:'不省略关键安全步骤，不改变产品外观，不生成多余手指，不让步骤顺序含糊，不加入大段营销文案。'},
  { id:'season',slot:'营销',title:'Prime Day 活动场景',goal:'广告与促销素材',prompt:'创建面向 Amazon 活动广告的高级商品场景图。产品保持真实，置于深海军蓝与克制电光蓝的动态商业布景中，强视觉中心，留出促销标题安全区。画面高级、清晰、可用于 Sponsored Brands 或 Store 页面二次排版。',negative:'不直接生成 Amazon、Prime Day 商标或活动徽章，不生成价格和折扣，不添加未经授权的平台标识，不扭曲产品标签。'},
  { id:'video',slot:'视频',title:'7镜头视频分镜',goal:'主图视频脚本',prompt:'为 Amazon 商品视频创建 7 镜头视觉分镜：1 白底英雄镜头；2 使用痛点；3 产品登场；4 核心结构特写；5 真实使用；6 包装清单；7 品牌收束。每个镜头给出构图、镜头运动、光线和 3–5 秒动作，所有镜头保持同一 SKU 外观与品牌色。',negative:'不生成不可验证的承诺，不加入竞品商标，不设计危险用法，不使用过度特效掩盖产品，不让字幕超过安全区。'},
  { id:'spec',slot:'补充',title:'规格参数版式',goal:'减少规格疑问',prompt:'创建 Amazon 规格参数说明图。以真实商品为中心，采用干净的工程化版式，围绕商品设计 5–6 个统一的图标与参数标签安全区；图片内不生成型号、数字、单位或说明文字，后续由系统填入已核验规格。背景简洁、对齐规整、适合移动端阅读。',negative:'不得猜测参数或单位，不生成乱码、伪数字或夸张性能图标，不使用未证实的认证和测试结论。'},
  { id:'compatibility',slot:'补充',title:'适配 / 兼容说明图',goal:'降低错购与退货',prompt:'创建 Amazon 兼容性说明图。以商品和真实可兼容对象为主视觉，采用清晰的“适用 / 不适用”双区域布局，预留可编辑标签安全区。所有兼容关系必须来自输入资料；图内不生成型号或文字，后续由系统填入真实信息。',negative:'不声称未验证的兼容性，不使用第三方品牌 Logo，不画出未包含的转接件，不生成具体型号、乱码或伪文字。'},
  { id:'variation',slot:'补充',title:'颜色与规格变体图',goal:'帮助准确选择',prompt:'创建 Amazon 颜色与规格变体选择图。将同一真实 SKU 的已提供变体整齐并列，保持拍摄角度、光线、比例和背景一致；每个变体下方预留统一名称标签安全区，图内不生成颜色名、尺寸或文字。突出差异但不混淆实际可售组合。',negative:'不增加不存在的颜色、尺寸、套装或图案，不混用不同 SKU 配件，不生成乱码、价格或促销标识。'},
  { id:'install',slot:'补充',title:'安装与使用前提图',goal:'降低使用门槛',prompt:'创建 Amazon 安装或首次使用说明图。以 3–4 个连续画面展示真实准备、安装和检查动作，每一格预留步骤编号与短说明安全区，图内不生成文字。环境、工具和动作必须来自产品资料，商品主体始终清楚可见。',negative:'不省略安全前提，不设计危险操作，不增加未附带工具，不生成多余手指、乱码或错误步骤。'},
  { id:'care',slot:'补充',title:'清洁维护说明图',goal:'建立长期信任',prompt:'创建 Amazon 清洁维护说明图。使用真实商品和安全、可验证的维护动作，设计 3 个简洁图标与说明安全区，留出后期文字位置。画面干净、克制、易理解，突出正确保养方式而非夸大效果。',negative:'不建议未验证的清洁剂或使用方法，不暗示永久耐用或医疗效果，不生成大段文字、乱码或危险动作。'},
  { id:'gift',slot:'营销',title:'礼品与节日场景',goal:'节日转化素材',prompt:'创建适合 Amazon 广告与品牌店铺使用的礼品场景图。真实商品作为视觉焦点，融入克制、现代的节日氛围与礼赠情境，保留一块干净标题安全区。产品外观、包装和配件必须完全真实，画面可供后期排版。',negative:'不生成价格、折扣、平台商标、礼盒内不存在的配件或夸张节日文字，不改变产品标签。'},
  { id:'store',slot:'营销',title:'品牌店铺首屏横幅',goal:'Store 首屏导流',badge:'横幅',prompt:'创建 Amazon Brand Store 首屏横幅。采用宽屏叙事构图，真实商品和目标使用场景形成清晰视觉焦点，左侧或右侧保留至少 35% 干净负空间作为后期标题、按钮和品牌文案安全区。色调统一、高级、自然。',negative:'图内不生成品牌名、口号、价格、按钮文字、外链或平台 Logo，不将产品裁切到无法辨识。'},
  { id:'a-compare',slot:'A+',title:'A+ 真实参数对比模块',goal:'辅助理性决策',prompt:'创建 Amazon A+ 参数对比模块。用真实商品、简洁图标和 3–4 个横向对比行构成模块化版式，每一行均预留可编辑文字安全区；图片内不生成任何参数、数字或竞品名称，后续只填入可核验资料。',negative:'不攻击竞品，不使用竞品 Logo、伪数据、绝对化承诺、乱码或未经验证的性能结论。'},
  { id:'a-scene',slot:'A+',title:'A+ 场景矩阵',goal:'扩展使用想象',prompt:'创建 Amazon A+ 场景矩阵。以同一真实商品串联 3 个不同但真实的使用情境，采用一致色调和镜头语言，每格留出短标题安全区。明确展示适用人群、空间或时机，但不改变产品结构与功能边界。',negative:'不生成不安全、违规或不适用的使用场景，不加入文字、品牌口号、虚假功效或不相关道具。'},
  { id:'a-faq',slot:'A+',title:'A+ FAQ 与注意事项',goal:'降低购买顾虑',prompt:'创建 Amazon A+ FAQ 与注意事项模块背景。用真实产品局部、简洁问答图标和 4 个统一的可编辑文本安全区构成清晰版式，适合后期叠加已核验的问答和注意事项；整体克制、可信、容易扫读。',negative:'不生成具体问答文字、承诺、保修条款、医疗或安全认证，不产生乱码、伪文字或未验证结论。'},
  { id:'electronics',slot:'品类',title:'3C 结构与接口拆解',goal:'解释技术卖点',prompt:'创建消费电子产品的 Amazon 结构与接口拆解图。真实产品为中心，使用精确引导线、接口轮廓和 4 个标签安全区；图内不生成端口名称、协议、功率或数字，后续只填入已核验的真实规格。采用干净科技感背景。',negative:'不发明接口、芯片、认证、续航或功率，不生成错误文字、数字、商标或内部结构。'},
  { id:'home',slot:'品类',title:'家居收纳空间解决方案',goal:'展示空间价值',prompt:'创建家居与收纳品类 Amazon 场景图。展示真实商品在整洁、可实现的家庭空间中解决一个具体收纳或动线问题，产品比例准确、结构清楚；预留 2–3 个简短说明安全区，图内不生成文字。',negative:'不夸大容量，不改变安装方式或尺寸，不使用不真实豪宅场景、乱码、价格或夸张前后对比。'},
  { id:'outdoor',slot:'品类',title:'户外耐用细节场景',goal:'证明户外适用性',prompt:'创建户外用品 Amazon 耐用细节场景图。让真实商品处于与其用途匹配的户外环境，结合一处材质或结构特写，留出可编辑说明安全区；光线真实、产品边界清楚，重点表现已核验的使用环境。',negative:'不暗示未验证的防水、防火、承重或极端耐候能力，不生成危险动作、伪认证、文字、数字或不属于套装的装备。'},
];

const categories = ['家居厨房','家具家装','灯具照明','园艺庭院','清洁用品','美容个护','健康保健','消费电子','手机数码配件','电脑办公','户外运动','运动健身','玩具游戏','宠物用品','母婴用品','服饰箱包','鞋靴配饰','珠宝首饰','汽车用品','工具五金','工业与科研','办公文具','食品饮料','乐器影音','影视与摄影','节庆派对','礼品与收藏','其他品类'];
export default function Workbench({user}:{user:AppUser}) {
  const [productImage,setProductImage]=useState<string|null>(null);
  const [category,setCategory]=useState(categories[0]);
  const [market,setMarket]=useState('美国站');
  const [selected,setSelected]=useState(promptLibrary[0]);
  const [prompt,setPrompt]=useState(promptLibrary[0].prompt+'\n\n负面约束：'+promptLibrary[0].negative);
  const [query,setQuery]=useState('');
  const [libraryFilter,setLibraryFilter]=useState<'all'|'listing'|'aplus'|'video'|'campaign'|'supplement'|'category'>('all');
  const [toast,setToast]=useState('');
  const [compliance,setCompliance]=useState(true);
  const [provider,setProvider]=useState<ImageProvider>('gemini');
  const [projectId,setProjectId]=useState<string|null>(null);
  const [creditsRemaining,setCreditsRemaining]=useState<number|null>(null);
  const [projectTitle,setProjectTitle]=useState('');
  const [sellingPoints,setSellingPoints]=useState('');
  const [asin,setAsin]=useState('');
  const [brand,setBrand]=useState('');
  const [projectRows,setProjectRows]=useState<ProjectRow[]>([]);
  const [providers,setProviders]=useState<Record<ImageProvider,ProviderStatus>|null>(null);
  const [tasks,setTasks]=useState<GenerationTask[]>([]);
  const filtered=useMemo(()=>promptLibrary.filter(p=>(p.title+p.goal+p.slot).toLowerCase().includes(query.toLowerCase())).filter(p=>libraryFilter==='all'||(libraryFilter==='listing'&&/^0[1-7]$/.test(p.slot))||(libraryFilter==='aplus'&&p.slot==='A+')||(libraryFilter==='video'&&p.slot==='视频')||(libraryFilter==='campaign'&&p.slot==='营销')||(libraryFilter==='supplement'&&p.slot==='补充')||(libraryFilter==='category'&&p.slot==='品类')),[query,libraryFilter]);
  useEffect(()=>{fetch('/api/projects').then(r=>r.ok?r.json():null).then(data=>{const payload=data as {projects?:ProjectRow[]}|null;const rows=payload?.projects??[];setProjectRows(rows);const requested=new URLSearchParams(window.location.search).get('project');const current=rows.find(p=>p.id===requested);if(current){setProjectId(current.id);setProjectTitle(current.title);setAsin(current.asin||'');notify('已载入项目，可继续生成素材')}}).catch(()=>setProjectRows([]))},[tasks]);
  useEffect(()=>{fetch('/api/providers').then(r=>r.ok?r.json():null).then(raw=>{const data=raw as Record<ImageProvider,ProviderStatus>|null;if(data){setProviders(data);if(!data.gemini.configured&&data.openai.configured)setProvider('openai')}}).catch(()=>setProviders(null))},[]);
  function notify(text:string){setToast(text);setTimeout(()=>setToast(''),1800)}
  function upload(e:ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024){notify('商品参考图不能超过 10MB');return;}const reader=new FileReader();reader.onload=()=>{setProductImage(String(reader.result));notify('商品参考图已上传，生成时将锁定外观')};reader.readAsDataURL(f)}
  function applyPrompt(p:PromptCard){setSelected(p);setPrompt(`${p.prompt}\n\n品类：${category}；站点：Amazon ${market}。\n负面约束：${p.negative}`);notify(`已载入「${p.title}」，商品资料会在生成时自动合并`)}
  async function generate(){
    if(!providers?.[provider]?.configured){notify(`${provider==='gemini'?'Nano Banana':'GPT Image'} 尚未配置 API 密钥`);return;}
    if(!projectTitle.trim()){notify('请先填写商品名称');return;}
    if(!productImage){notify('请先上传真实商品参考图，才能锁定商品外观');return;}
    if(tasks.some(task=>task.slot===selected.slot&&task.state==='generating')){notify('这一张正在生成，请先选择其他图位继续制作');return;}
    if(tasks.filter(task=>task.state==='generating').length>=3){notify('当前最多可同时生成 3 张，请等待其中一张完成');return;}
    const productContext=[`商品名称：${projectTitle.trim()}`,brand.trim()&&`品牌：${brand.trim()}`,sellingPoints.trim()&&`已确认核心卖点：${sellingPoints.trim()}`,asin.trim()&&`ASIN：${asin.trim()}`,`品类：${category}`,`目标站点：Amazon ${market}`].filter(Boolean).join('\n');
    const enrichedPrompt=`${prompt}\n\n本次真实商品资料（不得虚构或改写事实）：\n${productContext}`;
    const taskId=crypto.randomUUID();setTasks(current=>[{id:taskId,slot:selected.slot,title:selected.title,state:'generating',provider},...current]);notify(`已加入生成队列，可继续制作其他图位`);
    try{
      const response=await fetch('/api/images/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,prompt:enrichedPrompt,referenceImage:productImage,size:selected.id==='a-hero'?'1536x1024':'1024x1024',projectId,projectTitle,slot:selected.slot,category,market:`Amazon ${market}`,asin:asin.trim()||undefined})});
      const data=await response.json() as {imageUrl?:string;projectId?:string;creditsRemaining?:number;error?:string};
      if(!response.ok||!data.imageUrl)throw new Error(data.error||'任务未返回图片');
      setProjectId(data.projectId??null);setCreditsRemaining(data.creditsRemaining??null);setTasks(current=>current.map(task=>task.id===taskId?{...task,state:'complete',imageUrl:data.imageUrl}:task));notify(`${selected.title} 已完成并保存`);
    }catch(error){const message=error instanceof Error?error.message:'生成失败，请稍后重试';setTasks(current=>current.map(task=>task.id===taskId?{...task,state:'failed',message}:task));notify(message)}
  }

  return <main className="amazon-app">
    <aside className="amazon-sidebar">
      <div className="brand"><span className="brand-mark">N</span><span>NovaCanvas</span></div>
      <div className="amazon-mode"><span>amazon</span><b>Creative OS</b><i>US</i></div>
      <nav aria-label="主导航">
        <p>生产中心</p>
        <Link className="active" href="/workbench"><span>▦</span>套图工作台</Link>
        <a href="#prompt-library"><span>✦</span>提示词库<em>12</em></a>
        <Link href="/a-plus"><span>A+</span>A+ 内容画布</Link>
        <Link href="/compliance"><span>✓</span>合规检测</Link>
        <Link href="/projects"><span>▤</span>Listing 项目</Link>
        <p>团队管理</p>
        <Link href="/account"><span>◎</span>账号与套餐</Link>
        {(user.role==='owner'||user.role==='admin')&&<Link href="/admin"><span>⌘</span>管理后台</Link>}
      </nav>
      <div className="usage-card"><div><span>账户算力</span><b>{creditsRemaining===null?`${user.credits} 点可用`:`${creditsRemaining} 点可用`}</b></div><small>生成后自动扣减并记录；余额不足时不会发起任务。</small><button onClick={()=>window.location.href='/account'}>查看账户与用量</button></div>
    </aside>

    <section className="amazon-main">
      <header className="amazon-topbar">
        <div><b>Amazon 套图工作台</b><span>商品资料与生成素材仅保存在公司服务器</span></div>
        <div className="top-actions"><a className="help-link" href="#prompt-library">使用指南</a><Link href="/account" className="user-chip"><i>{user.name.slice(0,2).toUpperCase()}</i><span><b>{user.name}</b><small>{user.role==='owner'?'所有者':user.role==='admin'?'管理员':'成员'}</small></span><em>⌄</em></Link></div>
      </header>

      <div className="amazon-content">
        <section className="hero-row">
          <div><p>AMAZON LISTING IMAGE SYSTEM</p><h1>从真实商品图，制作完整 Listing 素材</h1><span>以 7 图故事板为起点，支持同一项目持续追加、重做与保存多个版本。</span></div>
          <div className="compliance-score"><i>14</i><span><b>基础合规规则</b><small>供运营生成前核对</small></span><em>{compliance?'已开启':'未启用'}</em></div>
        </section>

        <section className="setup-card" id="product-info">
          <div className="setup-title"><span>01</span><div><h2>商品资料</h2><p>先上传真实商品图，再填写商品资料；这是生成商品图的必要步骤。</p></div><button onClick={()=>document.getElementById('asin-input')?.focus()}>填写 ASIN</button></div>
          <div className="setup-grid">
            <label className={`amazon-upload ${productImage?'filled':''}`}><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/>{productImage?<img src={productImage} alt="商品参考图"/>:<><i>↥</i><b>上传商品参考图</b><span>正面白底图效果最佳 · 生成必需</span><small>PNG / JPG / WEBP · 最大 10MB</small></>}</label>
            <div className="form-fields">
              <label>商品名称<input value={projectTitle} onChange={e=>setProjectTitle(e.target.value)} /></label>
              <div><label>Amazon 站点<select value={market} onChange={e=>setMarket(e.target.value)}><option>美国站</option><option>英国站</option><option>德国站</option><option>日本站</option></select></label><label>商品品类<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label></div>
              <label>核心卖点<input value={sellingPoints} onChange={e=>setSellingPoints(e.target.value)} placeholder="仅填写真实、可证明的卖点，用 / 分隔" /></label>
              <div><label>ASIN（选填）<input id="asin-input" value={asin} onChange={e=>setAsin(e.target.value.toUpperCase())} placeholder="B0XXXXXXXXX" /></label><label>品牌名<input value={brand} onChange={e=>setBrand(e.target.value)} placeholder="填写真实品牌名" /></label></div>
            </div>
            <div className="rule-panel"><div><span>✓</span><b>MAIN 主图合规锁</b><button onClick={()=>setCompliance(!compliance)} className={compliance?'on':''}><i/></button></div>{['纯白背景 #FFFFFF','商品占画面 85%+','不添加文字与徽章','不生成非售卖配件','保持真实标签与颜色'].map(x=><p key={x}><i>✓</i>{x}</p>)}<small>生成前自动执行 14 项规则检查</small></div>
          </div>
        </section>

        <section className="production-grid">
          <div className="storyboard-card">
            <div className="card-heading"><div><span>02</span><h2>Amazon 7 图故事板</h2><em>可无限追加版本</em></div></div>
            <div className="storyboard-grid">
              {promptLibrary.slice(0,7).map((p,i)=><button key={p.id} onClick={()=>applyPrompt(p)} className={selected.id===p.id?'selected':''}><div className={`board-art b${i}`}>{productImage&&<img src={productImage} alt=""/>}<span>{p.slot}</span><i>{i===0?'MAIN':i===2?'IN USE':i===5?'IN THE BOX':'IMAGE'}</i></div><b>{p.title}</b><small>{p.goal}</small><em>{selected.id===p.id?'正在编辑':'编辑提示词'}</em></button>)}
            </div>
            <div className="sequence-tip"><span>💡</span><p><b>图片叙事建议</b>第 1 张负责点击，第 2–3 张回答“为什么买”，第 4–6 张降低尺寸、材质和配件疑虑，第 7 张完成差异化决策。</p></div>
          </div>

          <div className="editor-card">
            <div className="card-heading"><div><span>03</span><h2>提示词编辑器</h2></div><button onClick={()=>navigator.clipboard.writeText(prompt).then(()=>notify('提示词已复制'))}>复制</button></div>
            <div className="editor-meta"><span>{selected.slot}</span><div><b>{selected.title}</b><small>目标：{selected.goal}</small></div><label className="provider-select"><span>作图引擎</span><select value={provider} onChange={e=>setProvider(e.target.value as ImageProvider)}><option value="gemini" disabled={providers? !providers.gemini.configured:false}>Nano Banana{providers&&!providers.gemini.configured?'（未配置）':''}</option><option value="openai" disabled={providers? !providers.openai.configured:false}>GPT Image{providers&&!providers.openai.configured?'（未配置）':''}</option></select></label>{selected.badge&&<em>{selected.badge}</em>}</div>
            <textarea value={prompt} onChange={e=>setPrompt(e.target.value)} aria-label="Amazon 图片提示词" />
            <div className="prompt-chips">{['锁定商品外观','移动端可读','真实商业摄影','英文文案','高分辨率'].map(x=><button key={x} onClick={()=>setPrompt(v=>v+`，${x}`)}>+ {x}</button>)}</div>
            <div className="editor-footer"><div><span>✦ 基础规则提示</span><small>请仅填写真实、可证明的卖点；生成后仍需人工复核。</small></div><button className="magic" onClick={generate} disabled={tasks.some(task=>task.slot===selected.slot&&task.state==='generating')}>{tasks.some(task=>task.slot===selected.slot&&task.state==='generating')?'此图生成中…':'✦ 生成这一张'}</button></div>
            {tasks.length>0&&<div className="generation-queue" aria-live="polite"><b>生成任务（最多同时 3 张）</b>{tasks.slice(0,5).map(task=><div key={task.id} className={`task-${task.state}`}><span>{task.slot}</span><p><strong>{task.title}</strong><small>{task.state==='generating'?'生成中，可继续选择其他图位':task.state==='complete'?'已保存到项目素材库':task.message||'生成失败'}</small></p>{task.imageUrl&&<><a href={`${task.imageUrl}?download=1`}>下载</a><Link href={`/editor/${task.imageUrl.split('/').pop()}`}>局部修改</Link></>}</div>)}</div>}
          </div>
        </section>

        <section className="library-card" id="prompt-library">
          <div className="library-head"><div><p>AMAZON PROMPT LIBRARY</p><h2>专业图片提示词库</h2><span>覆盖主图、次图、A+、视频与营销素材，可直接融入当前商品资料。</span></div><label>⌕<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索提示词用途…"/></label></div>
          <div className="filter-row">{([{id:'all',label:`全部 ${promptLibrary.length}`},{id:'listing',label:'Listing 7图'},{id:'supplement',label:'补充图'},{id:'aplus',label:'A+ 内容'},{id:'campaign',label:'营销活动'},{id:'category',label:'品类专用'},{id:'video',label:'视频分镜'}] as const).map(x=><button onClick={()=>setLibraryFilter(x.id)} className={libraryFilter===x.id?'active':''} key={x.id}>{x.label}</button>)}</div>
          <div className="prompt-grid">{filtered.map(p=><article key={p.id}><div><span>{p.slot}</span>{p.badge&&<em>{p.badge}</em>}<button onClick={()=>navigator.clipboard.writeText(p.prompt).then(()=>notify('模板已复制'))}>复制</button></div><h3>{p.title}</h3><p>{p.prompt.slice(0,92)}…</p><footer><span>{p.goal}</span><button onClick={()=>applyPrompt(p)}>融入当前商品 ›</button></footer></article>)}</div>
        </section>

        <section className="project-card" id="listing-projects"><div className="project-head"><div><p>PROJECT PIPELINE</p><h2>真实项目记录</h2></div><Link href="/projects">查看全部项目 ›</Link></div><div className="project-table"><div><span>ASIN / SKU</span><span>商品</span><span>生成数量</span><span>状态</span><span>操作</span></div>{projectRows.length?projectRows.map((p,i)=>{const labels={draft:'草稿',generating:'生成中',review:'待审核',complete:'已完成'};const progress=Math.min(100,Math.max(8,p.imageCount*12));return <div key={p.id}><span><b>{p.asin||`项目 ${p.id.slice(0,6)}`}</b><small>Amazon US</small></span><span>{p.title}</span><span><i><u style={{width:`${progress}%`}}/></i><b>已生成 {p.imageCount} 张</b></span><span><em className={`status s${i%3}`}>{labels[p.status]}</em></span><span><button onClick={()=>{setProjectId(p.id);setProjectTitle(p.title);document.getElementById('product-info')?.scrollIntoView({behavior:'smooth',block:'start'});notify('已选择该项目，可持续追加或重做图片')}}>选择项目</button></span></div>}):<div className="empty-project"><span>尚无真实项目</span><span>上传商品图并生成第一张素材后，项目会自动出现在这里。</span></div>}</div></section>
      </div>
    </section>
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </main>;
}
