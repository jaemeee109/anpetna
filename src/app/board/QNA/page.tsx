'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import Link from 'next/link';

const WRAP = 'mx-auto w-full max-w-[700px] px-4';
const CATS = ['회원계정', '주문/배송', '교환/반품', '이용안내', '기타'] as const;
type Cat = (typeof CATS)[number];

type Row = {
  bno?: number;
  id?: number;
  bTitle?: string; title?: string; btitle?: string;
  bContent?: string; content?: string; bcontent?: string;
  bWriter?: string; writer?: string; bwriter?: string;
  faqCategory?: string;
  category?: string; bCategory?: string; cat?: string; group?: string; section?: string; type2?: string;
  commentCount?: number; commentsCount?: number; replyCount?: number;
};

export default function QnaPage() {
  const [mode, setMode] = useState<'write' | 'mine'>('write');

  // 작성 폼 상태
  const [title, setTitle] = useState('');
  const [cat, setCat] = useState<Cat>('회원계정');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // 목록 상태
  const [data, setData] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  const base =
    process.env.NEXT_PUBLIC_API_BASE ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // QNA 목록 로드 (로그인 안 붙인 상태: 전체 QNA 출력)
  async function loadList() {
    try {
      setLoadingList(true);
      setListErr(null);
      const url = new URL('/anpetna/board/readAll', base);
      url.search = new URLSearchParams({
        page: '1',
        size: '100',
        boardType: 'QNA', // ✅ QNA만
      }).toString();

      const resp = await fetch(url.toString(), {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
    } catch (e: any) {
      setListErr(e?.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    // 진입 시/탭 전환 시 목록 필요하면 로드
    if (mode === 'mine') loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 안전 매핑 (result.dtoList → dtoList → page.dtoList → list)
  const list: Row[] = useMemo(() => {
    const d = data as any;
    const raw =
      d?.result?.dtoList ??
      d?.dtoList ??
      d?.result?.page?.dtoList ??
      d?.page?.dtoList ??
      d?.list ??
      [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  // 등록
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !content.trim()) {
      setErrMsg('제목과 내용을 입력해 주세요.');
      return;
    }

    try {
      setSubmitting(true);
      setErrMsg(null);

      const url = new URL('/anpetna/board/create', base);
      const payload = {
        // 서버에서 받는 필드에 맞춰 전송
        bTitle: title,
        bContent: content,
        bWriter: 'guest',     // 로그인 전 임시값
        boardType: 'QNA',     // ✅ QNA로 저장
        faqCategory: cat,     // ✅ 카테고리는 faqCategory에 저장
        noticeFlag: false,
        isSecret: false,
        images: [],
      };

      const resp = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`등록 실패 (HTTP ${resp.status})\n${text.slice(0, 200)}`);
      }

      // 폼 초기화 & 탭 전환 & 목록 새로고침
      setTitle('');
      setContent('');
      setCat('회원계정');
      setMode('mine');
      await loadList();
      // 상세로 이동하려면 응답 바디에서 bno 받아서 /board/QNA/{bno} 로 이동하면 됨
    } catch (err: any) {
      setErrMsg(err?.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---------- UI ----------
  return (
    <main className={WRAP}>
      <section className="faq-head" style={{ marginTop: 20 }}>
        <h1 className="faq-title">QNA</h1>

        {/* 상단 액션 탭 */}
<div
  className="faq-catbar"
  style={{
    display: 'flex',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center', // ← 가운데 정렬
  }}
>
  <button
    type="button"
    onClick={() => setMode('write')}
    className={`faq-cat ${mode === 'write' ? 'is-active' : ''}`} // ← FAQ처럼 활성 표시
    aria-pressed={mode === 'write'}
  >
    문의하기
  </button>

  <button
    type="button"
    onClick={() => setMode('mine')}
    className={`faq-cat ${mode === 'mine' ? 'is-active' : ''}`} // ← FAQ처럼 활성 표시
    aria-pressed={mode === 'mine'}
  >
    나의 문의내역
  </button>
</div>
      </section>

      {/* 구분선 */}
      <hr className="faq-sep" />

      {/* (1) 문의하기: 작성 폼 */}
      {mode === 'write' && (
        <>
          <form
            onSubmit={onSubmit}
            className="faq-form"
            style={{ maxWidth: 820, margin: '0 auto 24px' }}
          >
            {/* 제목 */}
            <div
              className="form-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <label htmlFor="title" style={{ fontWeight: 700 }}>
                제목
              </label>
              <input
                id="title"
                className="faq-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                required
                style={{
                  height: 40,
                  padding: '0 12px',
                  border: '1px solid #ddd',
                  borderRadius: 10,
                }}
              />
            </div>

            {/* 카테고리 */}
            <div
              className="form-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 12,
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <label htmlFor="category" style={{ fontWeight: 700 }}>
                카테고리
              </label>
              <select
                id="category"
                className="faq-select"
                value={cat}
                onChange={(e) => setCat(e.target.value as Cat)}
                style={{
                  height: 40,
                  padding: '0 12px',
                  border: '1px solid #ddd',
                  borderRadius: 10,
                }}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* 내용 */}
            <div
              className="form-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 12,
                alignItems: 'start',
                marginBottom: 12,
              }}
            >
              <label htmlFor="content" style={{ fontWeight: 700, marginTop: 8 }}>
                내용
              </label>
              <textarea
                id="content"
                className="faq-textarea"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="문의 내용을 입력하세요"
                rows={10}
                required
                style={{
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 10,
                  minHeight: 220,
                }}
              />
            </div>

            {/* 에러 */}
            {errMsg && (
              <p
                style={{
                  color: '#c00',
                  margin: '8px 0 0 120px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {errMsg}
              </p>
            )}

            {/* 등록 버튼 (오른쪽 하단 작게) */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="submit"
                className="btn-3d btn-primary"
                disabled={submitting}
                style={{ fontSize: '0.9rem' }}
              >
                {submitting ? '등록 중…' : '등록'}
              </button>
            </div>
          </form>

          {/* 구분선 */}
          <hr className="faq-sep" />
        </>
      )}

      {/* (2) 나의 문의내역: 목록 */}
      {mode === 'mine' && (
        <>
          {loadingList ? (
            <div>목록 불러오는 중…</div>
          ) : listErr ? (
            <div style={{ color: '#c00' }}>{listErr}</div>
          ) : (
            <section style={{ maxWidth: 900, margin: '0 auto' }}>
              {list.length === 0 ? (
                <div className="faq-empty">등록된 QNA가 없습니다.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {list.map((r, idx) => {
                    const key = r.bno ?? r.id ?? idx;
                    const title = r.bTitle ?? r.title ?? r.btitle ?? '(제목 없음)';
                    const catText =
                      r.faqCategory ??
                      r.bCategory ??
                      r.category ??
                      r.section ??
                      r.group ??
                      r.cat ??
                      r.type2 ??
                      '기타';
                    const cnt = r.commentCount ?? r.commentsCount ?? r.replyCount ?? 0;

                    return (
                      <li key={key} style={{ padding: '10px 0' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          {/* 카테고리 배지 */}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              background: '#eef2f7',
                              color: '#111',
                              padding: '4px 8px',
                              borderRadius: 999,
                            }}
                          >
                            {catText}
                          </span>

                          {/* 제목 (상세로 링크) */}
                          <Link
                            href={`/board/QNA/${key}`}
                            prefetch={false}
                            style={{ textDecoration: 'none', color: '#111', fontWeight: 600 }}
                          >
                            {title}
                          </Link>

                          {/* 댓글 카운트 */}
                          <span style={{ fontSize: 12, color: '#666' }}>({cnt})</span>
                        </div>

                        {/* 항목별 구분선 */}
                        <div className="border-t border-gray-200" style={{ marginTop: 10 }} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
