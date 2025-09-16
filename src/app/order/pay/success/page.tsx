// src/app/order/pay/success/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function resolveApiBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    '';
  if (envBase) return envBase.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const guessPort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${guessPort ? `:${guessPort}` : ''}`.replace(/\/+$/, '');
}

export default function TossSuccessPage() {
  const router = useRouter();
  const q = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const paymentKey = q.get('paymentKey');
        const orderId = q.get('orderId');
        const amount = Number(q.get('amount') || '0');
        const ordersId = q.get('ordersId'); // 우리가 successUrl에 심어서 전달

        if (!paymentKey || !orderId || !amount) throw new Error('필수 결제 파라미터가 없습니다.');
        const base = resolveApiBase();
        const r = await fetch(`${base}/api/pay/toss/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, totalAmount: amount }),
        });
        if (!r.ok) throw new Error('결제 승인에 실패했습니다.');
        // 승인 성공 → 주문완료 페이지로
        if (!ordersId) throw new Error('주문번호(ordersId)를 확인할 수 없습니다.');
        router.replace(`/order/complete/${ordersId}`);
      } catch (e: any) {
        alert(e?.message || '결제 승인 중 오류가 발생했습니다.');
        router.replace('/order/checkout');
      }
    })();
  }, [q, router]);

  return <div className="px-4 py-10 text-center">결제를 확인하는 중…</div>;
}
