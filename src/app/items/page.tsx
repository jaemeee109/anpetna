// src/app/items/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useEffect } from 'react';
import { useItemList } from '@/features/item/hooks/useItems';
import type { ItemCategory, ItemListQuery } from '@/features/item/data/item.types';
import Paw from '@/components/icons/Paw'; // ✅ Paw 아이콘

// 카테고리 (백 enum 값 그대로)
const CATS = [
  { label: 'ALL', value: 'ALL' },
  { label: 'FEED', value: 'FEED' },
  { label: 'SNACKS', value: 'SNACKS' },
  { label: 'CLOTHING', value: 'CLOTHING' },
  { label: 'BATH', value: 'BATH_PRODUCT' },
  { label: 'BEAUTY', value: 'BEUTY_PRODUCT' }, // 백 enum 철자 그대로
  { label: 'TOY', value: 'TOY' },
  { label: 'OTHERS', value: 'OTHERS' },
] as const;

type CatValue = (typeof CATS)[number]['value'];

// 정렬 옵션 (ItemListQuery['sort'] 타입 고정)
const SORTS: ReadonlyArray<{ label: string; value: ItemListQuery['sort'] }> = [
  { label: '신상품순', value: 'date,desc' },
  { label: '등록일순', value: 'date,asc' },
  { label: '높은가격순', value: 'price,desc' },
  { label: '낮은가격순', value: 'price,asc' },
] as const;

// KRW 포맷
function formatPriceKRW(n?: number) {
  return new Intl.NumberFormat('ko-KR').format(n ?? 0) + '원';
}

// ADMIN 여부 (클라이언트 저장소/쿠키)
function isAdminClient(): boolean {
  try {
    const role =
      (
        (typeof window !== 'undefined' &&
          ((localStorage.getItem('memberRole') ||
            sessionStorage.getItem('memberRole')) ??
            (() => {
              try {
                const m = document.cookie.match(/(?:^|;\\s*)memberRole=([^;]+)/);
                return m ? decodeURIComponent(m[1]) : '';
              } catch { return ''; }
            })())) ||
        ''
      ).toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch { return false; }
}

// 레이아웃 래퍼
const WRAP = 'apn-main max-w-screen-xl mx-auto px-4';

/** 페이저 (첨부 page.tsx의 느낌 반영) */
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
      <button type="button" className={`${BTN} ${startPage === 1 ? DISABLED : ''}`} onClick={() => goto(1)} disabled={startPage === 1}>처음</button>
      <button type="button" className={`${BTN} ${startPage === 1 ? DISABLED : ''}`} onClick={() => goto(startPage - 1)} disabled={startPage === 1}>이전</button>
      <div className={`flex ${NUM_GAP} ${NUM_SIDE_MARGIN}`}>
        {pages.map((p) =>
          p === cur ? (
            <span key={p} className={ACTIVE_NUM} aria-current="page">{p}</span>
          ) : (
            <span key={p} onClick={() => goto(p)} className="cursor-pointer text-gray-600 hover:text-black">{p}</span>
          )
        )}
      </div>
      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(endPage + 1)} disabled={endPage === totalPages}>다음</button>
      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(totalPages)} disabled={endPage === totalPages}>마지막</button>
    </nav>
  );
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

  const query = useMemo<ItemListQuery>(() => ({
    category: cat as ItemCategory, q: q.trim() || undefined, sort, page, size,
  }), [cat, q, sort, page, size]);
  const { data, isLoading, isError } = useItemList(query);

  const items = useMemo(() => data?.dtoList ?? [], [data]);

  const totalPages =
    Number((data as any)?.totalPages) ||
    Number((data as any)?.total) ||
    Number((data as any)?.page?.totalPages) ||
    Number((data as any)?.result?.totalPages) ||
    1;

  const onSearch = () => { setPage(1); setQ(keyword.trim()); };

  return (
    <main className={WRAP}>
      <div className="store-head text-center">
        <h1 className="store-title"><span className="ml-1"></span></h1>
      </div>

      {/* 카테고리 탭 */}
      <div className="store-catbar flex gap-[5px] justify-center">
        {CATS.map((c) => (
          <button
            key={c.value}
            onClick={() => { setCat(c.value); setPage(1); }}
            className={`pill ${cat === c.value ? 'pill--active' : ''}`}
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
          <button
            className="store-ico-search"
            onClick={onSearch}
            aria-label="검색"
            type="button"
            /* 👉 여기서 이 페이지에서만 색 바꾸고 싶다면: style={{ color: '#FF6F61' }} 처럼 주면 됨 */
            // style={{ color: '#FF6F61' }}
          >
            <Paw className="store-ico" />
          </button>
        </div>
      </div>

      <div className="store-sep" />

      {/* 정렬 — 오른쪽 정렬 */}
      <div className="store-sortbar flex justify-end">
        <select
          className="dropdown"
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
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">상품이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((it: any) => {
            const id = it.itemId ?? it.id;
            const title = it.itemName ?? it.title ?? it.name ?? `상품#${id}`;
            const img =
              it.thumbnailUrl ?? it.imageUrl ?? it.thumbnail ??
              (Array.isArray(it.images) && it.images[0]?.url) ?? '';
            const price = Number(it.itemPrice ?? it.price ?? it.salePrice ?? it.amount ?? 0);

            return (
              <Link key={id} href={`/items/${encodeURIComponent(String(id))}`} className="block group" prefetch={false}>
                <div className="w-full aspect-[4/3] overflow-hidden rounded bg-gray-100">
                  {img ? (
                    <Image src={img} alt={title} width={800} height={600} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                </div>
                <div className="mt-2 truncate">{title}</div>
                <div className="text-sm text-gray-800">{formatPriceKRW(price)}</div>
              </Link>
            );
          })}
        </div>
      )}
      <br></br>

      <div className="store-sep" />

      {/* 가운데 페이징 + 오른쪽 등록 버튼 */}
      <div className="store-bottom-row grid grid-cols-[1fr_auto_1fr] items-center" style={{ marginBottom: 24 }}>
        <div />
        <Pager current={page} totalPages={Math.max(1, Number(totalPages) || 1)} onPage={(p) => setPage(p)} />
        <div className="flex justify-end">
          {isAdmin && (<Link href="/items/new" className="btn-3d btn-primary" prefetch={false}>등록</Link>)}
        </div>
      </div>

      {/* 페이지 한정 스타일 */}
    <style jsx>{`
  /* 카테고리 탭: 기본 흰 배경 + 회색 테두리, 활성 진한 회색 + 흰 글자 */
  .store-catbar .pill {
    border-radius: 9999px;
    background: #ffffff;         /* 기본 흰색 */
    border: 1px solid #d1d5db;   /* 회색 테두리 */
    color: #111;
    height: 30px;
    line-height: 30px;
    padding: 0 14px;
    font-weight: 500;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .store-catbar .pill:hover { background: #f3f4f6; }
  .store-catbar .pill.pill--active {
    background: #555555;         /* 진한 회색 */
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

  /* 분리선 */
  .store-sep {
    border-top: 1px solid #e5e7eb;
    margin: 16px 0;
  }

  /* 검색 입력 + 버튼 래퍼 */
  .store-search {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: none;         /* 래퍼 테두리 제거 */
    background: transparent;
  }

  /* 입력창 */
  .store-input {
    height: 30px;
    width: 220px;
    padding: 0 12px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    outline: none;

    /*  placeholder일 때는 가운데 정렬 */
    text-align: center;
  }
  /*  placeholder 텍스트도 확실히 가운데 정렬 */
  .store-input::placeholder {
    text-align: center;
  }
  /*  값이 입력되면 자동으로 왼쪽 정렬로 전환 */
  .store-input:not(:placeholder-shown) {
    text-align: left;
  }

  /* 아이콘 버튼: 내부에 Paw 아이콘을 중앙 정렬 */
  .store-ico-search {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 31px;
    height: 31px;
    border-radius: 40%;
    border: 1px solid #e5e7eb;
    background: #fff;
    cursor: pointer;
    color: #6e6e6eff; /* Paw 색상은 여기서 조절 (이 페이지 한정) */
  }
  .store-ico {
    width: 16px;
    height: 16px;
    display: block;
  }
  /* Paw 내부 요소가 버튼 color를 따르도록 (이 페이지 한정) */
  .store-ico :global(*) {
    fill: currentColor;
    stroke: currentColor;
  }
`}</style>

    </main>
  );
}
