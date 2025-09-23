// features/item/hooks/useItems.ts
import { useQuery } from '@tanstack/react-query';
import { itemApi } from '../data/item.api';
import type { ItemListQuery, PageRes, ItemDTO } from '../data/item.types';

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
    // v5: keepPreviousData 제거 → placeholderData로 UX 유지(선택)
    placeholderData: (prev) => prev,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 30_000,
  });
