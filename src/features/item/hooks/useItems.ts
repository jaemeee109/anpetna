// features/item/hooks/useItems.ts
import { useQuery } from '@tanstack/react-query';
import { itemApi } from '../data/item.api';
import type { ItemListQuery, PageRes, ItemDTO } from '../data/item.types';

export const useItemList = (q: ItemListQuery) =>
  useQuery<PageRes<ItemDTO>>({
    queryKey: ['items', q],
    queryFn: () => itemApi.list(q),

       /**
     * 삭제 후 목록으로 돌아올 때, 이전 캐시가 '신선'하더라도 항상 서버 재조회.
     * - refetchOnMount: 'always'  → 마운트마다 refetch
     * - refetchOnWindowFocus: true → 탭 전환/포커스 시에도 최신화
     * - refetchOnReconnect: true  → 네트워크 복구 시에도 최신화
     *
     * staleTime은 유지해도 되지만, 캐시 신선 여부와 무관하게 항상 refetch하도록 설정.
     */
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  
