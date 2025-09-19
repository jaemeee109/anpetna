// src/app/order/history/page.tsx
'use client';

import Link from 'next/link';
import RequireLogin from '@/components/auth/RequireLogin';
import { useQuery } from '@tanstack/react-query';
import orderApi from '@/features/order/data/order.api';
import { readMemberMe } from '@/features/member/data/member.api';
import { useEffect, useMemo, useState } from 'react';
import PawIcon from '@/src/components/icons/Paw';

/** 주문 상태 배지 */
function statusBadge(s?: string | null) {
  const map: Record<
    string,
    { label: string; bg: string; color: string }
  > = {
    PENDING:      { label: '주문완료',   bg: '#fde2f3', color: '#fa71c6ff' }, 
    PAID:         { label: '결제완료',  bg: '#fef9c3', color: '#bd9b2cff' }, 
    SHIPPED:      { label: '배송출발',   bg: '#e0f2fe', color: '#0369a1' }, 
    DELIVERED:    { label: '배송완료',   bg: '#dcfce7', color: '#166534' }, 
    CANCELLED:    { label: '주문취소',   bg: '#ffedd5', color: '#9a3412' }, 
    REFUNDED:     { label: '환불완료',   bg: '#fee2e2', color: '#991b1b' }, 
    CONFIRMATION: { label: '구매확정',   bg: '#e5e7eb', color: '#374151' }, 
    SHIPMENT_READY: { label: '배송준비중', bg: '#e6d8f8ff', color: '#17021b6b' },

  };
  const info = s ? map[s] : undefined;
  if (!info) return null;
  return (
    <span
      className="order-status-chip mt-[10px]"
      style={{ background: info.bg, color: info.color }}
    >
      {info.label}
    </span>
  );
}


/** ===== board와 동일한 로컬 Pager (번호 5개씩, 앞/뒤 버튼만 3D 버튼) ===== */
function Pager({
  current,
  total,
  size,
  onPage,
}: {
  current: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / Math.max(1, size)));
  const cur = Math.min(Math.max(1, current || 1), totalPages);

  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), totalPages);
    if (page !== cur) onPage(page);
  };

  const groupSize = 5;
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, totalPages);

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const BTN = 'btn-3d btn-white px-3 py-1 text-xs no-underline';
  const DISABLED = 'opacity-60 cursor-not-allowed';
  const ACTIVE_NUM = 'font-bold text-black';
  const WRAP_GAP = 'gap-[6px]';
  const NUM_GAP = 'gap-[6px]';
  const NUM_SIDE_MARGIN = 'mx-[10px]';
  



  return (
    <nav className={`flex items-center justify-center ${WRAP_GAP}`}>
      <button
        type="button"
        className={`${BTN} ${startPage === 1 ? DISABLED : ''}`}
        onClick={() => goto(1)}
        disabled={startPage === 1}
      >
        처음
      </button>
      <button
        type="button"
        className={`${BTN} ${startPage === 1 ? DISABLED : ''}`}
        onClick={() => goto(startPage - 1)}
        disabled={startPage === 1}
      >
        이전
      </button>

      <div className={`flex ${NUM_GAP} ${NUM_SIDE_MARGIN}`}>
        {pages.map((p) =>
          p === cur ? (
            <span key={p} className={ACTIVE_NUM} aria-current="page">
              {p}
            </span>
          ) : (
            <span
              key={p}
              onClick={() => goto(p)}
              className="cursor-pointer text-gray-600 hover:text-black"
            >
              {p}
            </span>
          )
        )}
      </div>

      <button
        type="button"
        className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`}
        onClick={() => goto(endPage + 1)}
        disabled={endPage === totalPages}
      >
        다음
      </button>
      <button
        type="button"
        className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`}
        onClick={() => goto(totalPages)}
        disabled={endPage === totalPages}
      >
        마지막
      </button>
    </nav>
  );
}

/** API 베이스: 상대경로(예: /files/xxx.jpg)를 절대 URL로 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':8000') : '');

function toAbs(u?: string | null) {
  const url = (u || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (API_BASE || '').replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

type Line = {
  ordersId: number;
  thumbnailUrl?: string | null;
  itemImageUrl?: string | null;
  totalAmount?: number | null;
  status?: string | null;   // ← 추가
};


async function fetchFirstItemName(ordersId: number): Promise<string> {
  const detail = await orderApi.detail(ordersId);
  const name =
    detail?.ordersItems?.[0]?.name ??
    (Array.isArray(detail?.ordersItems) && detail.ordersItems.length > 0 ? '(상품명 없음)' : '(품목 없음)');
  return name;
}

export default function OrderHistoryPage() {
  const [me, setMe] = useState<{ memberId: string } | null>(null);

  // 1) 로그인 사용자
  useEffect(() => {
    (async () => {
      try {
        const m = await readMemberMe();
        if (m?.memberId) setMe({ memberId: m.memberId });
      } catch {
        const mid =
          (typeof window !== 'undefined' && (localStorage.getItem('memberId') || sessionStorage.getItem('memberId'))) ||
          '';
        if (mid) setMe({ memberId: mid });
      }
    })();
  }, []);

  // 2) 페이징
  const [page, setPage] = useState(1); // 1-base
  const size = 10;

  // 3) 회원 주문 요약
  const listQ = useQuery({
    queryKey: ['orders', 'byMember', me?.memberId, page, size],
    queryFn: () => orderApi.summaryByMember(me!.memberId, { page: Math.max(0, page - 1), size }),
    enabled: !!me?.memberId,
  });

  // 4) 대표 상품명 매핑
  const lines: Line[] = useMemo(() => listQ.data?.content ?? [], [listQ.data]);
  const [nameMap, setNameMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!lines?.length) return;
    let cancelled = false;
    (async () => {
      const ids = lines.map((l) => l.ordersId);
      const targets = ids.filter((id) => nameMap[id] == null);
      if (!targets.length) return;
      const entries = await Promise.all(
        targets.map(async (id) => [id, await fetchFirstItemName(id)] as const)
      );
      if (!cancelled) {
        setNameMap((prev) => {
          const next = { ...prev };
          for (const [id, nm] of entries) next[id] = nm;
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lines]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5) 렌더
  const totalElements = Number(listQ.data?.totalElements ?? 0);

  return (
    <RequireLogin>
      
      <main className="mx-auto px-4 py-10 max-w-[700px]">
        <h1 className="text-center text-2xl font-semibold mt-[50px] mb-[30px]">Order List&nbsp;<PawIcon/></h1>

        {/* 카드 목록 (바깥 큰 테두리 X) */}
        <div className="space-y-3">
          {listQ.isLoading && <p className="px-2 py-6">불러오는 중…</p>}
          {listQ.error && <p className="px-2 py-6 text-red-600">오류가 발생했습니다.</p>}

          {lines?.map((line) => {
            const id = line.ordersId;
            const thumb = toAbs(line.thumbnailUrl || line.itemImageUrl || '');
            const name = nameMap[id];

            return (
              <Link
                key={id}
                href={`/order/history/${id}`}
                className="apn-card block no-underline text-black p-4 hover:shadow-md"
              >
                {/* 카드 내부 전부 가운데 정렬 */}
                <div className="grid grid-cols-[140px_120px_1fr_160px] gap-[5px] place-items-center text-center mt-[15px] mb-[15px]">
                  <div className="font-medium">
  Order No.{id}
  <div>{statusBadge(line.status)}</div> 
</div>

                  <img
                    src={thumb || '/file.svg'}
                    alt=""
                    className="w-[95px] h-[95px] object-cover rounded-md"
                  />

                  <div className="truncate"><b>{name ?? '상품명 불러오는 중…'}</b></div>

                  <div className="font-semibold">
                    {Number(line.totalAmount ?? 0).toLocaleString()} 원
                  </div>
                </div>
              </Link>
            );
          })}

          {!listQ.isLoading && !lines?.length && (
            <p className="mt-[50px] px-2 py-6 text-gray-600 text-center">구매내역이 없습니다.</p>
          )}
        </div>

        {/* ▶ 로컬 Pager 사용 */}
        <div className="mt-[70px] mb-[100px]">
          <Pager current={page} total={totalElements} size={size} onPage={setPage} />
        </div>
      </main>

      {/* 이 페이지 한정 전역 스타일: 카드 + 3D 버튼 (board에서 쓰는 것과 동일 계열) */}
      <style jsx global>{`
        .apn-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          margin-bottom: 15px;
        }
        .btn-3d {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #2222;
          background: #fff;
          box-shadow: 0 1px 0 #fff inset, 0 6px 0 rgba(0, 0, 0, 0.06);
        }
        .btn-white { background: #fff; }
        a.no-underline { text-decoration: none !important; }
        a.text-black { color: #111827 !important; }

        /* 주문 상태 배지(알약형) — 캡쳐 스타일 참고 */
        .order-status-chip{
          display:inline-flex;
          align-items:center;
          padding: 2px 8px;           /* 기존 px-2 py-[2px] 크기 유지 */
          border-radius: 9999px;      /* 완전한 알약 모양 */
          font-size: 14px;            /* 기존 text-[12px] 유지 */
          font-weight: 600;           /* 글씨 조금 진하게 */
          box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset; /* 살짝 볼륨감 */
           justify-content: center;
           min-width: 70px;     /* 가로 최소값 */
           height: 25px;        /* 세로 높이 */
           line-height: 28px;   /* 텍스트 중앙정렬 효과 */
           letter-spacing: 1.0px; /* 글자간격 */
        }



      `}</style>


    </RequireLogin>
  );
}
