// src/features/item/data/item.api.ts
import http from '@/shared/data/http';
import type { ItemDTO, PageRes, ItemListQuery } from './item.types';

/** BASE URL 정규화 */
function normalizeBase(base?: string) {
  if (!base) return '';
  return base.replace(/\/+$/, '');
}

/** 배열 안전 파싱 */
function toArray<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.content)) return input.content;
  if (Array.isArray(input?.dtoList)) return input.dtoList;
  if (Array.isArray(input?.list)) return input.list;
  if (Array.isArray(input?.items)) return input.items;
  return [];
}

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

export const itemApi = {
  /** 목록 조회 (백엔드 SearchAllItemsReq 규격) */
  async list(params: ItemListQuery & { excludeSoldOut?: boolean }): Promise<PageRes<ItemDTO>> {
    // ✅ 백 기준: GET /item (body: SearchAllItemsReq)
    // SearchAllItemsReq: itemCategory, keyword, page(0-base), size, orderByDate(ASC|DESC), orderByPrice(ASC|DESC)
    // 참고: 컨트롤러가 GET 이지만 JSON Body를 요구합니다. :contentReference[oaicite:2]{index=2}
    const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE as any);
    const url = new URL('/item', base || '');

    // 카테고리: 셀렉트에서는 ALL을 빼기로 했지만, 혹시 프론트 상단에서 'ALL'이 들어오면 undefined로 보내 전체 조회
    const rawCat = (params.category ?? '').toString().toUpperCase();
    const itemCategory = rawCat === 'ALL' || rawCat === '' ? undefined : rawCat;

    // 페이징(백엔드 0-base!)
    const page0 = Math.max(0, Number(params.page ? Number(params.page) - 1 : 0));
    const size = Math.max(1, Number(params.size ?? 12));

    // 정렬(백이 지원: 날짜/가격)
    const { key, dir } = parseSort(params.sort);
    const orderByDate = key === 'date' || !key ? (dir ?? 'desc').toUpperCase() : undefined;
    const orderByPrice = key === 'price' ? (dir ?? 'desc').toUpperCase() : undefined;

    // 품절 제외(백 enum: SELL / SOLD_OUT) → SELL만 보고 싶으면 body에 itemSellStatus: 'SELL'
    const itemSellStatus = params.excludeSoldOut ? 'SELL' : undefined;

    const body: Record<string, any> = {
      ...(itemCategory ? { itemCategory } : {}),
      ...(params.q ? { keyword: params.q } : {}),
      page: page0,
      size,
      ...(orderByDate ? { orderByDate } : {}),
      ...(orderByPrice ? { orderByPrice } : {}),
      ...(itemSellStatus ? { itemSellStatus } : {}),
    };

    // axios는 v1에서 GET data를 지원합니다. http는 axios instance이므로 request로 보냅니다.
    const r: any = await (http as any).request({
      url: url.toString(),
      method: 'GET',
      data: body,
    });

    const data = r?.data ?? r;           // axios/직접 fetch 모두 방어
    const payload = data?.result ?? data; // ApiResult.result 또는 바로 본문

    const dtoList = toArray<ItemDTO>(payload);
    const pageNum0 = Number(payload?.page ?? payload?.pageable?.pageNumber ?? page0);
    const sizeNum = Number(payload?.size ?? size);
    const totalElements = Number(payload?.totalElements ?? payload?.total ?? dtoList.length);
    const totalPages = Number(payload?.totalPages ?? Math.ceil((totalElements || 1) / (sizeNum || 1)));

    // 기존 프론트 타입(PageRes)에 맞춰 반환 (1-base page로 보정)
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

  /** 단건 조회 */
  async getOne(id: number): Promise<ItemDTO> {
    const base = normalizeBase(process.env.NEXT_PUBLIC_API_BASE as any);
    const url = new URL(`/item/${encodeURIComponent(String(id))}`, base || '');
    const r: any = await http.get(url.toString());
    const data = r?.data ?? r;
    return (data?.result ?? data) as ItemDTO;
  },
};
