'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내'] as const;
type Cat = (typeof CATS)[number];

type ReadOne = {
  bno?: number;
  bTitle?: string; btitle?: string;
  bContent?: string; bcontent?: string;
  bWriter?: string; bwriter?: string;
  category?: string; bCategory?: string; type2?: string; group?: string; section?: string; cat?: string;

  // 서버마다 다른 보드 타입 키들
  boardType?: string; type?: string; bType?: string; board?: string; type1?: string;
};

/* ====== 인증 유틸 ====== */
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
/* ======================= */

// 보드 타입 판별(FQA만 허용)
function pickBoardType(r: Partial<ReadOne>): string {
  const v = r.boardType ?? r.type ?? r.bType ?? r.board ?? r.type1 ?? '';
  return String(v || '').trim().toUpperCase().replace(/\s+/g, '');
}
function isFAQType(v: string): boolean {
  const s = (v || '').toUpperCase().replace(/\s+/g, '');
  return s === 'FAQ' || s.endsWith('FAQ') || s.includes('FAQ');
}

function normalizeToCat(label: string | undefined | null): Cat {
  const s = (label ?? '').toLowerCase();
  if (s.includes('회원') || s.includes('계정') || s.includes('account')) return '회원계정';
  if (s.includes('주문') || s.includes('배송') || s.includes('order') || s.includes('shipping')) return '주문/배송';
  if (s.includes('교환') || s.includes('반품') || s.includes('환불') || s.includes('return') || s.includes('exchange')) return '교환/반품';
  if (s.includes('이용') || s.includes('안내') || s.includes('guide') || s.includes('help')) return '이용안내';
  if ((CATS as readonly string[]).includes(label ?? '')) return (label as Cat);
  return '회원계정';
}

export default function FAQEditPage() {
  const router = useRouter();
  const params = useParams() as { bno?: string; type?: string };
  const bno = params?.bno ?? '';
  const type = (params?.type ?? 'FAQ').toUpperCase();

  // 폼 상태
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>('회원계정');
  const [writer, setWriter] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');

  // 상세 불러오기(관리자)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);
        const url = new URL(`board/readOne/${bno}`, base+'/');
        const resp = await fetch(url.toString(), {
          credentials: 'include',
          headers: { ...authHeaders() },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const r: ReadOne = (json?.result ?? json) as ReadOne;

        if (!alive) return;

        // FAQ만 편집
        const bt = pickBoardType(r);
        if (bt && !isFAQType(bt)) {
          setErrMsg('FAQ 글이 아닙니다.');
          return;
        }

        setTitle(r.bTitle ?? r.btitle ?? '');
        setWriter(r.bWriter ?? r.bwriter ?? '');
        setContent(r.bContent ?? r.bcontent ?? '');
        setCat(
          normalizeToCat(
            r.category ?? r.bCategory ?? r.type2 ?? r.group ?? r.section ?? r.cat
          )
        );
      } catch (e: any) {
        if (!alive) return;
        setErrMsg(e?.message || '상세 로딩 중 오류가 발생했어요.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [bno, base]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !content.trim()) {
      setErrMsg('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrMsg(null);

    try {
      const url = new URL(`board/update/${bno}`, base+'/');
      const payload = {
        bTitle: title,
        bContent: content,
        bWriter: writer,
        boardType: 'FAQ', // 확실히 FAQ로 고정
        category: cat,
        bCategory: cat,
        images: []
      };

      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`수정 실패 (HTTP ${resp.status})\n${text.slice(0, 200)}`);
      }

      router.replace(`/board/FAQ?category=${encodeURIComponent(cat)}`);
    } catch (e: any) {
      setErrMsg(e?.message || '수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className={WRAP}>FAQ 로딩 중…</main>;

  return (
    <main className={WRAP}>
      <header className="faq-head" style={{ textAlign: 'center', marginTop: 20 }}>
        <h1 className="faq-title">FAQ 수정</h1>
        <p className="faq-sub">FAQ 글을 수정합니다.</p>
      </header>

      <form onSubmit={onSubmit} className="faq-form" style={{ maxWidth: 820, margin: '18px auto 40px' }}>
        {/* 제목 */}
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label htmlFor="title" style={{ fontWeight: 700 }}>제목</label>
          <input
            id="title"
            className="faq-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
            style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
          />
        </div>

        {/* 카테고리 */}
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label htmlFor="category" style={{ fontWeight: 700 }}>카테고리</label>
          <select
            id="category"
            className="faq-select"
            value={cat}
            onChange={(e) => setCat(e.target.value as Cat)}
            style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
          >
            {CATS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 작성자 */}
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <label htmlFor="writer" style={{ fontWeight: 700 }}>작성자</label>
          <input
            id="writer"
            className="faq-input"
            value={writer}
            onChange={(e) => setWriter(e.target.value)}
            placeholder="작성자명을 입력하세요"
            style={{ height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 10 }}
          />
        </div>

        {/* 내용 */}
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, alignItems: 'start', marginBottom: 12 }}>
          <label htmlFor="content" style={{ fontWeight: 700, marginTop: 8 }}>글내용</label>
          <textarea
            id="content"
            className="faq-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="FAQ 본문 내용을 입력하세요"
            rows={10}
            required
            style={{ padding: 12, border: '1px solid #ddd', borderRadius: 10, minHeight: 220 }}
          />
        </div>

        {/* 에러 메시지 */}
        {errMsg && (
          <p style={{ color: '#c00', margin: '8px 0 0 120px', whiteSpace: 'pre-wrap' }}>{errMsg}</p>
        )}

        {/* 버튼 영역 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Link href={`/board/FAQ?category=${encodeURIComponent(cat)}`} className="btn-3d btn-white" prefetch={false} style={{ textDecoration: 'none' }}>
            취소
          </Link>
          <button
            type="submit"
            className="btn-3d btn-primary"
            disabled={submitting}
          >
            {submitting ? '수정 중…' : '수정'}
          </button>
        </div>
      </form>
    </main>
  );
}
