'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AssetActions({ assetId }: { assetId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  async function removeAsset() {
    if (!window.confirm('确认删除这张素材吗？删除后无法恢复；如为原始图，其全部修改版本也会一并删除。')) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || '删除失败，请稍后重试');
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '删除失败，请稍后重试');
      setDeleting(false);
    }
  }
  return <div className="asset-actions"><a href={`/api/assets/${assetId}?download=1`}>下载</a><Link href={`/editor/${assetId}`}>局部修改</Link><button className="asset-delete" type="button" onClick={removeAsset} disabled={deleting}>{deleting ? '删除中…' : '删除'}</button></div>;
}
