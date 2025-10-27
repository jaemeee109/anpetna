// src/app/board/QNA/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import PawIcon from '@/components/icons/Paw';

const WRAP = 'mx-auto w-full max-w-[700px] px-4';
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내', '기타'] as const;
type Cat = (typeof CATS)[number];
type View = 'write' | 'mine';

type Row = {
  bno?: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  bWriter?: string; writer?: string; memberId?: string; bwriter?: string; 
  createDate?: string; createdAt?: string; regDate?: string;
  qnaCategory?: string; category?: string; 
  Category?: string; cat?: string; group?: string; section?: string; type2?: string; qCategory?: string;
  commentsCount?: number; commentCount?: number; replyCount?: number;
};

async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function buildBase(): string {
  const env = process.env.NEXT_PUBLIC_API_BASE as string | undefined;
  if (env) return env.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const usePort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${usePort ? `:${usePort}` : ''}`;
}

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
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  useEffect(() => {
    try {
      const id =
        (typeof window !== 'undefined' && localStorage.getItem('memberId')) ||
        (typeof window !== 'undefined' && sessionStorage.getItem('memberId')) ||
        '';
      if (id) setWriter(id);
    } catch {}
  }, []);

 useEffect(() => {
  if (view !== 'mine') return;

  let alive = true;

  (async () => {
    setLoadingList(true);
    setErr(null);

    try {
      const memberId =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('memberId') || sessionStorage.getItem('memberId'))) ||
        '';

      if (!token || !memberId) {
        if (alive) {
          setErr('로그인이 필요합니다.');
          setList([]);
          setLoadingList(false);
        }
        return;
      }

      // 관리자 여부: local/session/cookie 어느 쪽이든 잡아서 판단
      const roleStr = (typeof window !== 'undefined' && (
        (localStorage.getItem('memberRole') || sessionStorage.getItem('memberRole')) ??
        (() => {
          try {
            const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
            return m ? decodeURIComponent(m[1]) : '';
          } catch { return ''; }
        })()
      ) || '').toUpperCase();

      const isAdmin = roleStr === 'ADMIN' || roleStr === 'ROLE_ADMIN';

      // ✅ 관리자면 type/keyword 제거 → 전체 QNA
      //    일반회원이면 내 글만(type=w & keyword=memberId)
      const url = new URL('board/readAll', base+'/');
      url.searchParams.set('page', '1');
      url.searchParams.set('size', '100');
      url.searchParams.set('boardType', 'QNA');
      if (!isAdmin) {
        url.searchParams.set('type', 'w');
        url.searchParams.set('keyword', String(memberId));
      }

      const resp = await fetch(url.toString(), {
        credentials: 'include',
        headers: authHeaders(),
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
        json?.content ??
        [];

      // ✅ 서버가 잘 내려와도 최종 안전 필터
      const me = String(memberId).trim().toLowerCase();

      const onlyMine = (Array.isArray(raw) ? raw : []).filter((r: Row) => {
  // boardType이 QNA인지도 함께 확인(혹시 섞여 올 상황 대비)
  const type =
    (r as any).boardType ?? (r as any).type ?? (r as any).bType ?? (r as any).board ?? (r as any).type1 ?? '';
  const w = String(r.bWriter ?? r.writer ?? r.memberId ?? (r as any).bwriter ?? '')
    .trim()
    .toLowerCase();
  return String(type).toUpperCase() === 'QNA' && me && w === me;
});

      const qnaAll = (Array.isArray(raw) ? raw : []).filter((r: Row) => {
        const type = (r as any).boardType ?? (r as any).type ?? (r as any).bType ?? (r as any).board ?? (r as any).type1 ?? '';
        return String(type).toUpperCase() === 'QNA';
      });

      if (!alive) return;
      setList(isAdmin ? qnaAll : onlyMine);
    } catch (e: any) {
      if (alive) {
        setList([]);
        setErr(e?.message || '목록 호출 실패');
      }
    } finally {
      if (alive) setLoadingList(false);
    }
  })();

  return () => { alive = false; };
}, [view, token, base]);


  useEffect(() => {
    if (view !== 'mine' || list.length === 0 || !token) return;
    let alive = true;
    (async () => {
      const out: Record<number, number> = {};
      await Promise.all(
        list.map(async (r, idx) => {
          const id = (r.bno ?? idx) as number;
          try {
            const url = new URL('comment/read', base+'/');
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

  

// (교체 후) QNA 작성 제출 - FormData + 'json' 파트 전송
const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setErr('');

  // 관리자 차단 (현재 페이지 상단의 로직과 동일 기준)
  const roleStr =
    (typeof window !== 'undefined' &&
      (
        localStorage.getItem('memberRole') ||
        sessionStorage.getItem('memberRole') ||
        ((): string => {
          try {
            const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
            return m ? decodeURIComponent(m[1]) : '';
          } catch { return ''; }
        })()
      )) || '';
  const isAdmin = roleStr.toUpperCase() === 'ADMIN' || roleStr.toUpperCase() === 'ROLE_ADMIN';
  if (isAdmin) {
    alert('관리자는 문의하기를 작성할 수 없습니다.');
    return;
  }

  setSubmitting(true);
  try {
 
    
        const memberId =
          (typeof window !== 'undefined' &&
            (localStorage.getItem('memberId') || sessionStorage.getItem('memberId'))) ||
          '';

        if (!memberId) {
          alert('로그인이 필요합니다.');
          setSubmitting(false);
          return;
        }

        const catToCode = (k: Cat) => {
          switch (k) {
            case '회원계정': return 'ACCOUNT';
            case '주문/배송': return 'ORDER';
            case '교환/반품': return 'RETURN';
            case '이용안내': return 'GUIDE';
            default: return 'ETC';
          }
        };

        
        const label = String(cat ?? '').trim();
        const code =
          label === '회원계정' ? 'ACCOUNT' :
          label === '주문/배송' ? 'ORDER'  :
          label === '교환/반품' ? 'RETURN' :
          label === '이용안내' ? 'GUIDE'  : 'ETC';

        const body = {
          // 기본 필수
          boardType: 'QNA',
          bTitle: String(title ?? '').trim(),
          bContent: String(content ?? '').trim(),

          // 작성자: 서버 인증 사용자와 100% 동일하게
          bWriter: String(memberId ?? '').trim(),

          // 카테고리: 어떤 필드를 읽어도 동일하게 인식되도록 모두 전송
          category: code,          // enum/코드 기대 케이스
          qnaCategory: code,       // qnaCategory를 쓰는 구현 대비
          bCategory: code,         // bCategory를 쓰는 구현 대비
          categoryName: label,     // (혹시 라벨을 쓰는 구현 대비)
          qnaCategoryName: label,  // (혹시 라벨 별칭 대비)

          // 선택 필드들: 누락으로 인한 충돌 방지 (boolean/기본값)
          isSecret: false,
          secret: false,
        };


        

    //  multipart/form-data 생성: 'json' 파트로 본문 전송
    const fd = new FormData();
    fd.append('json', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    // 첨부가 있으면 아래처럼 추가
    // files.forEach(f => fd.append('files', f));

    const url = new URL('board/create', base+'/').toString();
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      // ❗ FormData 사용 시 Content-Type 수동 지정 금지 (브라우저가 boundary 포함해 설정)
      headers: authHeaders(undefined, false), // Authorization만 자동 부착
      body: fd,
    });

    if (!resp.ok) {
  if (resp.status === 401 || resp.status === 403) {
    alert('로그인이 필요합니다.');
    return;
  }
  const raw = await resp.text().catch(() => '');
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : null; } catch {}
  const msg =
    json?.resMessage ||
    json?.message ||
    '입력값을 확인해주세요.';
  alert(msg);        // 화면에  JSON 노출 금지
  return;            // throw하지 않아 하단 setErr에 긴 문자열이 들어가지 않음
}


    alert('문의가 등록되었습니다.');
    router.replace('/board/QNA?view=mine'); // 등록 후 "나의 문의내역"으로 이동 (원하시면 변경)
 } catch (e: any) {
  alert(e?.message || '작성 실패'); 
  setErr(null);                     //  화면에 원문 노출 방지
} finally {
    setSubmitting(false);
  }
};





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
      r.category ??
      r.Category ??
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

  return (
    <main className={WRAP}>
      <section className="faq-head" style={{ textAlign: 'center' }}>
        <h1 className="faq-title">QNA <PawIcon/></h1>

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

        {view === 'write' && (
          <div style={{ color: '#777', textAlign: 'center', fontSize: 13, lineHeight: 1.6, marginTop: 30, marginBottom: 50 }}>
            <div>· 상담 문의에 필요한 정보만 기입해 주시기 바랍니다</div>
            <div>· 요청 드리지않은 개인정보를 임의로 입력 시 상담이 중단될 수 있습니다</div>
            <div>· 답변은 영업일 기준 2~5일 소요될 수 있습니다</div>
          </div>
        )}
      </section>

      <hr className="faq-sep" style={{ marginTop: 10, marginBottom: 10 }} />

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