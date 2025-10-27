// src/app/board/QNA/[bno]/page.tsx
'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

/* 문자열 필드 안전 추출 유틸 */
function pickStr(obj: any, keys: string[], fallback = '') {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return fallback;
}

/* ★ 인증 헤더 헬퍼: local/sessionStorage의 accessToken을 Authorization으로 붙임 */
function authHeaders(init?: Record<string, string>, jsonAccept = true): Record<string, string> {
  const headers: Record<string, string> = { ...(init || {}) };
  try {
    const token =
      (typeof window !== 'undefined' && (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))) ||
      '';
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  if (jsonAccept && !headers['Accept']) headers['Accept'] = 'application/json';
  return headers;
}

type Post = {
  bno?: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  bWriter?: string; writer?: string; bwriter?: string; memberId?: string; writerId?: string;
  createDate?: string; regDate?: string; createdAt?: string;
  qnaCategory?: string;  category?: string;
};

type Cmt = {
  cno?: number; id?: number;
  cWriter?: string; cwriter?: string; writer?: string; memberId?: string; author?: string; authorId?: string; userId?: string; userName?: string;
  cContent?: string; ccontent?: string; content?: string; comment?: string; body?: string; text?: string;
  createDate?: string; regDate?: string; createdAt?: string; created_at?: string; date?: string; datetime?: string;
};

export default function QnaDetailPage() {
  const router = useRouter();
  const { bno: bnoParam } = useParams<{ bno: string }>();
  const bno = Number(bnoParam);

  const [post, setPost] = useState<Post | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [comments, setComments] = useState<Cmt[]>([]);
  const [loadingCmt, setLoadingCmt] = useState(true);

  // 댓글 입력(작성자 인풋 제거 → 내용만)
  const [cContent, setCContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // 글 조회
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingPost(true);
        const url = new URL(`board/readOne/${bno}`, base+'/').toString();
        const resp = await fetch(url, {
          credentials: 'include',
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const msg = `글을 불러오지 못했습니다. (HTTP ${resp.status})`;
          if (resp.status === 401 || resp.status === 403) {
            alert('로그인이 필요합니다.');
          } else {
            console.warn(msg);
          }
          if (alive) setPost(null);
          return;
        }
        const json = await resp.json();
        const raw: any = json?.result ?? json;
        if (!alive) return;
        setPost(raw);
      } catch (e) {
        console.warn(e);
        if (alive) setPost(null);
      } finally {
        if (alive) setLoadingPost(false);
      }
    })();
    return () => { alive = false; };
  }, [bno, base]);

  // 댓글 목록
  async function fetchComments() {
    setLoadingCmt(true);
    try {
      const url = new URL('comment/read', base+'/');
      url.search = new URLSearchParams({ bno: String(bno) }).toString();

      const resp = await fetch(url.toString(), {
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!resp.ok) {
        console.warn(`댓글을 불러오지 못했습니다. (HTTP ${resp.status})`);
        setComments([]);
        return;
      }
      const json = await resp.json();
      const list =
        json?.result?.page?.dtoList ??
        json?.result?.dtoList ??
        json?.result?.list ??
        json?.dtoList ??
        json?.list ??
        json?.result ??
        [];
      setComments(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn(e);
      setComments([]);
    } finally {
      setLoadingCmt(false);
    }
  }
  useEffect(() => { fetchComments(); /* eslint-disable-next-line */ }, [bno]);

  // 안전 매핑(글)
  const title = useMemo(() => pickStr(post, ['bTitle', 'title', 'btitle'], '(제목 없음)'), [post]);
  const body = useMemo(() => pickStr(post, ['bContent', 'content', 'bcontent'], ''), [post]);
  const authorId = useMemo(
    () => pickStr(post, ['memberId', 'writerId', 'bWriter', 'bwriter', 'writer'], '작성자정보없음'),
    [post],
  );
  const createdAt = useMemo(() => pickStr(post, ['createDate', 'createdAt', 'regDate'], ''), [post]);
  const category = useMemo(() => pickStr(post, ['qnaCategory',  'category'], 'QNA'), [post]);

  function fmt(ts?: string) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(+d)) return ts;
    return d.toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  // 글 삭제 → 나의 문의내역 탭으로
  async function handleDeletePost() {
    if (!post?.bno) return;
    if (!confirm('이 글을 삭제할까요?')) return;
    const resp = await fetch(new URL(`board/delete/${post.bno}`, base+'/'), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
    if (resp.ok) {
      router.push('/board/QNA?view=mine');
    } else {
      alert('삭제에 실패했습니다.');
    }
  }

  // 댓글 등록 (작성자 필드 전송 없음)
  async function onSubmitCmt(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!cContent.trim()) return;

    try {
      setSubmitting(true);
      const resp = await fetch(new URL('comment/create', base+'/'), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          bno,
          cContent, // ★ 서버가 토큰 사용자로 작성자 설정
        }),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      setCContent('');
      await fetchComments();
    } catch {
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 댓글 삭제
  async function handleDeleteComment(c: Cmt) {
    const cno = (c.cno ?? c.id) as number | undefined;
    if (!cno) return;
    if (!confirm('이 댓글을 삭제할까요?')) return;

    try {
      const resp = await fetch(new URL(`comment/${cno}/delete`, base+'/'), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!resp.ok) throw new Error(String(resp.status));
      await fetchComments();
    } catch {
      alert('댓글 삭제에 실패했습니다.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-[700px] px-4">
      {/* 상단: 카테고리 배지 + 제목(가운데 정렬) — 기존 UI 유지 */}
      <header style={{ textAlign: 'center', marginTop: 24 }}>
        <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: '#f2f2f2', fontSize: 12, marginBottom: 8 }}>
          {category}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
      </header>

      <hr className="faq-sep" style={{ margin: '16px 0' }} />

      {/* 작성자 · 등록일 · 삭제 — 기존 UI 유지(오른쪽 정렬) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center', fontSize: 14, color: '#444' }}>
        <span>작성자: <b>{authorId}</b></span>
        <span>등록일: {fmt(createdAt)}</span>
        {post?.bno && (
          <button
            type="button"
            onClick={handleDeletePost}
            style={{ background: 'transparent', border: '1px solid #ddd', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: '#222' }}
          >
            삭제
          </button>
        )}
      </div>

      {/* 본문 — 기존 UI 유지 */}
      <article style={{ marginTop: 16, marginBottom: 30, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {loadingPost ? '불러오는 중…' : body}
      </article>

      <hr className="faq-sep" style={{ marginTop: 10, marginBottom: 10 }} />

      {/* 댓글 리스트 — 기존 UI 유지 */}
      <section style={{ maxWidth: 820, marginBottom: 30, textAlign: 'left' }}>
        {loadingCmt ? (
          <div>답변 불러오는 중…</div>
        ) : comments.length === 0 ? (
          <div style={{ color: '#666' }}>등록된 답변이 없습니다.</div>
        ) : (
          comments.map((c, i) => {
            const name = pickStr(c, [
              'memberId','writerId','cWriter','cwriter','writer','commentWriter',
              'nickname','userId','userName','author','authorId'
            ], '익명');
            const text = pickStr(c, ['cContent','ccontent','content','comment','body','text'], '');
            const when = pickStr(c, ['createDate','createdAt','regDate','created_at','created','date','datetime'], '');

            return (
              <div key={(c.cno ?? c.id ?? i) as number} style={{ padding: '12px 0' }}>
                {/* 상단줄: 작성자 · 날짜  +  [삭제] 버튼(오른쪽 정렬, 작게) */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ fontSize:16, color: '#333' }}>
                    <b>{name}</b>  <span style={{ color: '#777' }}>{fmt(when)}</span>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ddd',
                        borderRadius: 8,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: '#222',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* 내용 */}
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, marginTop: 6, fontSize:16 }}>{text}</div>
                <hr className="faq-sep" style={{ marginTop: 12 }} />
              </div>
            );
          })
        )}
      </section>

      {/* 댓글 작성 — 작성자 입력칸 제거, 내용만 */}
      <form onSubmit={onSubmitCmt} style={{ maxWidth: 820, margin: '0 auto', textAlign: 'left' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 10, alignItems: 'start' }}>
          <label htmlFor="ccontent" style={{ fontWeight: 500, marginTop: 8, textAlign: 'left' }}>답변</label>
          <textarea
            id="ccontent"
            value={cContent}
            onChange={(e) => setCContent(e.target.value)}
            rows={4}
            style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8, minHeight: 120, resize: 'vertical', textAlign: 'left' }}
            placeholder="댓글 내용을 입력하세요"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="submit" disabled={submitting} className="btn-3d btn-primary" style={{ textDecoration: 'none' }}>
            {submitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>

      <div style={{ height: 10 }} />

      {/* 목록으로 — ‘나의 문의내역’ 탭으로 이동 */}
      <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 50 }}>
        <Link
          href={{ pathname: '/board/QNA', query: { view: 'mine' } }}
          prefetch={false}
          className="btn-3d btn-white"
          style={{ textDecoration: 'none' }}
        >
          목록으로
        </Link>
      </div>
    </main>
  );
}
