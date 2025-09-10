// src/app/order/complete/[ordersId]/page.tsx
'use client';

import Link from 'next/link';

export default function OrderCompletePage({ params }: { params: { ordersId: string } }) {
  const { ordersId } = params;

  return (
    <main className="mx-auto max-w-[720px] px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold mb-6">주문이 완료되었습니다</h1>

      <p className="mb-8">
        <span className="font-semibold">주문번호:</span>{' '}
        <span>{ordersId}</span>
      </p>

      <div className="flex items-center justify-center gap-3">
        <Link href="/order/history" className="btn-3d btn-white">
          구매내역
        </Link>
        <Link href="/" className="btn-3d btn-white">
          홈화면가기
        </Link>
      </div>
    </main>
  );
}
