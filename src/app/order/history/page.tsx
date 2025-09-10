// src/app/order/history/page.tsx
'use client';

import RequireLogin from '@/components/auth/RequireLogin';
import { useMyOrders } from '@/features/order/hooks/useOrders';

export default function MyOrderHistoryPage() {
  const { data, isLoading, error } = useMyOrders(1, 20);
  return (
    <RequireLogin>
      <main style={{ maxWidth: 900, margin: '30px auto', padding: '0 12px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, textAlign: 'center', marginBottom: 20 }}>
          내 주문(구매) 내역
        </h1>
        {isLoading ? <p>불러오는 중…</p> : error ? <p>오류: {(error as any)?.message}</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: 8 }}>주문번호</th>
                <th style={{ textAlign: 'left', padding: 8 }}>대표이미지</th>
                <th style={{ textAlign: 'left', padding: 8 }}>총금액</th>
              </tr>
            </thead>
            <tbody>
              {(data?.content ?? []).map((o) => (
                <tr key={o.ordersId} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={{ padding: 8 }}>#{o.ordersId}</td>
                  <td style={{ padding: 8 }}>
                    {o.itemImageUrl ? <img src={o.itemImageUrl} alt="" style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} /> : '-'}
                  </td>
                  <td style={{ padding: 8 }}>{Number(o.totalAmount || 0).toLocaleString()} 원</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </RequireLogin>
  );
}
