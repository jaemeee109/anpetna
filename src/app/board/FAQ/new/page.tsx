'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내'] as const;
type Cat = (typeof CATS)[number];

export default function FAQNewPage() {
  const router = useRouter();
  const sp = useSearchParams();


  // 토큰을 Authorization 헤더로 붙여주는 초소형 헬퍼
function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('accessToken') || // 프로젝트에서 저장한 키 이름에 맞춰 조정
    sessionStorage.getItem('accessToken') ||
    '';
  return token ? { Authorization: `Bearer ${token}` } : {};
}

  // 쿼리로 넘어온 카테고리 기본 선택 (없으면 회원계정)
  const initialCat = useMemo<Cat>(() => {
    const q = (sp.get('category') || '').trim();
    const hit = CATS.find((c) => c === q);
    return hit || '회원계정';
  }, [sp]);

  // 폼 상태
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>(initialCat);
  const [writer, setWriter] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // 베이스 URL (리라이트 쓰면 자동 프록시됨)
  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // 전송
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // 간단 검증
    if (!title.trim() || !content.trim()) {
      setErrMsg('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setErrMsg(null);

    try {
      // ✅ 실제 등록 엔드포인트로 변경
    const url = new URL('/board/create', base);

      // ✅ 서버 DTO에 맞춰 필드 정리
      const payload = {
        bTitle: title,
        bContent: content,
        bWriter: writer,
        boardType: 'FAQ',      // enum 대문자
        noticeFlag: false,
        isSecret: false,
        faqCategory: cat,      // DB 칼럼
        images: [],            // 이미지 없으면 빈 배열
      };

      // 백엔드가 @RequestPart("json")로 받으므로 JSON을 Blob으로 감싸서 넣음
const fd = new FormData();
fd.append('json', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

    const resp = await fetch(url.toString(), {
  method: 'POST',
  // Authorization을 자동으로 붙이는 기존 util을 사용 (★ Content-Type 수동 지정 금지!)
  headers: authHeaders(), 
  body: fd,
});

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`등록 실패 (HTTP ${resp.status})\n${text.slice(0, 200)}`);
      }

      // ✅ 성공 → 선택 카테고리 유지한 채 목록으로
      router.replace(`/board/FAQ?category=${encodeURIComponent(cat)}`);
    } catch (err: any) {
      setErrMsg(err?.message || '등록 중 오류가 발생했습니다.');
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
