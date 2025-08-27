'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[700px] px-4';

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

/** 응답이 비어 있어도 안전하게 JSON으로 파싱 */
async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

/** 개발 중엔 3000 → 8000 자동 스왑하여 백엔드로 보냄 */
function buildBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE as string | undefined;
  if (env) return env.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const usePort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${usePort ? `:${usePort}` : ''}`;
}

/** Authorization 헤더(있으면) + 기타 헤더 병합 */
function authHeaders(extra?: HeadersInit, json = false): Headers {
  const h = new Headers(extra);
  if (json) h.set('Content-Type', 'application/json');
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) h.set('Authorization', `Bearer ${token}`);
  } catch {}
  return h;
}

/** 서버에서 FAQ 목록을 가져옵니다.
 *  ✅ boardType & category를 서버에 전달해 서버 측에서 먼저 필터링
 */
function useFaqList(page: number, size: number, selectedCat: Cat) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const base = buildBase();
        const url = new URL('/anpetna/board/readAll', base);
        url.search = new URLSearchParams({
          page: String(page),
          size: String(size),
          boardType: 'FAQ',
          category: selectedCat,
        }).toString();

        const resp: Response = await fetch(url.toString(), {
          credentials: 'include',
          headers: authHeaders(), // ← Authorization 헤더 자동 부착
          signal: ac.signal,
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const json: any = await parseJsonSafe(resp);
        setData(json);
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return;
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [page, size, selectedCat]);

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

  const { data, isLoading, error } = useFaqList(page, size, selectedCat);

  // 삭제된 글 가려두기용
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  async function handleDelete(bno: number) {
    if (!confirm('정말 삭제하시겠어요?')) return;
    try {
      const base = buildBase();
      const url = new URL(`/anpetna/board/delete/${bno}`, base);
      const resp = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(), // 인증 포함
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      // 화면에서 즉시 제거
      setDeletedIds(prev => [...prev, bno]);
    } catch {
      alert('삭제 중 오류가 발생했어요.');
    }
  }

  // ✅ 리스트 안전 매핑 (result.dtoList 우선)
  const list: Row[] = useMemo(() => {
    const d = data as any; 
    const raw =
      d?.result?.dtoList ??
      d?.result?.page?.dtoList ??
      d?.page?.dtoList ??
      d?.dtoList ??
      d?.list ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  // DTO에 카테고리 값이 전혀 없을 때를 대비해, 선택 카테고리로 간주
  const hasAnyCategory = useMemo(() => list.some(r => pickCategory(r) !== ''), [list]);

  // 카테고리 + 키워드 필터
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return list.filter((r) => {
      const idVal = (r.bno ?? r.id) as number | undefined;
      if (idVal && deletedIds.includes(idVal)) return false;

      const catText = pickCategory(r);
      const catNorm = hasAnyCategory ? normalizeToCat(catText) : selectedCat;
      if (catNorm !== selectedCat) return false;

      if (!kw) return true;
      const title = (r.bTitle ?? r.title ?? r.btitle ?? '').toString().toLowerCase();
      const body = (r.bContent ?? r.content ?? r.bcontent ?? '').toString().toLowerCase();
      return title.includes(kw) || body.includes(kw);
    });
  }, [list, selectedCat, q, hasAnyCategory, deletedIds]);

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
            placeholder="검색 내용을 입력해주세요 ^ㅅ^ "
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
        {/*  <h2 className="faq-listtitle">{selectedCat} </h2>*/}

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
                  <summary
                    className="faq-q"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'nowrap',
                      listStyle: 'none',
                    }}
                  >
                    <span className="faq-q-label">Q.</span>

                    {/* 제목은 가운데 영역을 꽉 채우도록 */}
                    <span className="faq-q-text" style={{ flex: '1 1 auto', minWidth: 0 }}>
                      {title}
                    </span>

                    {/* 오른쪽 액션(수정/삭제) – 검정 글씨 + 작은 폰트 */}
                    {(r.bno ?? r.id) && (
                      <span
                        className="faq-row-actions"
                        style={{
                          marginLeft: 'auto',
                          display: 'inline-flex',
                          gap: 8,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Link
                          href={`/board/FAQ/${(r.bno ?? r.id)}/edit`}
                          prefetch={false}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            textDecoration: 'none',
                            color: '#222',
                            fontFamily: 'inherit',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            display: 'inline-block',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                          }}
                        >
                          수정
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete((r.bno ?? r.id) as number);
                          }}
                          style={{
                            background: 'transparent',
                            border: 0,
                            padding: 0,
                            cursor: 'pointer',
                            color: '#222',
                            fontFamily: 'inherit',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            display: 'inline-block',
                            textDecoration: 'none',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                          }}
                        >
                          삭제
                        </button>
                      </span>
                    )}

                    {/* + 아이콘은 액션 옆 같은 줄 */}
                    <span className="faq-caret" aria-hidden style={{ marginLeft: 8 }}>+</span>
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
