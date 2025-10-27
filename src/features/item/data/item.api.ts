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
function parseSort(sort?: ItemListQuery['sort']) {
  if (!sort) return { orderByDate: undefined, orderByPrice: undefined, orderBySales: undefined };
  const [key, dir] = String(sort).split(',');
  const d = (dir ?? 'desc').toUpperCase();
  return {
    orderByDate:  key === 'date'  ? d : undefined,
    orderByPrice: key === 'price' ? d : undefined,
    orderBySales: key === 'sales' ? d : undefined, // ✅ 추가
  };
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
  // 베이스 URL (기존 normalizeBase 사용)
  const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE as any);
  // window.origin 대체 (개발 3000→8000 스와프까지 고려하고 싶으면 필요에 맞게 조정)
  const origin =
    base ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // URL에 직접 쿼리스트링 작성 (axios params 사용하지 않음)
  const url = new URL('item', origin+'/');

  // 카테고리: 'ALL'/빈값이면 미전달 → 전체 조회
  const rawCat = (params.category ?? '').toString().toUpperCase();
  if (rawCat && rawCat !== 'ALL') {
    url.searchParams.set('itemCategory', rawCat);
  }

  // 검색어
  const q = (params.q ?? '').toString().trim();
  if (q) url.searchParams.set('keyword', q);

  // 정렬 파싱 (기존 로직 준수)
  const [k, d] = String(params.sort ?? '').split(',').map(s => s.trim().toLowerCase());
  const key = (k === 'date' || k === 'price' || k === 'sales') ? k : undefined;
  const dir = (d === 'asc' || d === 'desc') ? d : undefined;
  const orderByDate  = key === 'date'  || !key ? (dir ?? 'desc').toUpperCase() : undefined;
  const orderByPrice = key === 'price' ? (dir ?? 'desc').toUpperCase() : undefined;
  const orderBySales = key === 'sales' ? (dir ?? 'desc').toUpperCase() : undefined;

  if (orderByDate)  url.searchParams.set('orderByDate',  orderByDate);
  if (orderByPrice) url.searchParams.set('orderByPrice', orderByPrice);
  if (orderBySales) url.searchParams.set('orderBySales', orderBySales);


const page0 = Math.max(0, Number(params.page ?? 0));
const size  = Math.max(1, Number(params.size ?? 12));
url.searchParams.set('page', String(page0));
url.searchParams.set('size', String(size));


  // 품절 제외 옵션(선택)
  if (params.excludeSoldOut) {
    url.searchParams.set('itemSellStatus', 'SELL');
  }

  // 실제 호출 (params 쓰지 않고, 쿼리스트링 포함된 URL만 사용)
  const r: any = await (http as any).get(url.toString());
  const data = r?.data ?? r;
  const payload = data?.result ?? data;

  // 리스트 추출 (기존 toArray 유틸 존중)
  const dtoList = toArray<ItemDTO>(payload);

  // 페이지 정보 표준화
  const pageNum0 = Number(payload?.page ?? payload?.pageable?.pageNumber ?? page0);
  const sizeNum = Number(payload?.size ?? payload?.pageable?.pageSize ?? size);
  const totalElements = Number(payload?.totalElements ?? payload?.total ?? 0);
  const totalPages = Number(payload?.totalPages ?? (totalElements ? Math.ceil((totalElements || 1) / (sizeNum || 1)) : 1));

  // 1-base
  const page1 = pageNum0 + 1;

  
return {
  page: page1,               
  size: sizeNum,
  total: totalElements,       
  start: 1,
  end: totalPages,
  prev: page1 > 1,
  next: page1 < totalPages,


  totalPages,
  totalElements,

  dtoList,
} as any;

}

};

