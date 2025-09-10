// src/app/order/member/[memberId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useOrdersByMember } from '@/features/order/hooks/useOrders';

export default function OrdersByMemberPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const { data, isLoading, error } = useOrdersByMember(memberId, 1, 20);

  return (
    <main style={{ maxWidth: 900, margin: '30px auto', padding: '0 12px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
        {memberId} 님 주문내역
      </h1>
      {isLoading ? <p>불러오는 중…</p> : error ? <p>오류: {(error as any)?.message}</p> : (
        <ul>
          {(data?.content ?? []).map((o) => (
            <li key={o.ordersId} style={{ padding: 10, border: '1px solid #eee', borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>주문번호 #{o.ordersId}</div>
              <div>총금액 {Number(o.totalAmount || 0).toLocaleString()} 원</div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
