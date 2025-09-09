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
    mutationFn: (body: AddCartReq) => cartApi.add(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      alert('장바구니에 담겼습니다.');
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
