// src/features/order/hooks/useOrders.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import orderApi from '@/features/order/data/order.api';
import { readMemberMe } from '@/features/member/data/member.api'; // 본인 정보 불러오기

/** 로그인 사용자의 주문 요약 페이지 */
export function useMyOrders(page = 1, size = 10) {
  return useQuery({
    queryKey: ['orders', 'me', page, size],
    queryFn: async () => {
      const me = await readMemberMe(); // memberId 확보
      const memberId = String(me?.memberId ?? me?.id ?? me?.loginId ?? '');
      if (!memberId) throw new Error('로그인 정보가 없습니다.');
      return orderApi.summaryByMember(memberId, { page, size });
    },
  });
}

/** 특정 회원의 주문 요약 페이지 */
export function useOrdersByMember(memberId: string, page = 1, size = 10) {
  return useQuery({
    queryKey: ['orders', 'member', memberId, page, size],
    queryFn: () => orderApi.summaryByMember(memberId, { page, size }),
    enabled: !!memberId,
  });
}
