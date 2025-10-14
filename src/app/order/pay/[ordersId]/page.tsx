// src/app/order/pay/[ordersId]/page.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

async function loadToss(clientKey: string): Promise<any> {
  // 이미 로드 됐으면 바로 사용
  // @ts-ignore
  if (typeof window !== 'undefined' && (window as any).TossPayments) {
    // @ts-ignore
    // eslint-disable-next-line no-undef
    return (window as any).TossPayments(clientKey);
  }
  // 스크립트 로드
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://js.tosspayments.com/v1'; // 토스 JS SDK
    s.onload = () => {
      try {
        // @ts-ignore
        // eslint-disable-next-line no-undef
        const tp = (window as any).TossPayments(clientKey);
        resolve(tp);
      } catch (e) {
        reject(e);
      }
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function OrderPayPage() {
  const { ordersId } = useParams<{ ordersId: string }>();
  const router = useRouter();
  const ranRef = useRef(false); // ✅ 이 페이지에서 결제 시도는 1회만

  useEffect(() => {
    if (ranRef.current) return;     // ✅ 재마운트/되돌아오기 등에 의한 반복 실행 방지
    ranRef.current = true;

    (async () => {
      try {
        const id = Number(Array.isArray(ordersId) ? ordersId[0] : ordersId);
        if (!Number.isFinite(id) || id <= 0) throw new Error('유효하지 않은 주문번호');

        // 1) 결제 준비 호출
        const base = resolveApiBase();
        const r = await fetch(`${base}/api/pay/toss/prepare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNo: id, method: 'CARD' }),
        });
        const j = await r.json();
        const prep = j?.result ?? j;
        const orderId = prep?.orderId;
        const amount = prep?.totalAmount;
        const orderName = prep?.orderName || `주문 ${id}`;
        if (!orderId || !amount) throw new Error('결제 준비 정보가 없습니다.');

        // 2) 토스 SDK 로드 → 결제창 오픈
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY as string | undefined;
        if (!clientKey) throw new Error('NEXT_PUBLIC_TOSS_CLIENT_KEY 환경변수가 설정되어 있지 않습니다.');

        const tp = await loadToss(clientKey);
        const origin = window.location.origin;
        await tp.requestPayment('카드', {
          amount,
          orderId,
          orderName,
          successUrl: `${origin}/order/pay/success?orderId=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}&ordersId=${id}`,
          failUrl: `${origin}/order/pay/fail?ordersId=${id}`,
        });
      } catch (e: any) {
        // ✅ 위젯 내부에서 취소/닫기 등으로 reject가 발생하는 경우:
        //    back()로 되돌리면 다시 이 페이지를 타는 루프가 생길 수 있으므로 fail 페이지로 고정 이동
        alert(e?.message || '결제를 취소하였습니다.');
        const id = Number(Array.isArray(ordersId) ? ordersId[0] : ordersId);
        router.replace(`/order/pay/fail?ordersId=${Number.isFinite(id) ? id : ''}`);
      }
    })();
  }, [ordersId, router]);
}