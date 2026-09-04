'use client';

import { useEffect, useState } from 'react';

const rules=[['MAIN 主图','纯白背景 RGB 255/255/255；只展示实际售卖商品；主体建议占画面 85% 以上。'],['文字与徽章','主图不加文字、边框、水印、促销徽章；次图文案需可核验且移动端可读。'],['真实性','不得改变 SKU 的颜色、结构、数量、包装文字和实际包含的配件。'],['声明合规','避免绝对化、医疗功效、未获认证和无法举证的对比数据。'],['版权与品牌','不使用竞品 Logo、平台活动徽章、无授权人物或第三方版权素材。']] as const;
const storageKey='novacanvas-compliance-checklist-v1';

export function ComplianceChecklist(){
  const [checked,setChecked]=useState<boolean[]>(()=>rules.map(()=>false));
  const [ready,setReady]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))setChecked(rules.map((_,index)=>saved[index]===true));}catch{}setReady(true)},0);return()=>window.clearTimeout(timer)},[]);
  function toggle(index:number){setChecked(current=>{const next=current.map((value,item)=>item===index?!value:value);localStorage.setItem(storageKey,JSON.stringify(next));return next})}
  const confirmed=checked.filter(Boolean).length;
  return <><div className="compliance-progress" aria-live="polite"><b>发布前确认</b><span>{ready?`已确认 ${confirmed}/${rules.length} 项`:'正在载入检查记录…'}</span>{confirmed===rules.length&&<em>检查完成，可进入发布前复核</em>}</div><div className="rule-cards">{rules.map((rule,i)=><article key={rule[0]} className={checked[i]?'confirmed':''}><i>{String(i+1).padStart(2,'0')}</i><div><h2>{rule[0]}</h2><p>{rule[1]}</p></div><label><input type="checkbox" checked={checked[i]} onChange={()=>toggle(i)}/><span>{checked[i]?'已确认':'待确认'}</span></label></article>)}</div></>;
}
