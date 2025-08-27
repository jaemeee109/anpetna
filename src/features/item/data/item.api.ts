// features/item/data/item.api.ts
import { http } from '@/shared/data/http';
import type { ItemDTO, PageRes, ItemListQuery } from './item.types';

function normalizeBase(base?: string) {
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

export const itemApi = {
  async list(params: ItemListQuery): Promise<PageRes<ItemDTO>> {
    // 백엔드가 아직 쿼리 기반 검색/페이징이 준비 전일 수 있으므로
    // 1) 이상적: GET /items?category=..&q=..&page=..&size=..&sort=..
    // 2) 임시(백엔드 준비 전): GET /items → 배열 받고 프론트에서 페이징 (아래 폴백)
    const url = new URL('/items', normalizeBase((process as any).env.NEXT_PUBLIC_API_BASE));
    if (params.category) url.searchParams.set('category', params.category);
    if (params.q)        url.searchParams.set('q', params.q);
    url.searchParams.set('page', String(params.page ?? 1));
    url.searchParams.set('size', String(params.size ?? 12));
    if (params.sort)     url.searchParams.set('sort', params.sort);

    try {
      const r = await http.get(url.toString());
      const data = (r as any)?.data ?? r;
      // 백엔드에서 PageResponseDTO가 오면 그대로 반환
      if (data?.page !== undefined && data?.dtoList) return data as PageRes<ItemDTO>;
      // === 폴백: 배열만 왔다면 클라에서 임시 페이징 ===
      const arr: ItemDTO[] = Array.isArray(data) ? data : (data?.result ?? data ?? []);
      const page = Math.max(1, params.page ?? 1);
      const size = Math.max(1, params.size ?? 12);
      const total = arr.length;
      const startIdx = (page - 1) * size;
      const dtoList = arr.slice(startIdx, startIdx + size);
      const end = Math.ceil(page / 10) * 10;
      const last = Math.ceil(total / size);
      return {
        page, size, total,
        start: Math.max(1, end - 9),
        end: Math.min(end, last),
        prev: (end - 9) > 1,
        next: total > (Math.min(end, last) * size),
        dtoList,
      };
    } catch (e) {
      console.error(e);
      // 실패 시 빈 페이지
      return { page: 1, size: 12, total: 0, start: 1, end: 1, prev: false, next: false, dtoList: [] };
    }
  },

  async getOne(id: number): Promise<ItemDTO> {
    const url = new URL(`/items/${id}`, (process as any).env.NEXT_PUBLIC_API_BASE);
    const r = await http.get(url.toString());
    const data = (r as any)?.data ?? r;
    return (data?.result ?? data) as ItemDTO;
  },
};
