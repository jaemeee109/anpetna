// src/app/order/history/page.tsx
'use client';

import Link from 'next/link';
import RequireLogin from '@/components/auth/RequireLogin';
import { useQuery } from '@tanstack/react-query';
import orderApi from '@/features/order/data/order.api';
import { readMemberMe } from '@/features/member/data/member.api';
import { useEffect, useState } from 'react';

export default function OrderHistoryPage() {
  const [me, setMe] = useState<{ memberId: string } | null>(null);

  // 1) 로그인 사용자 확보
  useEffect(() => {
    (async () => {
      try {
        const m = await readMemberMe(); // 토큰 기반
        if (m?.memberId) setMe({ memberId: m.memberId });
      } catch {
        // 혹시 모를 타이밍 이슈 대비: 로컬에도 보관된 경우가 있다면 보조로 사용
        const mid = (typeof window !== 'undefined') ? localStorage.getItem('memberId') : null;
        if (mid) setMe({ memberId: mid });
      }
    })();
  }, []);

  // 2) 회원별 주문 요약 조회 (/order/members/{memberId}?page=0&size=20&sort=ordersId,desc)
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'by-member', me?.memberId, 0],
    queryFn: () => orderApi.summaryByMember(me!.memberId, { page: 0, size: 20, sort: 'ordersId,desc' }),
    enabled: !!me?.memberId,
  });

  return (
    <RequireLogin>
      <main className="mx-auto max-w-[900px] px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">구매내역</h1>

        {!me?.memberId && <p>로그인 정보를 확인하는 중...</p>}
        {me?.memberId && isLoading && <p>구매내역을 불러오는 중...</p>}
        {me?.memberId && error && <p className="text-red-500">구매내역을 불러오지 못했습니다.</p>}

        {me?.memberId && Array.isArray(data?.content) && data.content.length === 0 && (
          <p>구매내역이 없습니다.</p>
        )}

        <div className="space-y-3">
          {Array.isArray(data?.content) &&
            data.content.map((line: any) => (
              <Link
                key={line.ordersId}
                href={`/order/history/${line.ordersId}`}
                className="flex items-center gap-4 border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
              >
                <img
                  src={line.thumbnailUrl || '/file.svg'}
                  alt=""
                  className="w-[96px] h-[72px] object-cover rounded-md border"
                />
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <div className="col-span-2 font-semibold truncate">주문번호 {line.ordersId}</div>
                  <div className="text-center">수량 {Number(line.itemQuantity ?? 0)}</div>
                  <div className="text-right font-bold">
                    {Number(line.totalAmount ?? 0).toLocaleString()} 원
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </main>
    </RequireLogin>
  );
}
