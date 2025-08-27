// features/item/hooks/useItems.ts
import { useQuery } from '@tanstack/react-query';
import { itemApi } from '../data/item.api';
import type { ItemListQuery, PageRes, ItemDTO } from '../data/item.types';

export const useItemList = (q: ItemListQuery) =>
  useQuery<PageRes<ItemDTO>>({
    queryKey: ['items', q],
    queryFn: () => itemApi.list(q),
    staleTime: 30_000,
  });
