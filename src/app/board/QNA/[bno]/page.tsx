'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';

type Detail = {
  bno: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  // 작성자 ID 후보 키
  writerId?: string; memberId?: string; memberID?: string; member_id?: string;
  bWriter?: string; writer?: string; bwriter?: string;
  createDate?: string; createdAt?: string; regDate?: string;
  faqCategory?: string; category?: string; type2?: string;
};

type CommentRow = {
  cno?: number; id?: number;
  // 작성자 후보 키
  writerId?: string; memberId?: string; memberID?: string; member_id?: string;
  cWriter?: string; writer?: string; username?: string; nickname?: string;
  // 내용 후보 키
  cContent?: string; content?: string; comment?: string; ccontent?: string; body?: string; text?: string;
  createDate?: string; createdAt?: string;
};

const pick = (obj: any, keys: string[], fallback = '') =>
  keys.reduce<string>((acc, k) => (acc !== '' ? acc : (obj?.[k] ?? '')), '').toString() || fallback;

const pickWriterId = (d: Detail | null) =>
  pick(d, ['writerId', 'memberId', 'memberID', 'member_id', 'bWriter', 'writer', 'bwriter'], '');

const formatYMDHM = (s: string) => {
  if (!s) return '';
  if (s.includes('T')) return s.replace('T', ' ').slice(0, 16);
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin : '');

export default function QNADetailPage() {
  const router = useRouter();
  const params = useParams<{ bno: string }>();
  const bno = Number(params?.bno);

  // 상세
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 댓글
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [cWriter, setCWriter] = useState('');
  const [cContent, setCContent] = useState('');
  const [cSubmitting, setCSubmitting] = useState(false);

  // 상세 불러오기
  useEffect(() => {
    if (!bno) return;
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const resp = await fetch(`${baseURL}/anpetna/board/readOne/${bno}`, { credentials: 'include' });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const data = json?.result ?? json?.data ?? json;
        if (alive) setDetail(data);
      } catch (e: any) {
        if (alive) setErr(e?.message || '상세 조회 중 오류가 발생했어요.');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [bno]);

  // 댓글 목록 파서
  function extractCommentList(json: any): any[] {
    return (
      json?.result?.dtoList ??
      json?.result?.list ??
      json?.dtoList ??
      json?.list ??
      json?.comments ??
      []
    );
  }

  // 댓글 목록 불러오기 (여러 엔드포인트 순차 시도)
  async function loadComments() {
    const tries = [
      `${baseURL}/anpetna/comment/readAll?bno=${bno}`,
      `${baseURL}/anpetna/comment/readAll/${bno}`,
      `${baseURL}/anpetna/comment/list?bno=${bno}`,
    ];

    for (const url of tries) {
      try {
        const resp = await fetch(url, { credentials: 'include' });
        if (!resp.ok) continue;
        const json = await resp.json();
        const list = extractCommentList(json);
        if (Array.isArray(list)) {
          setComments(list);
          return;
        }
      } catch {
        // 다음 시도
      }
    }
    // 실패 시 빈 배열
    setComments([]);
  }

  useEffect(() => {
    if (!bno) return;
    loadComments();
  }, [bno]);

  // 게시글 삭제
  async function handleDeletePost() {
    if (!confirm('정말 삭제하시겠어요?')) return;
    try {
      const resp = await fetch(`${baseURL}/anpetna/board/delete/${bno}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      router.replace('/board/QNA');
    } catch {
      alert('삭제 중 오류가 발생했어요.');
    }
  }

  // 댓글 등록 (버튼은 textarea "밖" 오른쪽 하단)
  async function onSubmitComment(e: FormEvent) {
    e.preventDefault();
    if (cSubmitting) return;
    if (!cContent.trim()) return;

    setCSubmitting(true);
    try {
      const payload = {
        bno,
        cWriter: cWriter,
        writer: cWriter,
        cContent: cContent,
        content: cContent,
      };

      const resp = await fetch(`${baseURL}/anpetna/comment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      setCContent('');
      await loadComments(); // 새로고침 없이 목록 갱신
    } catch {
      alert('댓글 등록 중 오류가 발생했어요.');
    } finally {
      setCSubmitting(false);
    }
  }

  // 표기 값들
  const title = useMemo(() => pick(detail, ['bTitle', 'title', 'btitle'], '(제목 없음)'), [detail]);
  const writerId = useMemo(() => pickWriterId(detail), [detail]);
  const content = useMemo(() => pick(detail, ['bContent', 'content', 'bcontent'], ''), [detail]);
  const category = useMemo(() => pick(detail, ['faqCategory', 'category', 'type2'], ''), [detail]);
  const createdAtRaw = useMemo(() => pick(detail, ['createDate', 'createdAt', 'regDate'], ''), [detail]);
  const createdAt = useMemo(() => formatYMDHM(createdAtRaw), [createdAtRaw]);

  if (loading) return <main className={WRAP}>로딩 중…</main>;
  if (err || !detail) return <main className={WRAP}>상세를 불러오지 못했어요.</main>;

  return (
    <main className={WRAP}>
      {/* 제목 가운데 */}
      <section style={{ textAlign: 'center', marginTop: 16 }}>
        {category ? (
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                background: '#f1f5f9',
                fontSize: 12,
                fontWeight: 600,
                color: '#111827',
              }}
            >
              {category}
            </span>
          </div>
        ) : null}
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{title}</h1>
      </section>

      {/* 실선 */}
      <hr className="faq-sep" style={{ marginTop: 12 }} />

      {/* 작성자ID · 등록일 · 삭제 (오른쪽 정렬) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          color: '#374151',
          margin: '8px 0 12px',
        }}
      >
        <span>{writerId || '알수없음'}</span>
        <span>·</span>
        <span>{createdAt}</span>

        <button
          type="button"
          onClick={handleDeletePost}
          style={{
            marginLeft: 12,
            background: 'transparent',
            border: '1px solid #e5e7eb',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 13,
            color: '#111',
            cursor: 'pointer',
          }}
        >
          삭제
        </button>
      </div>

      {/* 본문 */}
      <div
        style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          fontSize: 15,
          color: '#111827',
          padding: '8px 2px',
        }}
      >
        {content}
      </div>

      {/* 실선 */}
      <hr className="faq-sep" style={{ margin: '18px 0' }} />

      {/* 댓글 작성: 입력칸 작게 + 버튼은 밖 오른쪽 */}
      <form
        onSubmit={onSubmitComment}
        style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, alignItems: 'start' }}
      >
        <label htmlFor="cwriter" style={{ fontWeight: 700, marginTop: 6 }}>
          작성자
        </label>
        <input
          id="cwriter"
          value={cWriter}
          onChange={(e) => setCWriter(e.target.value)}
          placeholder="작성자명을 입력"
          style={{
            height: 32,
            padding: '0 10px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontSize: 14,
          }}
        />

        <label htmlFor="ccontent" style={{ fontWeight: 700, marginTop: 6 }}>
          댓글내용
        </label>
        <textarea
          id="ccontent"
          value={cContent}
          onChange={(e) => setCContent(e.target.value)}
          placeholder="댓글을 입력하세요"
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            minHeight: 90,
            fontSize: 14,
          }}
        />

        {/* 빈칸 맞춰주기 */}
        <div />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={cSubmitting}
            className="btn-3d btn-primary"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            {cSubmitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>

      {/* 여백 */}
      <div style={{ height: 14 }} />

      {/* 댓글 목록 */}
      {comments.map((c, i) => {
        const w = pick(c, ['writerId', 'memberId', 'memberID', 'member_id', 'cWriter', 'writer', 'username', 'nickname'], '익명');
        const body = pick(c, ['cContent', 'content', 'comment', 'ccontent', 'body', 'text'], '');
        return (
          <div key={(c.cno ?? c.id ?? i) as number} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>{w}</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{body}</div>
            <hr className="faq-sep" style={{ margin: '10px 0' }} />
          </div>
        );
      })}

      {/* 목록으로 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18, marginBottom: 24 }}>
        <Link href="/board/QNA" className="btn-3d btn-white" prefetch={false} style={{ textDecoration: 'none' }}>
          목록으로
        </Link>
      </div>
    </main>
  );
}
