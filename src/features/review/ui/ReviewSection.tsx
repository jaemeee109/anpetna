//src/features/review/ui/ReviewSection.tsx
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

/** PageResponseDTO 정규화 */
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
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
  content: ReviewRow[];
};
function normalizePage(raw: any) {
  const base = raw?.result ?? raw?.data?.result ?? raw?.data ?? raw;
  const dtoList = base?.dtoList ?? base?.content ?? base?.list ?? [];
  const sizeNum = Number(base?.size ?? base?.pageSize ?? 10) || 10;
  const totalNum = Number(base?.total ?? base?.totalElements ?? dtoList.length) || 0;
  let pageNumber = Number(base?.pageNumber ?? base?.page ?? base?.number ?? 1);
  pageNumber = Number.isFinite(pageNumber) ? pageNumber : 1;
  if (pageNumber <= 0) pageNumber = pageNumber + 1;

  const prev = Boolean(base?.prev);
  const next = Boolean(base?.next);

  return {
    totalElements: totalNum,
    totalPages: Math.max(1, Math.ceil(totalNum / Math.max(1, sizeNum)) ),
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

  const list = data?.content ?? [];

  /* =========================
     ▶ 리뷰 등록 노출 조건
     ========================= */
  const [canWrite, setCanWrite] = useState(false);
  const [targetOrdersId, setTargetOrdersId] = useState<number | null>(null);

  // 주문 기준으로 등록 가능 여부 계산
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

  // ✅ 내 리뷰 존재여부를 서버 페이징 전체를 훑어 확인
  async function alreadyWroteForItem(): Promise<boolean> {
    if (!myId) return false; // 로그인 안 된 경우엔 여기서 false (버튼 클릭시 별도 경고는 너의 기존 정책 유지)
    let p = 1;
    const sizeCheck = 50; // 한 번에 50개씩
    while (true) {
      const usp = new URLSearchParams();
      usp.set('order', 'date');
      usp.set('direction', 'DESCENDING');
      usp.set('page', String(p));
      usp.set('size', String(sizeCheck));

      const resp = await fetch(`${base}/item/${itemId}/review?${usp.toString()}`, {
        method: 'GET',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      });

      const j = await resp.clone().json().catch(() => null as any);
      if (!resp.ok) {
        throw new Error(j?.message || j?.resMessage || `리뷰 목록 조회 실패 (${resp.status})`);
      }

      const pageData = normalizePage(j);
      const pageList = pageData?.content ?? [];
      const mineExists = pageList.some(
        (r: any) => String(r.memberId ?? r.writer ?? '') === String(myId)
      );
      if (mineExists) return true;

      const hasNext = Boolean((pageData as any)?.next);
      if (!hasNext) return false;
      p += 1;
    }
  }

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
    setPreview(f ? URL.createObjectURL(f) : '');
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
      setCanWrite(false);
    } catch (e: any) {
      alert(e?.message || '리뷰 등록에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  /* =========================
     ▶ 리뷰 수정 폼 (모달) — 평점/사진/본문 모두 수정 + 이미지 삭제 가능
     ========================= */
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editContent, setEditContent] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string>('');
  const [editRemoveImage, setEditRemoveImage] = useState<boolean>(false); // 이미지 삭제 플래그
  const [editing, setEditing] = useState(false);

  function openEditModal(row: ReviewRow) {
    const stars = Math.max(1, Math.min(5, Number(row.rating ?? 5)));
    const text = (row.reviewContent ?? row.content ?? '').toString();
    let img = row.imageUrl as string | undefined;
    if (img) {
      if (img.startsWith('/')) img = `${base}${img}`;
      else if (!/^https?:\/\//i.test(img)) img = `${base}/${img.replace(/^\/+/, '')}`;
    }
    setEditId(Number(row.reviewId ?? 0));
    setEditRating(stars);
    setEditContent(text);
    setEditFile(null);
    setEditPreview(img || '');
    setEditRemoveImage(false); // 열 때 항상 false
    setEditOpen(true);
  }
  function closeEditModal() {
    setEditOpen(false);
    setEditId(null);
    setEditRating(5);
    setEditContent('');
    setEditFile(null);
    setEditPreview('');
    setEditRemoveImage(false);
  }
  function onPickEditFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setEditFile(f || null);
    setEditPreview(f ? URL.createObjectURL(f) : editPreview);
    if (f) setEditRemoveImage(false); // 새 파일 선택 시 삭제 플래그 해제
  }
  // 이미지 삭제 버튼 동작
  function onRemoveExistingImage() {
    setEditFile(null);
    setEditPreview('');        // 미리보기 제거
    setEditRemoveImage(true);  // 삭제 플래그 ON
  }

  async function onSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditing(true);
    try {
      const fd = new FormData();

      // ✅ 백엔드에 reviewId 포함(+ 이미지 삭제 플래그 같이 보냄)
      const payload: any = {
        reviewId: Number(editId),
        content: editContent,
        rating: editRating,
      };
      if (editRemoveImage) {
        payload.removeImage = true; // ← 삭제 의사 (백엔드 반영 필요)
      }
      fd.append('json', new Blob([JSON.stringify(payload)], { type: 'application/json' }));

      // 새 이미지를 올리는 경우에만 image 파트 포함
      if (editFile) fd.append('image', editFile);

      const resp = await fetch(`${base}/item/${itemId}/review/${editId}`, {
        method: 'PUT',
        headers: authHeaders({}, false), // Accept만
        body: fd,
        credentials: 'include',
      });
      const j = await resp.clone().json().catch(() => null as any);
      if (!resp.ok) throw new Error(j?.message || j?.resMessage || `수정 실패 (${resp.status})`);

      closeEditModal();
      setPage(1);
    } catch (e: any) {
      alert(e?.message || '수정에 실패했습니다.');
    } finally {
      setEditing(false);
    }
  }

  // 삭제 (기존 로직 유지)
  async function onDelete(reviewId: number) {
    if (!reviewId) return;
    if (!confirm('이 리뷰를 삭제하시겠습니까?')) return;
    try {
      const resp = await fetch(`${base}/item/${itemId}/review/${reviewId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
      });
      if (!resp.ok) {
        const j = await resp.clone().json().catch(() => null as any);
        throw new Error(j?.message || j?.resMessage || `삭제 실패 (${resp.status})`);
      }
      setPage(1);
    } catch (e: any) {
      alert(e?.message || '삭제에 실패했습니다.');
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

          {isLoggedIn && canWrite ? (
  <button
    type="button"
    className="btn"
    onClick={async () => {
      try {
        const wrote = await alreadyWroteForItem();
        if (wrote) {
          alert('이미 리뷰를 작성하셨습니다.');
          return;
        }
        if (!canWrite || !targetOrdersId) {
          alert('구매확정된 주문이 없거나, 해당 주문에 이 상품이 포함되어 있지 않습니다.');
          return;
        }
        openForm();
      } catch (e: any) {
        alert(e?.message || '리뷰 작성 가능 여부 확인 중 오류가 발생했습니다.');
      }
    }}
    aria-label="리뷰 등록"
  >
    리뷰 등록
  </button>
) : null}

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

            // 이미지 URL 정규화
            let img = row.imageUrl as string | undefined;
            if (img) {
              if (img.startsWith('/')) img = `${base}${img}`;
              else if (!/^https?:\/\//i.test(img)) img = `${base}/${img.replace(/^\/+/, '')}`;
            }

            const isOwner = myId && (String(row.memberId ?? row.writer ?? '') === String(myId));
            const hasImg = !!img;

            return (
              <li key={id} className={`apn-card p-4 mb-3 ${!hasImg ? 'rv-textonly' : ''}`}>
                {/* ── 카드 상단: 작성자(좌) + 액션(우) ── */}
                <div className="rv-toprow">
                  <div className="writer">{writer}</div>
                  <div className="rv-actions-top mt-[10px] mr-[10px]">
                    {isOwner && (
                      <>
                        <button className="btn" onClick={() => openEditModal(row)}>수정</button>
                        <button className="btn" onClick={() => onDelete(id)}>삭제</button>
                      </>
                    )}
                    {!isOwner && isAdmin && (
                      <button className="btn" onClick={() => onDelete(id)}>삭제</button>
                    )}
                  </div>
                </div>

                {/* 평점 + 날짜 */}
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

                {/* (3) 사진 없는 리뷰: 왼쪽 칼럼 제거 */}
                <div
                  className="grid gap-4 mt-2"
                  style={{ gridTemplateColumns: hasImg ? '130px 1fr' : '1fr' }}
                >
                  {hasImg ? (
                    <div>
                      <a href={img} target="_blank" rel="noopener noreferrer" title="원본 보기">
                        <img src={img!} alt="리뷰 이미지" className="review-img" width={130} height={170} />
                      </a>
                    </div>
                  ) : null}
                  <div>
                    <p className={`review-content whitespace-pre-wrap leading-6 ${!hasImg ? 'rv-textonly__content' : ''}`}>
                      {text}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* (1) 페이지네이션: 1개만 표시 + "버튼 자체" 흰바탕/회색테두리/3D 느낌 */}
      {(data && (data.totalPages > 1 || (data as any).prev || (data as any).next)) ? (
        <div className="rv-paging-wrap">
          <div className="rv-paging">
            <Pagination
              className="rv-paging__inner"
              current={page}
              total={data.totalElements}
              size={size}
              onPage={(p) => setPage(p)}
            />
          </div>
        </div>
      ) : null}

      {/* ▶ 리뷰 작성 모달 */}
      {showForm && (
        <div className="rv-modal">
          <div className="rv-modal__backdrop" onClick={submitting ? undefined : closeForm} />
          <div className="rv-modal__panel apn-card">
            <h4 className="rv-modal__title ml-[5px]"> New Review</h4>

            <form onSubmit={onSubmitReview}>
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

              <div className="rv-field">
                <div className="rv-label  mt-[25px] ">사진</div>
                <input className="rv-file mt-[5px]" type="file" accept="image/*" onChange={onPickFile} />
                {preview && (
                  <div className="rv-preview ml-[10px]">
                    <img src={preview} alt="미리보기" />
                  </div>
                )}
              </div>

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

      {/* ▶ 리뷰 수정 모달 (평점/사진/본문 모두 수정 가능) */}
      {editOpen && (
        <div className="rv-modal">
          <div className="rv-modal__backdrop" onClick={editing ? undefined : closeEditModal} />
          <div className="rv-modal__panel apn-card">
            <h4 className="rv-modal__title ml-[5px]"> Edit Review</h4>

            <form onSubmit={onSubmitEdit}>
              <div className="rv-field">
                <div className="rv-label mt-[30px] ">원하는 점수까지 발바닥을 눌러 선택합니다</div>
                <div className="rv-stars mt-[5px] ">
                  {Array.from({ length: 5 }, (_, i) => {
                    const filled = i < editRating;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`paw-icon ${filled ? 'paw--filled' : 'paw--empty'}`}
                        onClick={() => setEditRating(i + 1)}
                        aria-label={`${i + 1}점`}
                      >
                        <Paw />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rv-field">
                <div className="rv-label  mt-[25px] ">사진</div>
                <input className="rv-file mt-[5px]" type="file" accept="image/*" onChange={onPickEditFile} />
                {editPreview && (
                  <div className="rv-preview ml-[10px]">
                    <img src={editPreview} alt="현재/미리보기" />
                  </div>
                )}
                {editPreview && (
                  <div className="mt-[8px] ml-[10px]">
                    <button type="button" className="btn" onClick={onRemoveExistingImage}>
                      이미지 삭제
                    </button>
                  </div>
                )}
              </div>

              <div className="rv-field">
                <div className="rv-label mt-[35px] ">내용</div>
                <textarea
                  className="rv-textarea mt-[7px] "
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={5}
                  placeholder="리뷰 내용을 입력하세요."
                  required
                />
              </div>

              <div className="rv-actions mr-[50px]">
                <button type="submit" className="btn" disabled={editing || !editId}>
                  {editing ? '수정 중…' : '수정하기'}
                </button>
                <button type="button" className="btn" onClick={closeEditModal} disabled={editing}>취소</button>
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

  /* ==== 카드 상단: 작성자(좌) + 액션(우측 정렬) ==== */
  .rv-toprow { display:flex; align-items:center; justify-content:space-between; }
  .rv-actions-top { display:flex; gap:8px; }

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

  /* ======== (A) 사진 없는 리뷰 전용 여백 ======== */
  /*
   * ▶ 사진 없이 등록된 리뷰의 여백은 아래 4곳에서 조절합니다.
   *    숫자(px)만 바꾸면 됩니다.
   */
  .rv-textonly { padding-top: 0px; padding-bottom: 18px; }         /* 카드 상/하 패딩 */
  .rv-textonly .writer { margin-left: 20px; }                        /* 작성자 좌측 들여쓰기 */
  .rv-textonly .meta-row { margin-left: 20px; }                      /* 평점/날짜 좌측 들여쓰기 */
  .rv-textonly__content { margin-left: 20px; padding-right: 16px; }  /* 본문 좌/우 여백 */

  /* ==== 리뷰 리스트(불릿 제거) ==== */
  .review-list { list-style:none; padding-left:0; margin:0; }
  .review-list > li { list-style:none; }
  .review-list > li::marker { content:''; }

  /* =========================================================
     (모달) 조절용 CSS 변수
     ========================================================= */
  .rv-modal {
    --rv-modal-width: 600px;
    --rv-modal-height: 620px;
    --rv-panel-padding: 16px;
    --rv-panel-margin-top: 80px;

    --rv-title-size: 18px;
    --rv-label-size: 14px;
    --rv-body-font-size: 14px;

    --rv-star-size: 24px;
    --rv-stars-gap: 10px;
    --rv-stars-pad-y: 8px;
    --rv-stars-pad-x: 14px;
    --rv-stars-border: #e5e7eb;
    --rv-stars-border-width: 1.5px;
    --rv-stars-bg: transparent;

    --rv-preview-w: 220px;
    --rv-preview-h: 220px;
    --rv-preview-radius: 8px;
    --rv-preview-border: #e5e7eb;

    --rv-textarea-w: 520px;
    --rv-textarea-h: 200px;
    --rv-textarea-radius: 8px;
    --rv-textarea-border: #e5e7eb;
    --rv-textarea-padding: 10px;
    --rv-textarea-resize: none;

    --rv-actions-gap: 8px;
    --rv-actions-top: 14px;
  }

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

  .rv-stars {
    display: inline-flex;
    align-items: center;
    gap: var(--rv-stars-gap);
    padding: var(--rv-stars-pad-y) var(--rv-stars-pad-x);
    border: var(--rv-stars-border-width) solid var(--rv-stars-border);
    border-radius: 9999px;
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
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .rv-stars .paw-icon :global(svg) {
    width: var(--rv-star-size);
    height: var(--rv-star-size);
  }

  .rv-file { }
  .rv-preview img {
    width: var(--rv-preview-w);
    height: var(--rv-preview-h);
    object-fit: cover;
    border: 1px solid var(--rv-preview-border);
    border-radius: var(--rv-preview-radius);
    margin-top: 8px;
  }

  .rv-textarea {
    width: var(--rv-textarea-w);
    height: var(--rv-textarea-h);
    border: 1px solid var(--rv-textarea-border);
    border-radius: var(--rv-textarea-radius);
    padding: var(--rv-textarea-padding);
    resize: var(--rv-textarea-resize);
    font-size: var(--rv-body-font-size);
  }

  .rv-actions {
    display:flex; justify-content:flex-end;
    gap:var(--rv-actions-gap);
    margin-top:var(--rv-actions-top);
  }

  /* 모달 내부 컨텐트 가운데 폭 고정 */
  .rv-modal { --rv-inner-width: 540px; }
  .rv-modal__title,
  .rv-modal__panel form,
  .rv-actions {
    width: var(--rv-inner-width);
    margin-left: auto !important;
    margin-right: auto !important;
  }

  /* ======== (B) 페이징 버튼 디자인 — 흰바탕/회색 테두리/3D 느낌 ======== */
  .rv-paging-wrap { display:flex; justify-content:center; margin-top:24px; }
  /* 래퍼 테두리/배경 제거 (버튼만 보이게) */
  .rv-paging { background:transparent; border:0; padding:0; }

  /* 공용 Pagination 내부 nav 정렬 */
  .rv-paging :global(nav) { display:flex; align-items:center; gap:6px; }

  /* 버튼/링크 기본 스타일: 흰 바탕 + 회색 테두리 + 3D */
  .rv-paging :global(nav > *),
  .rv-paging :global(button),
  .rv-paging :global(a),
  .rv-paging :global([role="button"]) {
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius:6px;
    padding:4px 10px;
    line-height:1.2;
    box-shadow: 0 2px 0 rgba(0,0,0,0.06);
    transition: transform .02s ease, box-shadow .02s ease, background .15s ease;
    cursor:pointer;
  }
  .rv-paging :global(button:hover),
  .rv-paging :global(a:hover),
  .rv-paging :global([role="button"]:hover) {
    background:#fafafa;
  }
  .rv-paging :global(button:active),
  .rv-paging :global(a:active),
  .rv-paging :global([role="button"]:active) {
    transform: translateY(1px);
    box-shadow: 0 1px 0 rgba(0,0,0,0.06);
  }
  .rv-paging :global(.active),
  .rv-paging :global(.current),
  .rv-paging :global([aria-current="page"]) {
    font-weight:600;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.12);
    background:#fff;
  }
  .rv-paging :global(.disabled),
  .rv-paging :global([aria-disabled="true"]) {
    opacity:.5;
    cursor:not-allowed;
    background:#f9fafb;
    box-shadow:none;
  }
      `}</style>

      {/* 버튼 스타일: 흰 배경 + 회색 둥근 테두리 (공용 버튼 유지) */}
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
