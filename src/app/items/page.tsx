// app/items/page.tsx
'use client';
import PawIcon from '@/components/icons/Paw';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useItemList } from '@/features/item/hooks/useItems';
import type { ItemCategory } from '@/features/item/data/item.types';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';

const VIEW_CATS = ['FEED','SNACKS','CLOTHING','BATH','BEUTY','TOY','OTHERS'] as const;
type ViewCat = (typeof VIEW_CATS)[number];

// === board page.tsx의 Pager 스타일을 동일하게 복제 ===
function Pager({
  current,
  total,
  size,
  onPage,
}: {
  current: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / Math.max(1, size)));
  const cur = Math.min(Math.max(1, current || 1), totalPages);
  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), totalPages);
    if (page !== cur) onPage(page);
  };

  const groupSize = 5;
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, totalPages);

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
            <span key={p} onClick={() => goto(p)} className="cursor-pointer text-gray-600 hover:text-black">
              {p}
            </span>
          )
        )}
      </div>

      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(endPage + 1)} disabled={endPage === totalPages}>다음</button>
      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(totalPages)} disabled={endPage === totalPages}>마지막</button>
    </nav>
  );
}

// 화면 라벨 → 백엔드 enum 매핑
function toEnumCat(v: ViewCat): ItemCategory {
  switch (v) {
    case 'BATH':  return 'BATH_PRODUCT';
    case 'BEUTY': return 'BEUTY_PRODUCT';
    default:      return v as ItemCategory;
  }
}

// 가격 포맷
const won = new Intl.NumberFormat('ko-KR');
function pickThumbUrl(images?: { url: string; sortOrder?: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const byOrder = [...images].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  return byOrder[0]?.url || null;
}

export default function ItemsPage() {
  const [cat, setCat] = useState<ViewCat>('FEED');
  const [page, setPage] = useState(1);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  const size = 12; // 1줄 4칸
  const enumCat = toEnumCat(cat);
  const { data, isLoading, error } = useItemList({ category: enumCat, q, page, size });

  // 최신 등록순: 좌→우
  const items = useMemo(() => {
    const list = data?.dtoList ?? [];
    return [...list].sort((a, b) => (b.itemId ?? 0) - (a.itemId ?? 0));
  }, [data]);

  return (
    <main className={WRAP}>
      {/* === FAQ와 동일한 헤더 구조/클래스 === */}
      <section className="faq-head text-center mt-0">
        {/* 발바닥은 FAQ처럼 CSS가 붙는 제목 마크업만 사용 (동일 코드) */}
      <h1 className="faq-title inline-flex items-center gap-1 justify-center !mb-0" style={{ marginBottom: 0 }}></h1>

        {/* 카테고리 탭: FAQ와 동일 클래스 구조 */}
        <div className="faq-catbar flex flex-col items-center gap-5 " style={{ marginTop: 0 }} role="tablist" aria-label="Store categories">
          <div className="flex flex-wrap justify-center gap-4">
            {(['FEED','SNACKS','CLOTHING','BATH','BEUTY','TOY','OTHERS'] as ViewCat[]).map((c) => (
              <button
                key={c}
                type="button"
                style={{
                marginLeft: 10,
                width: 110,
                height:50,
                fontSize: 15
                }}
                className={`faq-cat ${c === cat ? 'is-active' : ''}`}
                aria-pressed={c === cat}
                onClick={() => { setCat(c); setPage(1); }}
                
              >
                {c}
              </button>
            ))}
          </div>
            {/* 검색: FAQ 검색 폼과 동일한 클래스/레이아웃 (상단 실선 '위', 우측 정렬, 작은 사이즈) */}
        <form
          className="faq-actions flex items-center gap-1 justify-end mt-3 "
          onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); setPage(1); }}
        >
          <input
  value={qInput}
  onChange={(e) => setQInput(e.target.value)}
  placeholder="검색으로 원하는 상품을 찾아보세요"
  className="faq-search text-xs text-center !w-[250px] sm:!w-[180px] md:!w-[180px]"
  aria-label="상품 검색"
/>
          {/* 흰 배경 + 진한 회색선 돋보기 아이콘 버튼 */}
          <button
  type="submit"
  aria-label="검색"
  className="btn-3d btn-white faq-searchbtn"
  style={{
    width: 35,            // ⬅ 원하는 값으로 조절 (예: 24, 26, 30)
    height: 35,           // ⬅ 원하는 값으로 조절
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',     // 진한 회색선 색 (SVG가 currentColor를 따르게 하려면 이거 유지)
  }}
>
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden
    style={{ display: 'block' }}   // 레이아웃 이슈 방지
  >
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
    <line x1="16.65" y1="16.65" x2="22" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
</button>

        </form>
        </div>
        

      
         
      </section>

      {/* 본문 상단 실선 (FAQ와 동일) */}
      <hr className="faq-sep" />

      {/* 목록 */}
      {isLoading && <div className="text-center py-8">상품을 불러오는 중…</div>}
      {error && <div className="text-center py-8">상품 로딩 오류가 발생했습니다.</div>}

      {!isLoading && !error && (
        <>
          {items.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">해당 카테고리의 상품이 없습니다.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 place-items-center">
              {items.map((it) => {
                const thumb = pickThumbUrl(it.images);
                return (
                  <Link
                    key={it.itemId}
                    href={`/items/${it.itemId}`}
                    className="block group text-center w-full no-underline"
                    prefetch={false}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded border bg-white">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={it.itemName}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-gray-400">
                          썸네일
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-gray-700 truncate">{it.itemName}</div>
                    <div className="text-xs text-gray-900">{won.format(it.itemPrice)}원</div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 본문 하단 실선 (항상 출력) */}
      <hr className="faq-sep" />

      {/* 하단: FAQ와 같은 버튼 톤으로 '등록' (실선 바로 밑, 우측 정렬) */}
      <div className="faq-bottom">
        <Link href="/items/new" className="btn-3d btn-primary" prefetch={false}>
          등록
        </Link>
      </div>

      {/* 페이징: board page.tsx의 Pager 디자인 그대로 */}
      <div className="mb-10 flex justify-center">
        <Pager
          current={data?.page ?? 1}
          total={data?.total ?? 0}
          size={data?.size ?? size}
          onPage={(p) => setPage(p)}
        />
      </div>
      <br></br>
      <br></br>
    </main>
  );
}
