// src/features/item/data/item.api.ts
import { http } from '@/shared/data/http';
import type { ItemDTO, PageRes, ItemListQuery } from './item.types';

/** BASE URL 정리: 끝 슬래시 제거 */
function normalizeBase(base?: string) {
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

/** 어떤 응답이 와도 "배열"만 뽑아내기 위한 폴백 유틸 */
function toArray<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.content)) return input.content;
  if (Array.isArray(input?.dtoList)) return input.dtoList;
  if (Array.isArray(input?.list)) return input.list;
  if (Array.isArray(input?.items)) return input.items;
  return [];
}

export const itemApi = {
  /** 목록 조회 (백엔드 페이지 응답/배열 응답 모두 대응) */
  async list(params: ItemListQuery): Promise<PageRes<ItemDTO>> {
    // 이상적: GET /items?category=..&q=..&page=..&size=..&sort=..
    const base = normalizeBase((process as any).env.NEXT_PUBLIC_API_BASE);
    const url = new URL('/items', base || ''); // base가 비면 상대경로로 http 설정의 baseURL 사용

    if (params.category) url.searchParams.set('category', params.category);
    if (params.q)        url.searchParams.set('q', params.q);
    url.searchParams.set('page', String(params.page ?? 1));
    url.searchParams.set('size', String(params.size ?? 12));
    if (params.sort)     url.searchParams.set('sort', params.sort);

    try {
      const r = await http.get(url.toString());
      const data = (r as any)?.data ?? r;
      const payload = data?.result ?? data;

      // 1) 백엔드가 PageResponse 형태로 주는 경우(권장)
      //    { page, size, total, start, end, prev, next, dtoList }
      if (
        payload &&
        typeof payload === 'object' &&
        'page' in payload &&
        'dtoList' in payload &&
        Array.isArray(payload.dtoList)
      ) {
        return payload as PageRes<ItemDTO>;
      }

      // 2) 백엔드가 배열만 주는 경우(임시 폴백): 프론트에서 페이지 계산
      const arr: ItemDTO[] = toArray<ItemDTO>(payload);
      const page = Math.max(1, params.page ?? 1);
      const size = Math.max(1, params.size ?? 12);
      const total = arr.length;

      const startIdx = (page - 1) * size;
      const dtoList = arr.slice(startIdx, startIdx + size);

      const end = Math.ceil(page / 10) * 10;
      const last = Math.max(1, Math.ceil(total / size));

      return {
        page,
        size,
        total,
        start: Math.max(1, end - 9),
        end: Math.min(end, last),
        prev: (end - 9) > 1,
        next: total > (Math.min(end, last) * size),
        dtoList,
      };
    } catch (e) {
      console.error('[itemApi.list] failed:', e);
      // 실패 시 빈 페이지 반환(프론트 깨짐 방지)
      return { page: 1, size: 12, total: 0, start: 1, end: 1, prev: false, next: false, dtoList: [] };
    }
  },

  /** 단건 조회 */
  async getOne(id: number): Promise<ItemDTO> {
    const base = normalizeBase((process as any).env.NEXT_PUBLIC_API_BASE);
    const url = new URL(`/items/${id}`, base || '');
    const r = await http.get(url.toString());
    const data = (r as any)?.data ?? r;
    const payload = data?.result ?? data;
    return payload as ItemDTO;
  },
};
