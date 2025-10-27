'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w.full max-w-[960px] px-4'.replace('.','-'); // 클래스 그대로 유지
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내'] as const;
type Cat = (typeof CATS)[number];

export default function FAQNewPage() {
  const router = useRouter();
  const sp = useSearchParams();

  function authHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const initialCat = useMemo<Cat>(() => {
    const q = (sp.get('category') || '').trim();
    const hit = CATS.find((c) => c === q);
    return hit || '회원계정';
  }, [sp]);

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>(initialCat);
  const [writer, setWriter] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    try {
      const id = localStorage.getItem('memberId') || sessionStorage.getItem('memberId') || '';
      const role = (localStorage.getItem('memberRole') || sessionStorage.getItem('memberRole') || '').toLowerCase();
      if (id) setWriter(id);
      setIsAdmin(role === 'admin');
    } catch {}
  }, []);

  async function postWithFallback(fd: FormData): Promise<Response> {
    const r1 = await fetch(new URL('board/create', base+'/'), {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: fd,
    });
    if (r1.ok || r1.status !== 404) return r1;

    const json = JSON.parse((fd.get('json') as Blob) ? await (fd.get('json') as Blob).text() : '{}');
    const r2 = await fetch(new URL('board', base+'/'), {
      method: 'POST',
      credentials: 'include',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
    });
    return r2;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // 관리자만 허용 (프론트에서 1차 차단)
    if (!isAdmin) {
      setErrMsg('FAQ 글은 관리자만 등록할 수 있습니다.');
      alert('FAQ 글은 관리자만 등록할 수 있습니다.');
      return;
    }

    if (!title?.trim() || !content?.trim()) {
      setErrMsg('제목과 내용을 입력해주세요.');
      return;
    }

    const hasToken = !!(localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'));
    if (!hasToken) {
      setErrMsg('로그인이 필요합니다. 관리자 계정으로 로그인 후 다시 시도하세요.');
      alert('로그인이 필요합니다. 관리자 계정으로 로그인 후 다시 시도하세요.');
      return;
    }

    setErrMsg(null);
    setSubmitting(true);

    try {
      const writerToSend =
        writer ||
        (localStorage.getItem('memberId') || sessionStorage.getItem('memberId') || '');

      const fd = new FormData();
      fd.append(
        'json',
        new Blob(
          [
            JSON.stringify({
              bTitle: title,
              bContent: content,
              bWriter: writerToSend,
              boardType: 'FAQ',
              noticeFlag: false,
              isSecret: false,
              category: cat,
              images: [],
            }),
          ],
          { type: 'application/json' }
        ),
        'payload.json'
      );

      const resp = await postWithFallback(fd);

      if (!resp.ok) {
        if (resp.status === 401) throw new Error('로그인이 필요합니다.');
        if (resp.status === 403) throw new Error('FAQ 글은 관리자만 등록할 수 있습니다.');
        const text = await resp.text().catch(() => '');
        throw new Error(`작성 실패 (HTTP ${resp.status})${text ? `\n${text.slice(0,200)}`:''}`);
      }

      alert('등록되었습니다.');
      router.replace(`/board/FAQ?category=${encodeURIComponent(cat)}&page=1`);
    } catch (e:any) {
      setErrMsg(e?.message || '작성 처리 중 오류가 발생했습니다.');
      alert(e?.message || '작성 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={WRAP}>
      <header className="faq-head" style={{ textAlign: 'center', marginTop: 20 }}>
        <h1 className="faq-title">FAQ 등록</h1>
        <p className="faq-sub">FAQ 새 글을 작성합니다.</p>
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
            style={{ height: 40, padding: '0 12px', border: '1px solid {#ddd}', borderRadius: 10 } as any}
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

        {errMsg && (
          <p style={{ color: '#c00', margin: '8px 0 0 120px', whiteSpace: 'pre-wrap' }}>{errMsg}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Link
            href={`/board/FAQ?category=${encodeURIComponent(cat)}`}
            className="btn-3d btn-white"
            prefetch={false}
            style={{ textDecoration: 'none' }}
          >
            취소
          </Link>
          <button
            type="submit"
            className="btn-3d btn-primary"
            disabled={submitting}
          >
            {submitting ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </main>
  );
}
