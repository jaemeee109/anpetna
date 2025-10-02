// src/app/order/pay/fail/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function TossFailPage() {
  const q = useSearchParams();
  const router = useRouter();
  const code = q.get('code') || '';
  const message = q.get('message') || '결제가 취소되었거나 실패했습니다.';
  const ordersId = q.get('ordersId') || '';

  return (
    <main className="mx-auto w-[700px] px-4 text-center">
      <h1 className="text-2xl font-semibold mt-[30px] mb-[20px]">결제 실패</h1>
      <p className="mb-2">{message}</p>
      {code ? <p className="text-gray-500 mb-6">({code})</p> : null}
      <div className="flex items-center justify-center gap-3">
        <button
          className="btn-3d btn-white !px-4 !py-2"
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined' && window.history.length > 1) {
              router.back();
            } else {
              router.replace('/order/checkout');
            }
          }}
        >
          주문서로 돌아가기
        </button>

        {ordersId ? (
          <button className="btn-3d btn-white !px-4 !py-2" onClick={() => router.replace(`/order/pay/${ordersId}`)}>
            다시 결제
          </button>
        ) : null}
      </div>
    </main>
  );
}
