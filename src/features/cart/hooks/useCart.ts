// src/features/cart/hooks/useCart.ts
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../data/cart.api';
import type { AddCartReq, CartDTO, UpdateCartReq } from '../data/cart.types';

/** 장바구니 조회 */
export function useCart() {
  return useQuery<CartDTO>({
    queryKey: ['cart', 'me'],
    queryFn: () => cartApi.me(),
    staleTime: 1000 * 30,
  });
}

/** 장바구니 담기 */

export function useAddCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cartApi.add,
    onSuccess: () => {
      alert('장바구니에 담겼습니다.');
      qc.invalidateQueries({ queryKey: ['cart', 'list'] });
    },
    onError: async (e: any) => {
      const msg =
        (e?.response?.data?.message) ||
        (e?.message) ||
        '장바구니 담기 중 오류가 발생했습니다.';
      // 백엔드에서 재고 초과 시 409/CONFLICT 또는 '재고' 키워드 메시지 반환
      if (String(msg).includes('재고') || e?.response?.status === 409) {
        alert('재고 수량을 초과하여 담을 수 없습니다.');
      } else {
        alert(msg);
      }
    },
  });
}

/** 수량 변경 */
export function useUpdateCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCartReq) => cartApi.update(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

/** 항목 제거 */
export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number | { itemId?: number; cartItemId?: number }) =>
      cartApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
