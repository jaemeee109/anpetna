// src/features/review/ui/ReviewSection.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Paw from '@/components/icons/Paw';
import orderApi from '@/features/order/data/order.api';
import { readMemberMe } from '@/features/member/data/member.api';

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
  const totalPages =
    base?.totalPages ??
    base?.totalPage ??
    base?.end ??
    (typeof base?.total === 'number' && typeof base?.size === 'number'
      ? Math.max(1, Math.ceil(Number(base.total) / Math.max(1, Number(base.size))))
      : 1);
  const pageNumber = base?.pageNumber ?? base?.page ?? 1;
  return {
    totalElements: base?.total ?? base?.totalElements ?? dtoList.length,
    totalPages: Number(totalPages) || 1,
    pageNumber: Number(pageNumber) || 1,
    pageSize: Number(base?.size ?? base?.pageSize ?? 10),
    content: Array.isArray(dtoList) ? dtoList : [],
  } as ReviewPage;
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

/** 컴포넌트 */
export default function ReviewSection({ itemId }: { itemId: number }) {
  const base = resolveApiBase();

  const [order, setOrder] = useState<SortOrder>('date');
  const [direction, setDirection] = useState<SortDirection>('DESCENDING');
  const [page, setPage] = useState(1);
  const [size] = useState(10);

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
    return () => {
      alive = false;
    };
  }, [base, itemId, query]);

  const totalPages = data?.totalPages ?? 0;
  const list = data?.content ?? [];

  return (
    <section className="px-2 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="review-title flex items-center gap-2">
          <Paw className="w-[18px] h-[18px]" /> Review
        </h3>
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
                <div className="meta-row">
                  <span className="date">{when}</span>
                  <span className="stars">
                    {Array.from({ length: stars }).map((_, i) => (
                      <span key={i} className="paw-icon">
                        <Paw />
                      </span>
                    ))}
                  </span>
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

      {totalPages > 1 && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            이전
          </button>
          <span className="text-sm">{page} / {totalPages}</span>
          <button type="button" className="btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            다음
          </button>
        </div>
      )}

      <style jsx>{`
  /* 리뷰 섹션 타이틀 */
  .review-title { font-weight: 700; }

  /* 정렬 드롭다운 (선택박스) */
  .dropdown.sort-select { 
    border: 1px solid #e5e7eb;   /* 연한 회색 테두리 */
    border-radius: 6px;          /* 모서리 둥글게 */
    padding: 6px 8px;            /* 안쪽 여백 */
  }

  /* 카드 형태 컨테이너 */
  .apn-card { 
    background:#fff;             /* 흰색 배경 */
    border:1px solid #e5e7eb;    /* 연한 회색 테두리 */
    border-radius:16px;          /* 모서리 크게 둥글게 */
    box-shadow:0 2px 0 rgba(0,0,0,0.06); /* 약간의 그림자 */
  }

  /* 작성자 표시 영역 */
  .writer { 
    font-weight:600;             /* 두껍게 */
    font-size:14px;              /* 글자 크기 */
    color:#111827;               /* 진한 회색 */
    margin-top:25px;             /* 위 여백 */
    margin-left:25px;            /* 왼쪽 여백 */
    letter-spacing:0.1em;        /* 글자 간격 */
  }

  /* 작성일/별점 묶음 줄 */
  .meta-row { 
    margin-top:10px; 
    margin-left:25px;
    display:flex; 
    align-items:center; 
    gap:10px;                    /* 요소 간격 */
    letter-spacing:0.1em;        /* 글자 간격 */
  }

  /* 작성일 텍스트 */
  .date { 
    font-size:13px;              /* 글자 크기 */
    color:#6b7280;               /* 회색 */
  }

  /* 별 아이콘 그룹 */
  .stars { 
    display:inline-flex; 
    gap:2px;                     /* 아이콘 간격 */
  }

  /* 별점 아이콘 하나하나 */
  .paw-icon { 
    width:16px; 
    height:16px; 
    display:inline-block; 
    line-height:0; 
    color:#374151;               /* 어두운 회색 */
  }
  /* Paw 아이콘의 SVG 자체 */
  .paw-icon :global(svg) { 
    width:16px; 
    height:16px; 
    display:inline-block; 
  }
  /* Paw 아이콘 내부 path (실제 채워지는 부분) */
  .paw-icon :global(path) { 
    fill:#374151;                /* 채우기 색 */
    stroke:#374151;              /* 테두리 색 */
    stroke-width:1.5;            /* 테두리 두께 */
  }

  /* 리뷰 이미지 (고정 크기 130x170) */
  .review-img { 
    width:130px; 
    height:170px; 
    object-fit:cover;            /* 잘려도 비율 유지 */
    border-radius:8px;           /* 둥근 모서리 */
    border:1px solid #e5e7eb;    /* 연한 테두리 */
    background:#f9fafb;          /* 연한 배경 */
    display:block;
    margin:15px 0 25px 25px;     /* 바깥 여백 (상,좌,하) */
  }

  /* 리뷰 이미지가 없는 경우 */
  .review-img--empty { 
    width:130px; 
    height:170px; 
    border:1px dashed #e5e7eb;   /* 점선 테두리 */
    border-radius:8px; 
    background:#fafafa; 
  }

  /* 리뷰 본문 텍스트 */
  .review-content { 
    font-size:16px; 
    color:#111827; 
    line-height:1.5;             /* 줄간격 */
    letter-spacing:0.02em;       /* 글자 간격 */
    margin-left: 50px;
  }

  /* 리뷰 리스트 전체 (불릿 제거) */
  .review-list { 
    list-style:none; 
    padding-left:0; 
    margin:0; 
  }
  .review-list > li { list-style:none; }
  .review-list > li::marker { content:''; }
`}</style>

<style jsx>{`
  /* 버튼 스타일 */
  .btn { 
    border:1px solid #e5e7eb;    /* 테두리 */
    border-radius:6px;           /* 둥근 모서리 */
    padding:6px 10px;            /* 안쪽 여백 */
    background:#fff;             /* 흰색 배경 */
  }
`}</style>

    </section>
  );
}
