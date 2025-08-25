'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';

// FAQ 카테고리 버튼 목록 (표시 라벨)
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내'] as const;
type Cat = (typeof CATS)[number];

type Row = {
  bno?: number;
  id?: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  bWriter?: string; writer?: string; bwriter?: string;
  createDate?: string; createdAt?: string; regDate?: string;

  // 서버 필드 이름이 다를 수 있어 최대한 유연하게 케이스를 모아둠
  category?: string; bCategory?: string; faqCategory?: string; cat?: string; group?: string; section?: string; type2?: string;
};

/** 서버에서 FAQ 목록을 가져옵니다.
 *  ✅ boardType & category를 서버에 전달해 서버 측에서 먼저 필터링
 */
function useFaqList(page: number, size: number, selectedCat: Cat) { // ← (1) 선택 카테고리 인자로 받기
  const [data, setData] = useState<any>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const base =
          process.env.NEXT_PUBLIC_API_BASE ||
          (typeof window !== 'undefined' ? window.location.origin : '');

        const url = new URL('/anpetna/board/readAll', base);
        // ✅ 핵심: boardType & category 전달 (기존 type=FAQ 제거)
        url.search = new URLSearchParams({
          page: String(page),
          size: String(size),
          boardType: 'FAQ',
          category: selectedCat,
        }).toString();

        const resp: Response = await fetch(url.toString(), {
          credentials: 'include',
          signal: ac.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const json: any = await resp.json();
        setData(json);
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return;
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [page, size, selectedCat]); // ← (2) 선택 카테고리 바뀌면 다시 로드

  return { data, isLoading, error };
}

// 레코드에서 카테고리 텍스트를 최대한 안전하게 추출
function pickCategory(r: Row): string {
  const raw =
    r.category ??
    r.bCategory ??
    r.faqCategory ??
    r.section ??
    r.group ??
    r.cat ??
    r.type2 ??
    '';
  return String(raw ?? '').trim();
}

// 레코드의 카테고리를 우리 버튼 4개 중 하나로 정규화 (대강의 단어 포함으로 매칭)
function normalizeToCat(label: string): Cat | '기타' {
  const s = label.toLowerCase();
  if (!s) return '기타';
  if (s.includes('회원') || s.includes('계정') || s.includes('account')) return '회원계정';
  if (s.includes('주문') || s.includes('배송') || s.includes('order') || s.includes('shipping')) return '주문/배송';
  if (s.includes('교환') || s.includes('반품') || s.includes('환불') || s.includes('return') || s.includes('exchange')) return '교환/반품';
  if (s.includes('이용') || s.includes('안내') || s.includes('guide') || s.includes('help')) return '이용안내';
  return '기타';
}

export default function FAQPage() {
  const [page] = useState(1);
  const [size] = useState(200); // FAQ는 카테고리 필터링이라 많이 가져와도 OK
  const [selectedCat, setSelectedCat] = useState<Cat>('회원계정');

  // URL의 ?category= 값을 읽어 초기/동기화
  const sp = useSearchParams();
  useEffect(() => {
    const initialFromUrl = (sp.get('category') || '').trim();
    const hit = CATS.find((c) => c === initialFromUrl) || '회원계정';
    setSelectedCat(hit as Cat);
  }, [sp]);

  // 검색 입력값(입력창)과 실제 적용된 검색어를 분리
  const [kwInput, setKwInput] = useState('');
  const [q, setQ] = useState('');

  // 검색어 상태 바로 아래쯤에 넣어주세요
const { data, isLoading, error } = useFaqList(page, size, selectedCat);


// ✅ 리스트 안전 매핑 (result.dtoList 우선)
const list: Row[] = useMemo(() => {
  const d = data as any; 
  const raw =
    d?.result?.dtoList ??        // ← 여기 추가!
    d?.result?.page?.dtoList ??
    d?.page?.dtoList ??
    d?.dtoList ??
    d?.list ??
    [];
  return Array.isArray(raw) ? raw : [];
}, [data]);
  // ✅ 서버가 이미 카테고리로 필터링했더라도,
  //    DTO에 카테고리 필드가 없는 경우가 있어 클라 필터가 전부 버려지는 문제 대응:
  //    레코드 전체에 카테고리 값이 하나도 없으면 '선택 카테고리'로 간주.
  const hasAnyCategory = useMemo(() => list.some(r => pickCategory(r) !== ''), [list]);

  // 카테고리 + 키워드 필터
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return list.filter((r) => {
      const catText = pickCategory(r);
      const catNorm = hasAnyCategory ? normalizeToCat(catText) : selectedCat; // ← (3) 보강 포인트
      if (catNorm !== selectedCat) return false;

      if (!kw) return true;
      const title = (r.bTitle ?? r.title ?? r.btitle ?? '').toString().toLowerCase();
      const body = (r.bContent ?? r.content ?? r.bcontent ?? '').toString().toLowerCase();
      return title.includes(kw) || body.includes(kw);
    });
  }, [list, selectedCat, q, hasAnyCategory]);

  if (isLoading) return <div className={WRAP}>FAQ 불러오는 중…</div>;
  if (error) return <div className={WRAP}>FAQ 로딩 오류가 발생했어요</div>;

  return (
    <main className={WRAP}>
      {/* 타이틀/설명 */}
      <section className="faq-head">
        <h1 className="faq-title">FAQ</h1>
        <p className="faq-sub">자주 묻는 질문을 모았습니다. 찾는 답이 없다면 Q&amp;A로 문의해 주세요</p>

        {/* 카테고리 버튼 */}
        <div className="faq-catbar" role="tablist" aria-label="FAQ categories">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              className={`faq-cat ${c === selectedCat ? 'is-active' : ''}`}
              aria-pressed={c === selectedCat}
              onClick={() => setSelectedCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 검색 인풋 + 버튼 */}
        <form
          className="faq-actions"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(kwInput);
          }}
        >
          <input
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            placeholder="키워드로 검색 (예: 배송, 환불)"
            className="faq-search"
            aria-label="FAQ 검색"
          />
          <button type="submit" className="btn-3d btn-white faq-searchbtn">검색</button>
          <Link href="/board/QNA" className="btn-3d btn-white faq-ask" prefetch={false}>
            Q&amp;A 문의하기
          </Link>
        </form>
      </section>

      {/* 구분선 */}
      <hr className="faq-sep" />

      {/* 선택 카테고리의 글 목록 */}
      <section aria-live="polite" className="faq-listwrap">
        <h2 className="faq-listtitle">{selectedCat} 카테고리 글 목록</h2>

        {filtered.length === 0 ? (
          <div className="faq-empty">검색 결과가 없습니다.</div>
        ) : (
          <div className="faq-accordion">
            {filtered.map((r, idx) => {
              const title = r.bTitle ?? r.title ?? r.btitle ?? '(제목 없음)';
              const body = r.bContent ?? r.content ?? r.bcontent ?? '';
              const key = r.bno ?? r.id ?? idx;
              return (
                <details key={key} className="faq-item">
                  <summary className="faq-q">
                    <span className="faq-q-label">Q.</span>
                    <span className="faq-q-text">{title}</span>
                    <span className="faq-caret" aria-hidden>+</span>
                  </summary>
                  <div className="faq-a">
                    <span className="faq-a-label">A.</span>
                    <div className="faq-a-text">{body}</div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* 구분선 */}
      <hr className="faq-sep" />

      {/* 하단 우측 정렬: 등록 버튼 */}
      <div className="faq-bottom">
        <Link
          href={`/board/FAQ/new?category=${encodeURIComponent(selectedCat)}`}
          className="btn-3d btn-primary"
          prefetch={false}
        >
          등록
        </Link>
      </div>
    </main>
  );
}
