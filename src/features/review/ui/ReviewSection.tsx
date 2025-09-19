// src/features/review/ui/ReviewSection.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Paw from '@/components/icons/Paw';
import orderApi from '@/features/order/data/order.api';
import { readMemberMe } from '@/features/member/data/member.api';
import { Pagination } from '@/components/layout/Pagination';

/** API 베이스 */
function resolveApiBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    '';
  if (envBase) return envBase.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const guessPort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${guessPort ? `:${guessPort}` : ''}`.replace(/\/+$/, '');
}

/** 토큰 헬퍼 */
function getAccessToken(): string {
  try {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      ''
    ) as string;
  } catch {
    return '';
  }
}
function authHeaders(init?: Record<string, string>, jsonAccept = true): Record<string, string> {
  const headers: Record<string, string> = { ...(init || {}) };
  const token = getAccessToken();
  if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
  if (jsonAccept && !headers['Accept']) headers['Accept'] = 'application/json';
  return headers;
}

/** PageResponseDTO 정규화 (백엔드 값에 맞춤, end/boolean 사용 금지) */
type ReviewRow = {
  reviewId?: number;
  memberId?: string | number;
  writer?: string;
  rating?: number;
  content?: string;
  reviewContent?: string;
  regDate?: string;
  createdAt?: string;
  likeCount?: number;
  imageUrl?: string;
  [k: string]: any;
};
type ReviewPage = {
  totalElements: number; // 총 개수(백엔드 값 사용)
  totalPages: number;    // 총 페이지(백엔드 값 사용)
  pageNumber: number;    // 현재 페이지(1-base로 맞춤)
  pageSize: number;      // 페이지 사이즈
  content: ReviewRow[];
};
function normalizePage(raw: any) {
  const base = raw?.result ?? raw?.data?.result ?? raw?.data ?? raw;

  const dtoList = base?.dtoList ?? base?.content ?? base?.list ?? [];

  const sizeNum = Number(base?.size ?? base?.pageSize ?? 10) || 10;
  const totalNum = Number(base?.total ?? base?.totalElements ?? dtoList.length) || 0;

  // 백엔드 page는 0-base 가능 → 1-base로 보정
  let pageNumber = Number(base?.pageNumber ?? base?.page ?? base?.number ?? 1);
  pageNumber = Number.isFinite(pageNumber) ? pageNumber : 1;
  if (pageNumber <= 0) pageNumber = pageNumber + 1;

  const prev = Boolean(base?.prev);
  const next = Boolean(base?.next);

  return {
    totalElements: totalNum,
    totalPages: Math.max(1, Math.ceil(totalNum / Math.max(1, sizeNum))),
    pageNumber,
    pageSize: sizeNum,
    content: Array.isArray(dtoList) ? dtoList : [],
    prev,
    next,
  } as ReviewPage & { prev?: boolean; next?: boolean };
}

/** 정렬 타입 */
type SortOrder = 'rating' | 'date';
type SortDirection = 'ASCENDING' | 'DESCENDING';
type CombinedSort = 'date,desc' | 'date,asc' | 'rating,desc' | 'rating,asc';

const SORTS: ReadonlyArray<{ label: string; value: CombinedSort }> = [
  { label: '최신순', value: 'date,desc' },
  { label: '등록일순', value: 'date,asc' },
  { label: '평점높은순', value: 'rating,desc' },
  { label: '평점낮은순', value: 'rating,asc' },
];

/** 주문 상세에서 쓰는 타입(필요 필드만) */
type OrdersDetail = {
  ordersId: number;
  status?: string | null;
  ordersItems?: Array<{ itemId?: number }>;
};

/** 컴포넌트 */
export default function ReviewSection({ itemId }: { itemId: number }) {
  const base = resolveApiBase();

  const [order, setOrder] = useState<SortOrder>('date');
  const [direction, setDirection] = useState<SortDirection>('DESCENDING');
  const [page, setPage] = useState(1);
  const [size] = useState(5);

  const [data, setData] = useState<ReviewPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 로그인/권한
  const token = getAccessToken();
  const isLoggedIn = !!token;
  const [myId, setMyId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  /** 내 정보 조회 */
  useEffect(() => {
    (async () => {
      try {
        if (!isLoggedIn) {
          setMyId('');
          setIsAdmin(false);
          return;
        }
        const me: any = await readMemberMe();
        const mine =
          (me?.memberId ?? me?.id ?? me?.memberNo ?? me?.username ?? me?.userId ?? '') + '';
        setMyId(mine);
        const roleRaw = (me?.role ?? me?.memberRole ?? me?.authorities ?? '')
          .toString()
          .toUpperCase();
        setIsAdmin(roleRaw.includes('ADMIN'));
      } catch {
        setMyId('');
        setIsAdmin(false);
      }
    })();
  }, [isLoggedIn, itemId]);

  /** 정렬 */
  const combinedSort: CombinedSort =
    `${order},${direction === 'DESCENDING' ? 'desc' : 'asc'}` as CombinedSort;
  function onChangeSort(v: CombinedSort) {
    const [o, d] = v.split(',') as ['date' | 'rating', 'asc' | 'desc'];
    setOrder(o);
    setDirection(d === 'asc' ? 'ASCENDING' : 'DESCENDING');
    setPage(1);
  }

  const query = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set('order', order);
    usp.set('direction', direction);
    usp.set('page', String(page));
    usp.set('size', String(size));
    return usp.toString();
  }, [order, direction, page, size]);

  /** 목록 로드 */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await fetch(`${base}/item/${itemId}/review?${query}`, {
          method: 'GET',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          credentials: 'include',
        });
        const j = await r.clone().json().catch(() => null as any);
        if (!r.ok) throw new Error(j?.message || j?.resMessage || `조회 실패 (${r.status})`);
        const pageData = normalizePage(j);
        if (alive) setData(pageData);
      } catch (e: any) {
        if (alive) setErr(e?.message || '리뷰를 불러오지 못했습니다.');
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [base, itemId, query]);

  const totalPages = data?.totalPages ?? 1;
  const list = data?.content ?? [];

  /* =========================
     ▶ 리뷰 등록 노출 조건
     ========================= */
  const [canWrite, setCanWrite] = useState(false);
  const [targetOrdersId, setTargetOrdersId] = useState<number | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!myId) { setCanWrite(false); setTargetOrdersId(null); return; }
      try {
        const page0: any = await (orderApi as any).summaryByMember(myId, { page: 0, size: 50 });
        const lines: Array<{ ordersId: number; status?: string | null }> = page0?.content ?? [];
        const candidates = lines.filter((l) => String(l.status ?? '').toUpperCase() === 'CONFIRMATION');
        for (const row of candidates) {
          if (stop) return;
          const resp = await fetch(`${base}/order/${row.ordersId}`, {
            headers: authHeaders(),
            credentials: 'include',
          });
          const j = await resp.clone().json().catch(() => null as any);
          const payload: OrdersDetail = (j?.result ?? j ?? {}) as OrdersDetail;
          const items = payload?.ordersItems ?? [];
          const hasItem = items.some((it) => Number(it?.itemId ?? 0) === Number(itemId));
          if (hasItem) {
            if (!stop) {
              setCanWrite(true);
              setTargetOrdersId(Number(row.ordersId));
            }
            return;
          }
        }
        if (!stop) { setCanWrite(false); setTargetOrdersId(null); }
      } catch {
        if (!stop) { setCanWrite(false); setTargetOrdersId(null); }
      }
    })();
    return () => { stop = true; };
  }, [myId, itemId, base]);

  /* =========================
     ▶ 리뷰 등록 폼 (모달)
     ========================= */
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const openForm = () => { setShowForm(true); };
  const closeForm = () => {
    setShowForm(false);
    setRating(5);
    setContent('');
    setFile(null);
    setPreview('');
  };
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f || null);
    if (f) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview('');
    }
  }
  async function onSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!targetOrdersId) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('json', new Blob([JSON.stringify({ rating, content, ordersId: targetOrdersId })], { type: 'application/json' }));
      if (file) fd.append('image', file);

      const resp = await fetch(`${base}/item/${itemId}/review`, {
        method: 'POST',
        headers: authHeaders({}, false /* Accept만 */),
        body: fd,
        credentials: 'include',
      });
      const j = await resp.clone().json().catch(() => null as any);
      if (!resp.ok) throw new Error(j?.message || j?.resMessage || `등록 실패 (${resp.status})`);

      closeForm();
      setPage(1);
    } catch (e: any) {
      alert(e?.message || '리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="px-2 py-4">
      <div className="flex items-center justify-between mb-3">
        {/* 왼쪽: 제목 + 버튼(형제 요소) */}
        <div className="flex items-center gap-2">
          <h3 className="review-title flex items-center gap-2">
            <span>Review&nbsp;</span>
            <Paw className="w-[18px] h-[18px]" />&nbsp;
          </h3>

          {canWrite && (
            <button
              type="button"
              className="btn"
              onClick={openForm}
              aria-label="리뷰 등록"
            >
              리뷰 등록
            </button>
          )}
        </div>

        {/* 오른쪽: 정렬 드롭다운 */}
        <div className="review-sortbar flex justify-end">
          <select
            className="dropdown sort-select"
            value={combinedSort}
            onChange={(e) => onChangeSort(e.target.value as CombinedSort)}
            aria-label="정렬 옵션"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p>불러오는 중…</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : !data || list.length === 0 ? (
        <div className="text-[15px] text-center py-10 mt-[40px] mb-[60px]" style={{ color: '#797979ff' }}>
          리뷰가 없습니다
        </div>
      ) : (
        <ul className="review-list">
          {list.map((row) => {
            const id = Number(row.reviewId ?? 0);
            const rawWriter = (row.writer ?? row.memberId ?? '').toString();
            const writer =
              rawWriter.length > 2
                ? rawWriter.slice(0, 2) + '*'.repeat(rawWriter.length - 2)
                : rawWriter;

            const rawWhen = row.regDate ?? row.createdAt ?? '';
            let when = '';
            if (rawWhen) {
              const d = new Date(rawWhen);
              when = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                d.getDate()
              ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
                d.getMinutes()
              ).padStart(2, '0')}`;
            }

            const stars = Math.max(1, Math.min(5, Number(row.rating ?? 5)));
            const text = (row.reviewContent ?? row.content ?? '').toString();

            let img = row.imageUrl as string | undefined;
            if (img) {
              if (img.startsWith('/')) img = `${base}${img}`;
              else if (!/^https?:\/\//i.test(img)) img = `${base}/${img.replace(/^\/+/, '')}`;
            }

            return (
              <li key={id} className="apn-card p-4 mb-3">
                <div className="writer">{writer}</div>

                {/* 평점(리스트) */}
                <div className="meta-row">
                  <div className="rating-badge">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span
                        key={i}
                        className={`paw-icon ${i < stars ? 'paw--filled' : 'paw--empty'}`}
                        aria-hidden="true"
                      >
                        <Paw />
                      </span>
                    ))}
                  </div>
                  <div className="date">{when}</div>
                </div>

                <div className="grid grid-cols-[130px_1fr] gap-4 mt-2">
                  <div>
                    {img ? (
                      <a href={img} target="_blank" rel="noopener noreferrer" title="원본 보기">
                        <img src={img} alt="리뷰 이미지" className="review-img" width={130} height={170} />
                      </a>
                    ) : (
                      <div className="review-img review-img--empty" />
                    )}
                  </div>
                  <div>
                    <p className="review-content whitespace-pre-wrap leading-6">{text}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(data && (data.totalPages > 1 || (data as any).prev || (data as any).next)) ? (
        <Pagination
          className="mt-6"
          current={page}
          total={data.totalElements}
          size={size}
          onPage={(p) => setPage(p)}
        />
      ) : null}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <button type="button" className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            다음
          </button>
        </div>
      )}

      {/* ▶ 리뷰 작성 모달 */}
      {showForm && (
        <div className="rv-modal">
          <div className="rv-modal__backdrop" onClick={submitting ? undefined : closeForm} />
          <div className="rv-modal__panel apn-card">
            <h4 className="rv-modal__title ml-[5px]"> New Review</h4>

            <form onSubmit={onSubmitReview}>
              {/* 평점(모달) — 5개 전체를 하나의 둥근 테두리로 감쌈 */}
              <div className="rv-field">
                <div className="rv-label mt-[30px] "> 원하는 점수까지 발바닥을 눌러 선택합니다</div>
                <div className="rv-stars mt-[5px] ">
                  {Array.from({ length: 5 }, (_, i) => {
                    const filled = i < rating;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`paw-icon ${filled ? 'paw--filled' : 'paw--empty'}`}
                        onClick={() => setRating(i + 1)}
                        aria-label={`${i + 1}점`}
                      >
                        <Paw />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 사진첨부 + 미리보기 */}
              <div className="rv-field">
                <div className="rv-label  mt-[25px] ">사진</div>
                <input className="rv-file mt-[5px]" type="file" accept="image/*" onChange={onPickFile} />
                {preview && (
                  <div className="rv-preview ml-[10px]">
                    <img src={preview} alt="미리보기" />
                  </div>
                )}
              </div>

              {/* 내용 */}
              <div className="rv-field">
                <div className="rv-label mt-[35px] ">내용</div>
                <textarea
                  className="rv-textarea mt-[7px] "
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  placeholder="리뷰 내용을 입력하세요."
                  required
                />
              </div>

              <div className="rv-actions mr-[50px]">
                 <button type="submit" className="btn" disabled={submitting || !targetOrdersId}>
                  {submitting ? '등록 중…' : '등록하기'}
                </button>
                <button type="button" className="btn" onClick={closeForm} disabled={submitting}>취소</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
  /* ==== (제목) Review 타이틀 ==== */
  .review-title {
    font-weight: 500;
    font-size: 20px;
    letter-spacing: 0.03em;
    color: #111827;
    line-height: 1.2;
  }

  /* ==== 정렬 드롭다운 ==== */
  .dropdown.sort-select {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 8px;
  }

  /* ==== 카드 컨테이너 ==== */
  .apn-card {
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius:16px;
    box-shadow:0 2px 0 rgba(0,0,0,0.06);
  }

  /* ==== 작성자 영역 ==== */
  .writer {
    font-weight:600;
    font-size:18px;
    color:#111827;
    margin-top:25px;
    margin-left:30px;
    letter-spacing:0.1em;
  }

  /* ==== 메타(평점+날짜) 묶음 ==== */
  .meta-row {
    margin-top:10px;
    margin-left:25px;
    display:block;
    letter-spacing:0.1em;
  }

  /* ==== 평점 배지(리스트용) ==== */
  .rating-badge {
    display:inline-flex;
    align-items:center;
    gap:4px;
    padding:2px 8px;
    border:1px solid #e5e7eb;
    border-radius:9999px;
    background:#fff;
    line-height:1;
  }

  /* ==== 날짜 텍스트 ==== */
  .date {
    font-size:13px;
    color:#6b7280;
    margin-top:6px;
    display:block;
  }

  /* ==== Paw 아이콘 공통 크기(리스트/기본) ==== */
  .paw-icon { width:16px; height:16px; display:inline-block; line-height:0; }
  .paw-icon :global(svg) { width:16px; height:16px; display:inline-block; }

  /* ==== Paw 색상(채움/미채움) ==== */
  .paw-icon.paw--filled :global(path),
  .paw-icon.paw--filled :global(circle),
  .paw-icon.paw--filled :global(ellipse) {
    fill:#f59e0b;
    stroke:#f59e0b;
    stroke-width:1.5;
  }
  .paw-icon.paw--empty :global(path),
  .paw-icon.paw--empty :global(circle),
  .paw-icon.paw--empty :global(ellipse) {
    fill:#d1d5db;
    stroke:#d1d5db;
    stroke-width:1.5;
  }

  /* ==== 리뷰 이미지 ==== */
  .review-img {
    width:130px; height:170px;
    object-fit:cover;
    border-radius:8px;
    border:1px solid #e5e7eb;
    background:#f9fafb;
    display:block; margin:15px 0 25px 25px;
  }
  .review-img--empty {
    width:130px; height:170px;
    border:1px dashed #e5e7eb;
    border-radius:8px; background:#fafafa;
  }

  /* ==== 리뷰 본문 텍스트 ==== */
  .review-content {
    font-size:16px; color:#111827; line-height:1.5; letter-spacing:0.02em; margin-left:50px;
  }

  /* ==== 리뷰 리스트(불릿 제거) ==== */
  .review-list { list-style:none; padding-left:0; margin:0; }
  .review-list > li { list-style:none; }
  .review-list > li::marker { content:''; }

  /* =========================================================
     (모달) 반응형 제거 + 세부 조절용 CSS 변수
     ========================================================= */
  .rv-modal {
    /* 모달 패널 크기 */
    --rv-modal-width: 600px;     /* 가로 */
    --rv-modal-height: 620px;    /* 세로 */
    --rv-panel-padding: 16px;    /* 내부 여백 */
    --rv-panel-margin-top: 80px; /* 화면 상단에서 떨어진 거리 */

    /* 폰트 */
    --rv-title-size: 18px;
    --rv-label-size: 14px;
    --rv-body-font-size: 14px;

    /* ===== 평점(5개 전체 필) ===== */
    --rv-star-size: 24px;          /* 발바닥 아이콘 크기 */
    --rv-stars-gap: 10px;          /* 아이콘 간격 */
    --rv-stars-pad-y: 8px;         /* 필 상하 패딩 */
    --rv-stars-pad-x: 14px;        /* 필 좌우 패딩 */
    --rv-stars-border: #e5e7eb;    /* 필 테두리 색 */
    --rv-stars-border-width: 1.5px;/* 필 테두리 두께 */
    --rv-stars-bg: transparent;    /* 배경 제거(투명). 흰 배경 원하면 #fff */

    /* 파일 미리보기 (고정 크기) */
    --rv-preview-w: 220px;
    --rv-preview-h: 220px;
    --rv-preview-radius: 8px;
    --rv-preview-border: #e5e7eb;

    /* 내용 입력 박스 (고정 크기) */
    --rv-textarea-w: 520px;  /* % 대신 px로 고정해도 됩니다 */
    --rv-textarea-h: 200px;
    --rv-textarea-radius: 8px;
    --rv-textarea-border: #e5e7eb;
    --rv-textarea-padding: 10px;
    --rv-textarea-resize: none;

    /* 액션버튼 간격 */
    --rv-actions-gap: 8px;
    --rv-actions-top: 14px;
  }

  /* 모달 루트/배경/패널 */
  .rv-modal { position: fixed; inset: 0; z-index: 50; }
  .rv-modal__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.35); }
  .rv-modal__panel {
    position: relative; z-index: 1;
    width: var(--rv-modal-width);
    height: var(--rv-modal-height);
    max-width: none;
    margin: var(--rv-panel-margin-top) auto 0;
    padding: var(--rv-panel-padding);
    overflow: auto;
  }

  .rv-modal__title { font-weight:700; font-size:var(--rv-title-size); margin-bottom:12px; }
  .rv-field { margin: 10px 0; font-size: var(--rv-body-font-size); }
  .rv-label { font-size: var(--rv-label-size); font-weight:600; margin-bottom:6px; }

  /* ===== 평점(모달) — 5개 전체를 하나의 둥근 필로 감싸기 ===== */
  .rv-stars {
    display: inline-flex;
    align-items: center;
    gap: var(--rv-stars-gap);
    padding: var(--rv-stars-pad-y) var(--rv-stars-pad-x);
    border: var(--rv-stars-border-width) solid var(--rv-stars-border);
    border-radius: 9999px;          /* 완전 둥근 필 */
    background: var(--rv-stars-bg);
    line-height: 1;
  }
  .rv-stars .paw-icon {
    width: var(--rv-star-size);
    height: var(--rv-star-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 0;            /* 개별 링 제거 */
    padding: 0;
    cursor: pointer;
  }
  .rv-stars .paw-icon :global(svg) {
    width: var(--rv-star-size);
    height: var(--rv-star-size);
  }

  /* 파일 인풋(기본 유지) */
  .rv-file { }

  /* 미리보기 — 고정 크기 */
  .rv-preview img {
    width: var(--rv-preview-w);
    height: var(--rv-preview-h);
    object-fit: cover;
    border: 1px solid var(--rv-preview-border);
    border-radius: var(--rv-preview-radius);
    margin-top: 8px;
  }

  /* 텍스트영역 — 고정 크기 */
  .rv-textarea {
    width: var(--rv-textarea-w);
    height: var(--rv-textarea-h);
    border: 1px solid var(--rv-textarea-border);
    border-radius: var(--rv-textarea-radius);
    padding: var(--rv-textarea-padding);
    resize: var(--rv-textarea-resize);
    font-size: var(--rv-body-font-size);
  }

  /* 액션 버튼 영역 */
  .rv-actions { 
  display:flex; justify-content:flex-end; 
  gap:var(--rv-actions-gap); 
  margin-top:var(--rv-actions-top); }


  /* ===== 모달 안 내용(타이틀 + 폼 + 버튼 영역)만 정확히 가운데 정렬 ===== */

/* 1) 모달 내부 컨텐트 고정폭(패널 600px, 패딩 16px*2 => 최대 568px 이하로 설정) */
.rv-modal { 
  --rv-inner-width: 540px; /* 필요하면 560~568px 사이에서 조절 */
}

/* 2) 타이틀과 폼(내용 전체)을 같은 폭으로 잡고 좌우 auto로 가운데 배치 */
.rv-modal__title,
.rv-modal__panel form {
  width: var(--rv-inner-width);
  margin-left: auto !important;
  margin-right: auto !important;
}

/* 3) 버튼 영역도 같은 폭으로 맞추고, 기존 flex-end 정렬은 유지(오른쪽 끝에 붙음) */
.rv-actions {
  width: var(--rv-inner-width);
  margin-left: auto !important;
  margin-right: auto !important;
}

/* 4) 네가 넣어둔 mr-[50px] 때문에 왼쪽으로 치우치던 것 강제 해제 */
.rv-actions { margin-right: auto !important; } /* 좌우 auto로 정확히 가운데 */



`}</style>

      {/* 버튼 스타일: 흰 배경 + 회색 둥근 테두리 (기존과 동일) */}
      <style jsx>{`
  .btn {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 6px 10px;
    background: #fff;
  }



`}</style>

    </section>
  );
}
