// src/features/item/hooks/useItems.ts
import { useQuery } from '@tanstack/react-query';
import { itemApi } from '../data/item.api';
import type { ItemListQuery, PageRes, ItemDTO } from '../data/item.types';

/**
 * 서버 Pageable은 0-based.
 * queryKey에 page/size/sort/category/q를 모두 포함하여
 * 페이지 전환 시 캐시 재사용을 방지합니다.
 */
export const useItemList = (params: ItemListQuery) =>
  useQuery<PageRes<ItemDTO>>({
    queryKey: [
      'items',
      params.category ?? 'ALL',
      params.q ?? '',
      params.sort ?? 'date,desc',
      params.page ?? 1,
      params.size ?? 12,
      params.excludeSoldOut ?? false,
    ],
    queryFn: () => itemApi.list(params),
    // ✅ v5에서는 keepPreviousData 대신 placeholderData 사용
    placeholderData: (prev) => prev,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });
