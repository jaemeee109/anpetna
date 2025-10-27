// src/app/items/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { useItemList } from '@/features/item/hooks/useItems';
import type { ItemCategory, ItemListQuery } from '@/features/item/data/item.types';
import Paw from '@/components/icons/Paw';

/** 카테고리(백엔드 enum 그대로) */
const CATS = [
  { label: 'ALL', value: 'ALL' },
  { label: 'FEED', value: 'FEED' },
  { label: 'SNACKS', value: 'SNACKS' },
  { label: 'CLOTHING', value: 'CLOTHING' },
  { label: 'BATH', value: 'BATH_PRODUCT' },
  { label: 'BEAUTY', value: 'BEUTY_PRODUCT' }, // 백엔드 철자 그대로
  { label: 'TOY', value: 'TOY' },
  { label: 'OTHERS', value: 'OTHERS' },
] as const;

type CatValue = (typeof CATS)[number]['value'];

/** 정렬 옵션(ItemListQuery['sort']) */
const SORTS: ReadonlyArray<{ label: string; value: ItemListQuery['sort'] }> = [
  { label: '신상품순', value: 'date,desc' },
  { label: '등록일순', value: 'date,asc' },
  { label: '높은가격순', value: 'price,desc' },
  { label: '낮은가격순', value: 'price,asc' },
  { label: '판매높은순', value: 'sales,desc' },
  { label: '판매낮은순', value: 'sales,asc' },

  
] as const;

/** KRW 포맷 */
function formatPriceKRW(n?: number) {
  return new Intl.NumberFormat('ko-KR').format(n ?? 0) + '원';
}

/** 관리자 여부(로컬 저장소/쿠키) */
function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
         sessionStorage.getItem('memberRole') ??
         (() => {
           try {
             const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
             return m ? decodeURIComponent(m[1]) : '';
           } catch { return ''; }
         })())) || '';
    const role = raw.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch {
    return false;
  }
}

/** 레이아웃 래퍼 */
const WRAP = 'apn-main mx-auto px-4 max-w-[1220px]';

/** Pager(디자인 클래스 유지) */
/** Pager(디자인 클래스 유지) */
function Pager({
  current, totalPages, onPage,
}: { current: number; totalPages: number; onPage: (p: number) => void; }) {
  const cur = Math.min(Math.max(1, current || 1), Math.max(1, totalPages));
  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), Math.max(1, totalPages));
    if (page !== cur) onPage(page);
  };

  const groupSize = 5;
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, Math.max(1, totalPages));

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const BTN = 'btn-3d btn-white px-3 py-1 text-xs no-underline';
  const DISABLED = 'opacity-60 cursor-not-allowed';
  const ACTIVE_NUM = 'font-bold text-black';
  const WRAP_GAP = 'gap-[6px]';
  const NUM_GAP = 'gap-[6px]';
  const NUM_SIDE_MARGIN = 'mx-[10px]';

  return (
    <nav className={`flex items-center justify-center ${WRAP_GAP}`}>
      {/* 처음/이전: 현재 페이지 기준으로 비활성 제어 */}
      <button
        type="button"
        className={`${BTN} ${cur === 1 ? DISABLED : ''}`}
        onClick={() => goto(1)}
        disabled={cur === 1}
      >
        처음
      </button>
      <button
        type="button"
        className={`${BTN} ${cur === 1 ? DISABLED : ''}`}
        onClick={() => goto(cur - 1)}
        disabled={cur === 1}
      >
        이전
      </button>

      <div className={`flex ${NUM_GAP} ${NUM_SIDE_MARGIN}`}>
        {pages.map((p) =>
          p === cur ? (
            <span key={p} className={ACTIVE_NUM} aria-current="page">{p}</span>
          ) : (
            <span key={p} onClick={() => goto(p)} className="cursor-pointer text-gray-600 hover:text-black">{p}</span>
          )
        )}
      </div>

      {/* 다음/마지막: 현재 페이지 기준으로 비활성 제어 */}
      <button
        type="button"
        className={`${BTN} ${cur === totalPages ? DISABLED : ''}`}
        onClick={() => goto(cur + 1)}
        disabled={cur === totalPages}
      >
        다음
      </button>
      <button
        type="button"
        className={`${BTN} ${cur === totalPages ? DISABLED : ''}`}
        onClick={() => goto(totalPages)}
        disabled={cur === totalPages}
      >
        마지막
      </button>
    </nav>
  );
}


/** 이미지 절대경로 베이스 계산 */
function resolveImgBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    '';
  if (envBase) return envBase.replace(/\/+$/, '');

  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const guessPort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${guessPort ? `:${guessPort}` : ''}`.replace(/\/+$/, '');
}

export default function ItemsPage() {
  const [cat, setCat] = useState<CatValue>('ALL');
  const [sort, setSort] = useState<ItemListQuery['sort']>('date,desc');
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const size = 12;

  const [keyword, setKeyword] = useState('');
  useEffect(() => setKeyword(q), [q]);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => setIsAdmin(isAdminClient()), []);

  /** 검색어가 있으면 카테고리 파라미터 전송 안 함(전체 검색) */
const query = useMemo<ItemListQuery>(() => {
  const qTrim = q.trim();
  // ✅ 서버(Pageable)는 0-based이므로, UI의 1-based page를 0-based로 변환해서 전송
  const backendPage = Math.max(0, (page ?? 1) - 1);

  return {
    category: cat === 'ALL' ? undefined : (cat as ItemCategory),
    q: qTrim || undefined,
    sort,
    page: backendPage, // ← 여기만 바뀜
    size,
  };
}, [cat, q, sort, page, size]);


  const { data, isLoading, isError } = useItemList(query);

  // 원본 목록
  const items = useMemo(() => data?.dtoList ?? [], [data]);

  /** 품절 상품을 항상 뒤로(안정 정렬) */
  const itemsSorted = useMemo(() => {
    const withIdx = (items as any[]).map((it, idx) => {
      const status =
        (it.itemSellStatus ?? it.sellStatus ?? it.status ?? '').toString().toUpperCase();
      const soldOut = status === 'SOLD_OUT';
      return { it, idx, soldOut };
    });
    withIdx.sort((a, b) => {
      if (a.soldOut === b.soldOut) return a.idx - b.idx;
      return a.soldOut ? 1 : -1;
    });
    return withIdx.map(x => x.it);
  }, [items]);

// 페이지 수 (TS 안전 + NaN 방지)
const totalElements = Number(
  (data as any)?.total ??
  (data as any)?.totalElements ??
  0
);

const pagesFromTotals = Math.ceil(totalElements / Math.max(1, size));

const rawTotalPages =
  (data as any)?.totalPages ??
  (data as any)?.page?.totalPages ??
  pagesFromTotals;

const tpNum = Number(rawTotalPages);
const totalPages = Number.isFinite(tpNum) && tpNum > 0 ? tpNum : 1;




  // 검색 실행
  const onSearch = () => { setPage(1); setQ(keyword.trim()); };

  const IMG_BASE = resolveImgBase();

  return (
    <main className={WRAP} style={{ paddingBottom: 50 }}>
      <div className="store-head text-center">
        <h1 className="store-title"><span className="ml-1"></span></h1>
      </div>

      {/* 카테고리 탭 */}
      <div className="store-catbar flex gap-[10px] justify-center">
        {CATS.map((c) => (
<button
  key={c.value}
  onClick={() => {
    setCat(c.value);
    setPage(1);
  }}
  className={`pill ${cat === c.value ? 'pill--active' : ''}`}
  type="button"
>
  {c.label}
</button>

))}

      </div>

      {/* 옵션/검색 줄 */}
      <div className="store-actions flex items-center justify-center gap-2 mt-[25px]">
        <div className="store-search">
          <input
            className="store-input"
            placeholder="검색으로 원하는 상품을 찾아보세요"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            aria-label="검색어"
          />
          <button className="store-ico-search" onClick={onSearch} aria-label="검색" type="button">
            <Paw className="store-ico" />
          </button>
        </div>
      </div>

      <div className="store-sep" />

      {/* 정렬 */}
      <div className="store-sortbar flex justify-end mt-[20px] mb-[20px] mr-[20px]">
        <select
          className="dropdown sort-select"
          value={sort}
          onChange={(e) => { setSort(e.target.value as ItemListQuery['sort']); setPage(1); }}
          aria-label="정렬 옵션"
        >
          {SORTS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </div>

      {/* 리스트 */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">로딩중…</div>
      ) : isError ? (
        <div className="text-center py-12 text-gray-500">상품 로딩 오류가 발생했습니다.</div>
      ) : itemsSorted.length === 0 ? (
        <div className="text-center py-12 text-gray-500">상품이 없습니다.</div>
      ) : (
        <div
          className="items-grid grid gap-[16px] justify-center"
          style={{ gridTemplateColumns: 'repeat(4, 260px)' }}
        >
          {itemsSorted.map((it: any) => {
            const id = it.itemId ?? it.id;
            const title = it.itemName ?? it.title ?? it.name ?? `상품#${id}`;

            // 상태값(SOLD_OUT 여부)
            const sellStatus = String(
              (it.itemSellStatus ?? it.sellStatus ?? it.status ?? '')
            ).toUpperCase();
            const isSoldOut = sellStatus === 'SOLD_OUT';

            // 1) 백이 준 원본 이미지 경로 추출
            const imgRaw =
              it.thumbnailUrl ??
              it.imageUrl ??
              it.thumbnail ??
              (Array.isArray(it.images) && it.images[0]?.url) ??
              '';

            // 2) 상대경로(/files/...)면 절대경로로 변환
            const img =
              imgRaw && !/^https?:\/\//i.test(imgRaw)
                ? new URL(imgRaw.replace(/^\/+/, ''), IMG_BASE+'/').toString()
                : imgRaw;

            const price = Number(it.itemPrice ?? it.price ?? it.salePrice ?? it.amount ?? 0);

            // ✅ 여기서 SOLD OUT/제목/가격 간 여백만 조건부로 조정
            const titleMarginClass = isSoldOut ? 'mt-[8px]' : 'mt-[16px]';
            const priceMarginClass = isSoldOut ? 'mt-[6px]' : '';

            return (
              <Link
                key={id}
                href={`/items/${id}`}
                className="block group no-underline apn-link-reset"
                prefetch={false}
                style={{ color: '#000', textDecoration: 'none' }}
              >
                <div className="w-full overflow-hidden rounded-xl bg-white shadow-sm">
                  {/* 고정 높이 썸네일 래퍼: SOLD_OUT이면 회색 필터 */}
                  <div
                    className="relative w-[260px] h-[340px] overflow-hidden"
                    style={{ filter: isSoldOut ? 'grayscale(100%)' : undefined }}
                  >
                    {img ? (
                      <Image src={img} alt={title} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* SOLD OUT 배지 (여백: mt-[8px]) */}
                  {isSoldOut && (
                    <div className="mt-[10px] text-center !text-black"><b>SOLD OUT</b></div>
                  )}

                  <div className={`truncate text-center !text-black ${titleMarginClass}`}>{title}</div>
                  <div className={`text-sm text-center !text-black ${priceMarginClass}`}>{formatPriceKRW(price)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <br />

      <div className="store-sep" />

      {/* 가운데 페이징 + 오른쪽 등록 버튼 */}
      <div className="store-bottom-row grid grid-cols-[1fr_auto_1fr] items-center" style={{ marginBottom: 24 }}>
        <div />
        <Pager current={page} totalPages={Math.max(1, Number(totalPages) || 1)} onPage={(p) => setPage(p)} />
        <div className="flex justify-end">
          {isAdmin && (<Link href="/items/new" className="btn-3d btn-primary" prefetch={false}>등록</Link>)}
        </div>
      </div>

      {/* 페이지 한정 스타일(디자인 클래스 유지) */}
      <style jsx>{`
        .store-catbar .pill {
          border-radius: 9999px;
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #111;
          height: 38px;
          line-height: 30px;
          padding: 0 14px;
          font-weight: 500;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }

        .store-catbar .pill:hover { background: #f3f4f6; }
        .store-catbar .pill.pill--active {
          background: #555555;
          color: #ffffff;
          border-color: #555555;
        }
        .store-catbar .pill:focus,
        .store-catbar .pill:focus-visible,
        .store-catbar .pill:active,
        .store-catbar button:focus,
        .store-catbar button:focus-visible {
          outline: none;
          box-shadow: none !important;
        }
        .store-sep { border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .store-search { display: inline-flex; align-items: center; gap: 8px; border: none; background: transparent; }
        .store-input {
          height: 40px; width: 250px; padding: 0 12px;
          border: 1px solid #e5e7eb; border-radius: 10px; outline: none;
          text-align: center;
        }
        .store-input::placeholder { text-align: center; }
        .store-input:not(:placeholder-shown) { text-align: left; }
        .store-ico-search {
          display: inline-flex; align-items: center; justify-content: center;
          width: 35px; height: 35px; border-radius: 40%;
          border: 1px solid #e5e7eb; background: #fff; cursor: pointer; color: #6e6e6eff;
        }
        .store-ico { width: 16px; height: 16px; display: block; }
        .store-ico :global(*) { fill: currentColor; stroke: currentColor; }

        /* 이 페이지(상품 리스트) 영역의 모든 링크를 전역으로 검정 고정 */
        :global(.items-grid a),
        :global(.items-grid a:visited),
        :global(.items-grid a:hover),
        :global(.items-grid a:active),
        :global(.items-grid a:focus) {
          color: #000 !important;
          text-decoration: none !important;
        }

        /* 정렬 옵션 셀렉트 크기 고정 (이 페이지 한정) */
        .store-sortbar .sort-select {
          width: 120px !important;
          height: 35px !important;
          font-size: 14px !important;
          font-color: #7a7979ff !important;
          padding: 0 8px !important;
          line-height: 28px;
          border-color: #bbb8b8ff;
          border-radius: 15px !important;
        }
      `}</style>
    </main>
  );
}
