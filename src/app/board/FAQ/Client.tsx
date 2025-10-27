//src/app/board/FAQ/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PawIcon from '@/components/icons/Paw';

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

  bCategory?: string; category?: string; cat?: string; group?: string; section?: string; type2?: string;

  // 서버마다 다른 보드 타입 키들
  boardType?: string; type?: string; bType?: string; board?: string; type1?: string;
};

/* ====== 인증 유틸(클라에서 관리자 판별 + 삭제 요청용) ====== */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function getTokenFromStorage() {
  if (typeof window === 'undefined') return '';
  let t =
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token') ||
    '';
  if (!t) {
    const raw =
      getCookie('Authorization') ||
      getCookie('authorization') ||
      getCookie('accessToken') ||
      '';
    if (raw) t = raw.replace(/^Bearer\s+/i, '');
  }
  return t || '';
}
function authHeaders(): HeadersInit {
  const t = getTokenFromStorage();
  if (!t) return {};
  return { Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}` };
}
function parseJwt(token: string): any | null {
  try {
    const clean = token.replace(/^Bearer\s+/i, '');
    const [_, body] = clean.split('.');
    if (!body) return null;
    const base64 = body.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 ? 4 - (base64.length % 4) : 0;
    const json = atob(base64 + '='.repeat(pad));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
function arrayify(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return v.split(/[,\s]+/).filter(Boolean);
  return [String(v)];
}
function isAdminFromClaims(claims: any): boolean {
  if (!claims) return false;
  const candidates = [
    claims.role, claims.roles, claims.authority, claims.authorities,
    claims.auth, claims.memberRole, claims.scope, claims.scp,
  ];
  const all = candidates.flatMap(arrayify).map((s) => s.toUpperCase());
  const numericAdmin =
    Number((claims.roleId ?? claims.role_id ?? claims.adminLevel ?? -1)) === 1;
  const booleanAdmin = !!(claims.isAdmin ?? claims.admin);
  return numericAdmin || booleanAdmin || all.includes('ADMIN') || all.includes('ROLE_ADMIN');
}
function detectAdminOnce(): boolean {
  const stored = (getCookie('memberRole') || localStorage.getItem('memberRole') || '').toUpperCase();
  if (stored === 'ADMIN' || stored === 'ROLE_ADMIN') return true;
  const t = getTokenFromStorage();
  return isAdminFromClaims(parseJwt(t));
}

/** 서버에서 FAQ 목록을 가져옵니다.
 *  ✅ 목록은 "완전 공개" 우선: page/size만 보냄
 *  ✅ 1차: credentials: 'omit' (완전 공개)
 *  ✅ 2차: 401/403이면 credentials: 'include' (쿠키만), Authorization 헤더는 붙이지 않음
 *  ✅ 기본 base는 8000 포트로 강제 (env 없을 때)
 */
function useFaqList(page: number, size: number) {
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
          (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');

        const url = new URL('board/readAll', base+'/');
        url.search = new URLSearchParams({
          page: String(page),
          size: String(size),
        }).toString();

        // 1) 완전 공개 요청
        let resp: Response = await fetch(url.toString(), {
          credentials: 'omit',
          signal: ac.signal,
        });

        // 2) 공개가 막혀있으면 쿠키만 동봉으로 재시도 (Authorization 헤더는 절대 안 보냄)
        if ((resp.status === 401 || resp.status === 403) && !ac.signal.aborted) {
          resp = await fetch(url.toString(), {
            credentials: 'include',
            signal: ac.signal,
          });
        }

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
  }, [page, size]);

  return { data, isLoading, error };
}

// 보드 타입 판별(FAQ만 남기기)
function pickBoardType(r: Partial<Row>): string {
  const v = r.boardType ?? r.type ?? r.bType ?? r.board ?? r.type1 ?? '';
  return String(v || '').trim().toUpperCase().replace(/\s+/g, '');
}
function isFAQType(v: string): boolean {
  const s = (v || '').toUpperCase().replace(/\s+/g, '');
  return s === 'FAQ' || s.endsWith('FAQ') || s.includes('FAQ');
}

// 레코드에서 카테고리 텍스트 추출
function pickCategory(r: Row): string {
  const raw =
    r.category ??
    r.bCategory ??
    r.category ??
    r.section ??
    r.group ??
    r.cat ??
    r.type2 ??
    '';
  return String(raw ?? '').trim();
}

// 버튼 4개 중 하나로 정규화
function normalizeToCat(label: string): Cat | '기타' {
  const s = label.toLowerCase();
  if (!s) return '기타';
  if (s.includes('회원') || s.includes('계정') || s.includes('account')) return '회원계정';
  if (s.includes('주문') || s.includes('배송') || s.includes('order') || s.includes('shipping')) return '주문/배송';
  if (s.includes('교환') || s.includes('반품') || s.includes('환불') || s.includes('return') || s.includes('exchange')) return '교환/반품';
  if (s.includes('이용') || s.includes('안내') || s.includes('guide') || s.includes('help')) return '이용안내';
  return '기타';
}

export default function FAQClient () {
  const [page] = useState(1);
  const [size] = useState(200);
  const [selectedCat, setSelectedCat] = useState<Cat>('회원계정');

  // URL ?category= 동기화
  const sp = useSearchParams();
  useEffect(() => {
    const initialFromUrl = (sp.get('category') || '').trim();
    const hit = CATS.find((c) => c === initialFromUrl) || '회원계정';
    setSelectedCat(hit as Cat);
  }, [sp]);

  // 검색
  const [kwInput, setKwInput] = useState('');
  const [q, setQ] = useState('');

  const { data, isLoading, error } = useFaqList(page, size);

  // 관리자 감지(버튼 노출용)
  const [admin, setAdmin] = useState<boolean>(detectAdminOnce());
  useEffect(() => {
    const onStorage = () => setAdmin(detectAdminOnce());
    const onFocus = () => setAdmin(detectAdminOnce());
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // 삭제된 글 가려두기
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  async function handleDelete(bno: number) {
    if (!admin) return alert('관리자만 삭제할 수 있습니다.');
    if (!confirm('정말 삭제하시겠어요?')) return;
    try {
      const base =
        process.env.NEXT_PUBLIC_API_BASE ||
        (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');
      const url = new URL(`board/delete/${bno}`, base+'/');

      const resp = await fetch(url.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: { ...authHeaders() }, // 관리자 토큰 필요
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      setDeletedIds(prev => [...prev, bno]);
    } catch (e: any) {
      alert(e?.message || '삭제 중 오류가 발생했어요.');
    }
  }

  // 리스트 안전 매핑
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

  // 먼저 FAQ만 남김 (QNA 섞임 방지)
  const onlyFAQ: Row[] = useMemo(() => {
    return list.filter((r) => isFAQType(pickBoardType(r)));
  }, [list]);

  // 서버 응답에 카테고리 필드가 없을 수도 있으니 보정
  const hasAnyCategory = useMemo(() => onlyFAQ.some(r => pickCategory(r) !== ''), [onlyFAQ]);

  // 클라 필터(카테고리 + 검색)
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return onlyFAQ.filter((r) => {
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
  }, [onlyFAQ, selectedCat, q, hasAnyCategory, deletedIds]);

  if (isLoading) return <div className={WRAP}>FAQ 불러오는 중…</div>;
  if (error) return <div className={WRAP}>FAQ 로딩 오류가 발생했어요</div>;

  return (
    <main className={WRAP} style={{ paddingBottom: 100 }}>
      {/* 타이틀/설명 */}
      <section className="faq-head">
        <h1 className="faq-title" style={{ marginTop: '0px  !important', marginBottom: 8 }}>
  FAQ <PawIcon />
</h1>
        <p className="faq-sub"></p>

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
            placeholder="자주 묻는 질문을 모았습니다. 찾는 답이 없다면 Q&amp;A로 문의해 주세요"
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
        <h2 className="faq-listtitle"></h2>

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

                    {/* 제목 */}
                    <span className="faq-q-text" style={{ flex: '1 1 auto', minWidth: 0 }}>
                      {title}
                    </span>

                    {/* 오른쪽 액션(수정/삭제) – 관리자만 노출 */}
                    {admin && (r.bno ?? r.id) && (
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

                    {/* + 아이콘 */}
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

      {/* 하단 우측 정렬: 등록 버튼 — 관리자만 노출 */}
      <div className="faq-bottom">
        {admin && (
          <Link
            href={`/board/FAQ/new?category=${encodeURIComponent(selectedCat)}`}
            className="btn-3d btn-primary"
            prefetch={false}
          >
            등록
          </Link>
        )}
      </div>
    </main>
  );
}