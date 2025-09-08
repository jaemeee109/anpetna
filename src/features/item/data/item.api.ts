// src/features/item/data/item.api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ItemDTO, PageRes, ItemListQuery } from './item.types';
import http from '@/shared/data/http';


/** BASE URL 정규화 */
function normalizeBase(base?: string) {
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

/** 배열 추출 유틸 */
function toArray<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.content)) return input.content;
  if (Array.isArray(input?.dtoList)) return input.dtoList;
  if (Array.isArray(input?.list)) return input.list;
  if (Array.isArray(input?.items)) return input.items;
  return [];
}

/** 토큰 → Authorization 헤더(게스트면 빈 객체) */
function getAccessToken(): string {
  try {
    return (
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      ''
    );
  } catch {
    return '';
  }
}
function authHeaders(): HeadersInit {
  const t = getAccessToken();
  if (!t) return {};
  return { Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}` };
}

/** 정렬 문자열 파싱: "date,desc" | "price,asc" */
type SortKey = 'date' | 'price' | 'sales';
type SortDir = 'asc' | 'desc';
function parseSort(sort?: string): { key?: SortKey; dir?: SortDir } {
  if (!sort) return {};
  const [k, d] = String(sort).split(',').map(s => s.trim().toLowerCase());
  const key: SortKey | undefined =
    k === 'date' ? 'date' :
    k === 'price' ? 'price' :
    k === 'sales' ? 'sales' : undefined;
  const dir: SortDir | undefined = d === 'asc' || d === 'desc' ? d : undefined;
  return { key, dir };
}

/* ===== 실제 API ===== */
export const itemApi = {
  /**
   * 목록 조회
   * 백엔드 SearchAllItemsReq 스펙에 맞춰 **GET /item** 으로 쿼리스트링 전달
   * - itemCategory: 카테고리 (ALL/빈값이면 미전달)
   * - keyword: 검색어(옵션)
   * - page: 0-base (기본 0)
   * - size: 페이지 크기 (기본 12)
   * - orderByDate: 'ASC' | 'DESC'
   * - orderByPrice: 'ASC' | 'DESC'
   */
  async list(params: ItemListQuery & { excludeSoldOut?: boolean }): Promise<PageRes<ItemDTO>> {
  const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE as any);
  const url = new URL('/item', base || '');

  // 카테고리: 'ALL' 또는 빈값이면 전달하지 않음(=전체)
  const rawCat = (params.category ?? '').toString().toUpperCase();
  const itemCategory = rawCat === 'ALL' || rawCat === '' ? undefined : rawCat;

  // 페이지: UI가 1-base일 가능성 → 서버는 0-base
  const page0 = Math.max(0, Number(params.page ?? 1) - 1);
  const size = Math.max(1, Number(params.size ?? 12));

  // 정렬 파라미터
  const { key, dir } = (function parseSort(sort?: string) {
    if (!sort) return {};
    const [k, d] = String(sort).split(',').map(s => s.trim().toLowerCase());
    const dir = d === 'asc' || d === 'desc' ? d : undefined;
    return { key: (k === 'date' || k === 'price' || k === 'sales') ? (k as 'date'|'price'|'sales') : undefined, dir: dir as 'asc'|'desc'|undefined };
  })(params.sort);

  const orderByDate  = key === 'date'  || !key ? (dir ?? 'desc').toUpperCase() : undefined;
  const orderByPrice = key === 'price' ? (dir ?? 'desc').toUpperCase() : undefined;

  // 품절 제외 옵션(백엔드가 itemSellStatus를 받는다면 사용)
  const itemSellStatus = params.excludeSoldOut ? 'SELL' : undefined;

  // ✅ GET + params 로 전달 (절대 body 사용 X)
  const r: any = await (http as any).get(url.toString(), { 
    params: {
      ...(itemCategory ? { itemCategory } : {}),
      ...(params.q ? { keyword: String(params.q) } : {}),
      page: page0,
      size,
      ...(orderByDate ? { orderByDate } : {}),
      ...(orderByPrice ? { orderByPrice } : {}),
      ...(itemSellStatus ? { itemSellStatus } : {}),
    },
  });

  const data = r?.data ?? r;
  const payload = data?.result ?? data;

  const dtoList = toArray<ItemDTO>(payload);
  const pageNum0 = Number(payload?.page ?? payload?.pageable?.pageNumber ?? page0);
  const sizeNum = Number(payload?.size ?? size);
  const totalElements = Number(payload?.totalElements ?? payload?.total ?? dtoList.length);
  const totalPages = Number(payload?.totalPages ?? Math.ceil((totalElements || 1) / (sizeNum || 1)));

  // 1-base로 맞춰 반환
  const page1 = pageNum0 + 1;

  return {
    page: page1,
    size: sizeNum,
    total: totalPages,
    start: 1,
    end: totalPages,
    prev: page1 > 1,
    next: page1 < totalPages,
    dtoList,
  } as PageRes<ItemDTO>;
},

};
