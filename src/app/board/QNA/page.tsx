'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[700px] px-4';
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내', '기타'] as const;
type Cat = (typeof CATS)[number];
type View = 'write' | 'mine';

type Row = {
  bno?: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  bWriter?: string; writer?: string; memberId?: string;
  createDate?: string; createdAt?: string; regDate?: string;
  qnaCategory?: string; category?: string; faqCategory?: string;
  bCategory?: string; cat?: string; group?: string; section?: string; type2?: string; qCategory?: string;
  commentsCount?: number; commentCount?: number; replyCount?: number;
};

/** 응답이 비어 있어도 안전하게 JSON으로 파싱 */
async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

/** 개발중엔 3000 → 8000 자동 스왑하여 백엔드로 보냄 */
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

export default function QnaPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const [view, setView] = useState<View>(
    (sp.get('view') || '').toLowerCase() === 'mine' ? 'mine' : 'write'
  );
  useEffect(() => {
    const v = (sp.get('view') || '').toLowerCase();
    setView(v === 'mine' ? 'mine' : 'write');
  }, [sp]);

  const go = (v: View) => router.push(`/board/QNA?view=${v}`);

  // 작성 폼
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>('회원계정');
  const [content, setContent] = useState('');
  const [writer, setWriter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 목록 & 댓글수
  const [list, setList] = useState<Row[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});

  const base = buildBase();

  // 현재 로그인 토큰 (없으면 보호 API를 호출하지 않음)
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  // 목록 로드 (나의 문의내역)
  useEffect(() => {
    if (view !== 'mine') return;

    // ✅ 토큰 없으면 보호 API 호출하지 않고 메시지만
    if (!token) {
      setList([]);
      setErr('로그인이 필요합니다.');
      return;
    } else {
      setErr(null);
    }

    let alive = true;
    (async () => {
      setLoadingList(true);
      try {
        const url = new URL('/anpetna/board/readAll', base);
        url.search = new URLSearchParams({
          page: '1',
          size: '100',
          boardType: 'QNA',
        }).toString();

        const resp = await fetch(url.toString(), {
          credentials: 'include',
          headers: authHeaders(), // ← Authorization 헤더 포함
        });

        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          throw new Error(`목록 호출 실패 (HTTP ${resp.status})${text ? `\n${text}` : ''}`);
        }
        const json = await parseJsonSafe(resp);

        const raw =
          json?.result?.dtoList ??
          json?.result?.page?.dtoList ??
          json?.dtoList ??
          json?.list ??
          [];

        if (!alive) return;
        setList(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.error(e);
        if (alive) setList([]);
        if (alive) setErr(e instanceof Error ? e.message : '목록 호출 실패');
      } finally {
        if (alive) setLoadingList(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, token]);

  // 각 글의 댓글 카운트
  useEffect(() => {
    if (view !== 'mine' || list.length === 0 || !token) return;
    let alive = true;
    (async () => {
      const out: Record<number, number> = {};
      await Promise.all(
        list.map(async (r, idx) => {
          const id = (r.bno ?? idx) as number;
          try {
            const url = new URL('/anpetna/comment/read', base);
            url.search = new URLSearchParams({ bno: String(id) }).toString();

            const resp = await fetch(url.toString(), {
              credentials: 'include',
              headers: authHeaders(),
            });

            if (!resp.ok) {
              const text = await resp.text().catch(() => '');
              throw new Error(`댓글수 호출 실패 (HTTP ${resp.status})${text ? `\n${text}` : ''}`);
            }
            const json = await parseJsonSafe(resp);

            const total =
              json?.result?.page?.total ??
              json?.result?.total ??
              json?.total ??
              0;
            out[id] = Number(total) || 0;
          } catch {
            out[id] = 0;
          }
        })
      );
      if (alive) setCounts(out);
    })();
    return () => { alive = false; };
  }, [view, list, base, token]);

  // 등록
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim() || !content.trim()) {
      setErr('제목과 내용을 입력해 주세요.');
      return;
    }
    if (!token) {
      setErr('로그인이 필요합니다.');
      return;
    }
    setErr(null);
    try {
      setSubmitting(true);
      const resp = await fetch(new URL('/anpetna/board/create', base), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(undefined, true), // JSON + Authorization
        body: JSON.stringify({
          bTitle: title,
          bContent: content,
          bWriter: writer,
          boardType: 'QNA',
          noticeFlag: false,
          isSecret: false,
          qnaCategory: cat, faqCategory: cat, category: cat, bCategory: cat, qCategory: cat, cat,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`등록 실패 (HTTP ${resp.status})\n${text.slice(0, 200)}`);
      }
      router.replace('/board/QNA?view=mine');
    } catch (e: any) {
      setErr(e?.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // --------- 카테고리 추출 + 색상 스타일 ----------
  function normalizeCat(label: string): Cat {
    const s = String(label ?? '').trim();
    if (!s) return '기타';
    if (CATS.includes(s as Cat)) return s as Cat;
    const low = s.toLowerCase().replace(/\s+/g, '');
    if (low.includes('회원') || low.includes('계정') || low.includes('account')) return '회원계정';
    if (low.includes('주문') || low.includes('배송') || low.includes('order') || low.includes('shipping')) return '주문/배송';
    if (low.includes('교환') || low.includes('반품') || low.includes('환불') || low.includes('return') || low.includes('exchange')) return '교환/반품';
    if (low.includes('이용') || low.includes('안내') || low.includes('guide') || low.includes('help')) return '이용안내';
    return '기타';
  }

  function getCat(r: Row): Cat {
    const raw =
      r.qnaCategory ??
      r.faqCategory ??
      r.category ??
      r.bCategory ??
      r.qCategory ??
      r.cat ??
      r.group ??
      r.section ??
      r.type2 ??
      '';
    return normalizeCat(raw);
  }

  function catChipStyle(cat: Cat): React.CSSProperties {
    switch (cat) {
      case '회원계정': return { background: '#FFE8CC', color: '#B45309' };
      case '주문/배송': return { background: '#FFE4EC', color: '#BE185D' };
      case '교환/반품': return { background: '#FFF7CC', color: '#A16207' };
      case '이용안내': return { background: '#DCFCE7', color: '#166534' };
      default: return { background: '#E8F4FF', color: '#0369a1' };
    }
  }
  // -----------------------------------------------

  return (
    <main className={WRAP}>
      {/* 타이틀 + 탭 */}
      <section className="faq-head" style={{ textAlign: 'center' }}>
        <h1 className="faq-title">QNA</h1>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 40 }}>
          <button
            type="button"
            onClick={() => go('write')}
            className={`btn-3d btn-white ${view === 'write' ? 'is-active' : ''}`}
            aria-pressed={view === 'write'}
            style={view === 'write'
              ? { textDecoration: 'none', background: '#111', color: '#fff' }
              : { textDecoration: 'none' }}
          >
            문의하기
          </button>
          <button
            type="button"
            onClick={() => go('mine')}
            className={`btn-3d btn-white ${view === 'mine' ? 'is-active' : ''}`}
            aria-pressed={view === 'mine'}
            style={view === 'mine'
              ? { textDecoration: 'none', background: '#111', color: '#fff' }
              : { textDecoration: 'none' }}
          >
            나의 문의내역
          </button>
        </div>

        {/* 안내문 (문의하기 탭에서만) */}
        {view === 'write' && (
          <div style={{ color: '#777', textAlign: 'center', fontSize: 13, lineHeight: 1.6, marginTop: 30, marginBottom: 50 }}>
            <div>· 상담 문의에 필요한 정보만 기입해 주시기 바랍니다</div>
            <div>· 요청 드리지않은 개인정보를 임의로 입력 시 상담이 중단될 수 있습니다</div>
            <div>· 답변은 영업일 기준 2~5일 소요될 수 있습니다</div>
          </div>
        )}
      </section>

      {/* 구분선(원래 위치 유지) */}
      <hr className="faq-sep" style={{ marginTop: 10, marginBottom: 10 }} />

      {/* (1) 문의하기 */}
      {view === 'write' && (
        <form onSubmit={onSubmit} className="faq-form" style={{ maxWidth: 820, margin: '18px auto 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label htmlFor="title" style={{ fontWeight: 700 }}>제목</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              required
              style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label htmlFor="category" style={{ fontWeight: 700 }}>카테고리</label>
            <select
              id="category"
              value={cat}
              onChange={(e) => setCat(e.target.value as Cat)}
              style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
            >
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label htmlFor="writer" style={{ fontWeight: 700 }}>작성자</label>
            <input
              id="writer"
              value={writer}
              onChange={(e) => setWriter(e.target.value)}
              placeholder="작성자 ID"
              style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
            <label htmlFor="content" style={{ fontWeight: 700, marginTop: 8 }}>내용</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="문의 내용을 입력하세요"
              rows={10}
              required
              style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10, minHeight: 220 }}
            />
          </div>

          {err && <p style={{ color: '#c00', margin: '8px 0 0 120px', whiteSpace: 'pre-wrap' }}>{err}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-3d btn-primary" disabled={submitting}>
              {submitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </form>
      )}

      {/* (2) 나의 문의내역 */}
      {view === 'mine' && (
        <section style={{ maxWidth: 820, marginTop: 10, marginBottom: 10 }}>
          {loadingList ? (
            <div>목록 불러오는 중…</div>
          ) : list.length === 0 ? (
            <div style={{ color: '#666' }}>{err ?? '작성한 문의가 없습니다.'}</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {list.map((r, idx) => {
                const bno = (r.bno ?? idx) as number;
                const title = (r.bTitle ?? r.title ?? r.btitle ?? '(제목 없음)').toString();
                const catText = getCat(r);
                const cmtCount =
                  counts[bno] ??
                  (r.commentsCount ?? r.commentCount ?? r.replyCount ?? 0);

                return (
                  <li key={bno} style={{ padding: '12px 0' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        flexWrap: 'nowrap',
                        minHeight: 36,
                      }}
                    >
                      <span
                        style={{
                          ...catChipStyle(catText as Cat),
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          flex: '0 0 auto',
                        }}
                      >
                        {catText}
                      </span>

                      <Link
                        href={`/board/QNA/${bno}`}
                        prefetch={false}
                        style={{
                          textDecoration: 'none',
                          color: '#111',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: '1 1 auto',
                          minWidth: 0,
                          display: 'inline-block',
                        }}
                      >
                        {title}
                        <span style={{ color: '#818181ff', marginLeft: 6 }}>[{cmtCount}]</span>
                      </Link>
                    </div>

                    <hr className="faq-sep" style={{ margin: '12px 0 0' }} />
                  </li>
                );
              })}
              <p><br /></p>
              <p><br /></p>
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
