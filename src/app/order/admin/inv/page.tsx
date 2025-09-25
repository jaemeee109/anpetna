// src/app/order/admin/inv/page.tsx
'use client';

import { useMemo } from 'react';
import InventoryTable from '@/features/order/ui/InventoryTable';
import Paw from '@/components/icons/Paw';

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AdminInventoryPage() {
  // ERP 페이지와 동일하게 기본 기간: 최근 30일
  const today = useMemo(() => new Date(), []);
  const d30 = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const from = fmtDate(d30);
  const to = fmtDate(today);

  return (
    <main className="apn-main mx-auto w-full max-w-[900px] px-4 py-6" style={{ paddingBottom: 40 }}>
      {/* InventoryTable 자체에 타이틀/필터/테이블 스타일이 포함되어 있으므로 그대로 사용 */}
      <InventoryTable from={from} to={to} />
    </main>
  );
}
