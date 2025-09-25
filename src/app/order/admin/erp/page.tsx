// src/app/order/admin/erp/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Paw from '@/components/icons/Paw';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  STATUS_LABEL,
  type OrdersStatus,
  type ErpPage,
  listErp,
  adminChangeStatus,
  readOne,
} from '@/features/order/data/order.admin.api';
import { Pagination } from '@/components/layout/Pagination';
import { createPortal } from 'react-dom';

const WRAP = 'mx-auto w-full max-w-[900px] px-4';

type Row = {
  ordersId: number;
  memberId?: string;
  createdAt?: string;
  itemQuantity: number;
  itemsSubtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrdersStatus;
  firstItemName?: string;
  firstItemPrice?: number;
  firstItemQty?: number;
  itemsCount?: number;
};

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 안전 배열 변환 (서버 응답이 content/dtoList/list/items 등 섞여올 때 방어) */
function toArray<T = any>(input: any): T[] {
  if (!input) return [];
  const payload = (input?.result ?? input) as any;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.dtoList)) return payload.dtoList;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

/** 모달 전용 컴포넌트 (UI 동일) */
function BulkStatusModal(props: {
  onClose: () => void;
  value: OrdersStatus;
  onChange: (v: OrdersStatus) => void;
  onApply: () => void;
  selectedCount: number;
}) {
  const { onClose, value, onChange, onApply, selectedCount } = props;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647, pointerEvents: 'auto' }}>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#fff',
          borderRadius: 12,
          width: 420,
          padding: 18,
          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
          zIndex: 2147483648,
        }}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>주문현황 일괄변경</div>

        <div style={{ marginBottom: 12 }}>
          <select
            className="dropdown w-full"
            value={value}
            onChange={(e) => onChange(e.target.value as OrdersStatus)}
            style={{ width: '100%', height: 40, borderRadius: 10, padding: '0 10px' }}
          >
            {Object.entries(STATUS_LABEL).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-600 mb-4">
          총 <b>{selectedCount}</b>건의 주문상태를 변경하시겠습니까?
        </div>

        <div className="flex justify-end gap-[5px]">
          <button className="btn-3d btn-white" type="button" onClick={onClose}>
            취소
          </button>
          <button className="btn-3d btn-primary" type="button" onClick={onApply}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminErpPage() {
  const today = useMemo(() => new Date(), []);
  const d30 = useMemo(() => new Date(Date.now() - 29 * 24 * 60 * 60 * 1000), []);
  const [from, setFrom] = useState(fmtDate(d30));
  const [to, setTo] = useState(fmtDate(today));

  const [status, setStatus] = useState<OrdersStatus | ''>('');
  const [memberId, setMemberId] = useState('');
  const [sort] = useState<'statusAsc' | 'statusDesc'>('statusDesc');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [draft, setDraft] = useState<Record<number, OrdersStatus>>({});
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNext, setBulkNext] = useState<OrdersStatus>('SHIPMENT_READY');

  const qc = useQueryClient();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 모달 열리면 body 스크롤 잠금
  useEffect(() => {
    if (!bulkOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [bulkOpen]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['erp', { from, to, status, memberId, page, size, sort }],
    queryFn: async () => {
      const res = await listErp({
        from,
        to,
        status,
        memberId: memberId.trim() || undefined,
        page,
        size,
        sort,
      });

      // 리스트 안전 파싱
      const baseList = toArray<any>(res);
      const list = baseList.filter((o: any) => Number(o?.ordersId) > 0);

      // 상세 보강
      const lines = await Promise.all(
        list.map(async (o: any) => {
          const row: Row = { ...o };
          try {
            const detail = await readOne(o.ordersId);
            const items = detail?.orderItems ?? detail?.ordersItems ?? [];
            row.itemsCount = Array.isArray(items) ? items.length : 0;
            const first = items?.[0];
            if (first) {
              row.firstItemName = first?.itemName ?? first?.item?.itemName ?? '상품';
              row.firstItemPrice = Number(first?.itemPrice ?? first?.price ?? 0);
              row.firstItemQty = Number(first?.quantity ?? first?.orderQuantity ?? 0);
            }
          } catch {
            // per-row detail 실패는 무시
          }
          return row;
        })
      );

      // 페이징 메타 보존
      const meta = (res as any)?.result ?? res;
      const totalElements =
        Number(meta?.totalElements ?? meta?.total ?? meta?.page?.totalElements ?? meta?.totalCount ?? 0) || 0;
      const pageSize = Number(meta?.pageSize ?? size) || size;

      return { ...res, content: lines as Row[], totalElements, pageSize } as { content: Row[] } & ErpPage;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  type PageData = { content: Row[]; totalElements?: number; pageSize?: number } & ErpPage;
  const pageData = data as PageData | undefined;
  const rows: Row[] = useMemo(() => pageData?.content ?? [], [pageData]);

  const totalSales = useMemo(
    () => rows.reduce((acc, r) => acc + Number(r?.totalAmount || 0), 0),
    [rows]
  );

  const allChecked = useMemo(
    () => rows.length > 0 && rows.every((r) => !!checked[r.ordersId]),
    [checked, rows]
  );

  const selectedIds = useMemo(
    () => Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k)),
    [checked]
  );

  const toggleAll = () => {
    if (!rows.length) return;
    const next = !allChecked;
    const map: Record<number, boolean> = {};
    rows.forEach((r) => (map[r.ordersId] = next));
    setChecked(map);
  };
  const toggleOne = (id: number, v: boolean) => setChecked((m) => ({ ...m, [id]: v }));
  const setRowStatus = (id: number, next: OrdersStatus) =>
    setDraft((m) => ({ ...m, [id]: next }));

  const openBulk = () => {
    if (selectedIds.length === 0) {
      alert('선택된 주문이 없습니다.');
      return;
    }
    setBulkOpen(true);
  };
  const closeBulk = () => setBulkOpen(false);

  const applyBulk = () => {
    if (selectedIds.length === 0) {
      alert('선택된 주문이 없습니다.');
      return;
    }
    setDraft((m) => {
      const n = { ...m };
      selectedIds.forEach((id) => (n[id] = bulkNext));
      return n;
    });
    setBulkOpen(false);
  };

  const mutate = useMutation({
    mutationFn: async () => {
      const tasks: Promise<any>[] = [];
      for (const [k, v] of Object.entries(draft)) {
        tasks.push(adminChangeStatus(Number(k), v));
      }
      await Promise.all(tasks);
    },
    onSuccess: async () => {
      setDraft({});
      setChecked({});
      await qc.invalidateQueries({ queryKey: ['erp'] });
      await refetch();
      alert('저장되었습니다.');
    },
    onError: (e: any) => alert(e?.message || '저장 중 오류가 발생했습니다.'),
  });

  return (
    <main className={`apn-main ${WRAP} py-6`} style={{ paddingBottom: 40 }}>
      {/* 헤더 */}
      <div className="admin-head text-center">
        <h1 className="admin-title">
          <span>SALES</span>
          <Paw className="apn-title-ico" />
        </h1>
      </div>

     {/* 옵션 바 */}
<div className="admin-actions mt-[25px]">
  {/* 1줄: 기간 + 검색 버튼 */}
  <div className="filter-row">
    <label className="text-sm">기간</label>
    <input
      type="date"
      className="admin-input w-[140px]"
      value={from}
      onChange={(e) => setFrom(e.target.value)}
    />
    <span>~</span>
    <input
      type="date"
      className="admin-input w-[140px]"
      value={to}
      onChange={(e) => setTo(e.target.value)}
    />
    <button
      className="btn-3d btn-white"
      onClick={() => {
        setPage(1);
        refetch();
      }}
    >
      검색
    </button>
  </div>

  {/* 2줄: 주문현황 + ID 검색 */}
  <div className="filter-row">
    <div className="filter-group">
      <label className="text-sm">주문현황</label>
      <select
        className="dropdown role-select"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as OrdersStatus | '');
          setPage(1);
        }}
      >
        <option value="">전체</option>
        {Object.entries(STATUS_LABEL).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    </div>

    <div className="filter-group">
      <label className="text-sm">ID 검색</label>
      <input
        className="admin-input w-[180px]"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
        placeholder="회원 ID를 입력해주세요"
      />
    </div>
  </div>
</div>


      <div className="admin-sep" />

      {/* 전체선택 */}
      <div className="flex items-center gap-2 px-1">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          전체선택
        </label>
        {isFetching && <span className="text-sm text-gray-500">불러오는 중…</span>}
      </div>

      {/* 리스트 */}
      <div className="mt-3 overflow-x-auto">
        <table className="admin-table min-w-full text-sm">
          <thead>
            <tr>
              <th className="w-10">선택</th>
              <th className="w-28">주문번호</th>
              <th className="w-32">총결제금액</th>
              <th className="w-24">배송비</th>
              <th className="w-40">주문현황</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const curStatus = (draft[r.ordersId] ?? r.status) as OrdersStatus;
              return (
                <tr key={r.ordersId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!checked[r.ordersId]}
                      onChange={(e) => toggleOne(r.ordersId, e.target.checked)}
                    />
                  </td>
                  <td>
                    <Link href={`/order/history/${r.ordersId}`} className="link">
                      {r.ordersId}
                    </Link>
                  </td>
                  <td>{Number(r.totalAmount).toLocaleString()}원</td>
                  <td>{Number(r.shippingFee).toLocaleString()}원</td>
                  <td>
                    <select
                      className="dropdown"
                      value={curStatus}
                      onChange={(e) => setRowStatus(r.ordersId, e.target.value as OrdersStatus)}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-gray-500">
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-sep" />

      {/* 총 매출(가운데) + 버튼(우측) */}
      <div className="grid grid-cols-[1fr_auto] items-center">
        <div className="total-center">
          <span className="total-label">총 매출 :</span>{' '}
          <span className="total-amount">{totalSales.toLocaleString()}원</span>
        </div>
        <div className="flex items-center gap-[5px] justify-end">
          <button className="btn-3d btn-white" type="button" onClick={openBulk}>
            일괄변경
          </button>
          <button
            className="btn-3d btn-primary"
            onClick={() => mutate.mutate()}
            disabled={Object.keys(draft).length === 0 || mutate.isPending}
          >
            저장
          </button>
        </div>
      </div>

      {/* 페이징 — 가운데 정렬 */}
      <div className="mt-4 flex justify-center mt-[15px]">
        <Pagination
          current={page}
          total={pageData?.totalElements ?? 0}
          size={pageData?.pageSize ?? size}
          onPage={(p) => setPage(p)}
        />
      </div>

      {/* 일괄변경 모달 */}
      {mounted && bulkOpen
        ? createPortal(
            <BulkStatusModal
              onClose={closeBulk}
              value={bulkNext}
              onChange={(v) => setBulkNext(v)}
              onApply={applyBulk}
              selectedCount={selectedIds.length}
            />,
            // 별도 루트가 있으면 그쪽으로, 없으면 body로
            (document.getElementById('__bulk_modal_root') as HTMLElement) ?? document.body
          )
        : null}



      {/* 페이지 전용 스타일 (아이콘 크기 포함) */}
    <style jsx>{`
/* =========================
   ERP 페이지 스타일 오버라이드 (완전체)
   ========================= */

/* ---- 공통 변수 ---- */
.apn-main {
  --row-border-color: #e5e7eb;
  --header-bg: #fafafa;
  --total-font-size: 18px;
  --total-font-weight: 700;
}

/* ---- 헤더/타이틀 ---- */
.admin-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 30px;
  font-weight: 600;
  color: #000;
}
:global(.apn-title-ico) {
  width: 1em;
  height: 1em;
  color: #000 !important;
  flex-shrink: 0;
}

/* ---- 구분선 ---- */
.admin-sep {
  border-top: 1px solid var(--row-border-color);
  margin: 16px 0;
}

/* =========================
   [필터 바(기간/주문현황/회원ID)]
   - 라벨/인풋/셀렉트/버튼 통일
   - Tailwind보다 우선하도록 !important 사용
   ========================= */
:global(.admin-actions) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 12px;
  margin-top: 22px;
}

/* 라벨(기간/주문현황/회원ID) 글자 스타일 */
:global(.admin-actions label),
:global(.admin-actions .text-sm) {
  font-size: 16px !important;
  color: #111 !important;
  opacity: 0.95;
}

/* 입력칸/셀렉트 공통 룩 */
:global(.admin-input),
:global(.dropdown) {
  font-size: 16px !important;
  height: 40px !important;
  padding: 0 12px !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 10px !important;
  outline: none !important;
  background: #fff !important;
  color: #111 !important;
  text-align: center !important;
  transition: border-color .15s ease, box-shadow .15s ease !important;
}
:global(.admin-input:focus),
:global(.dropdown:focus) {
  border-color: #9ca3af !important;
  box-shadow: 0 0 0 3px rgba(156,163,175,0.15) !important;
}

/* placeholder 스타일(문구 자체는 JSX placeholder 속성에서 변경) */
:global(.admin-input::placeholder) {
  font-size: 16px !important;
  color: #9aa0a6 !important;
  opacity: 1 !important;
}
:global(.admin-input::-ms-input-placeholder) {
  font-size: 16px !important;
  color: #9aa0a6 !important;
}

/* 날짜 입력 */
:global(.admin-input[type="date"]) {
  font-size: 16px !important;
}
:global(.admin-input[type="date"]::-webkit-calendar-picker-indicator) {
  cursor: pointer !important;
  opacity: 0.8 !important;
  margin-left: 4px !important;
}

/* 주문현황 셀렉트 너비 */
:global(.role-select) {
  width: 160px !important; /* 140~220px로 조정 */
}

/* 회원ID 입력칸 폭 (Tailwind w-36보다 우선) */
:global(.admin-input.w-36) {
  width: 180px !important; /* 필요시 200px 등으로 */
  min-width: 0 !important;
}

/* ---- 버튼(검색/저장/일괄변경) ---- */
:global(.btn-3d) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px !important;
  padding: 0 16px !important;
  border-radius: 10px !important;
  border: 1px solid #d1d5db !important;
  background: #fff !important;
  color: #fff !important;
  cursor: pointer !important;
  font-weight: 300 !important;
  box-shadow: 0 2px 2px rgba(0,0,0,0.08) !important;
  transition: transform .1s ease, box-shadow .1s ease, background .15s ease, border-color .15s ease !important;
}
:global(.btn-3d:hover) {
  box-shadow: 0 3px 6px rgba(0,0,0,0.14) !important;
}
:global(.btn-3d:active) {
  transform: translateY(1px) !important;
  box-shadow: 0 1px 2px rgba(0,0,0,0.12) !important;
}
:global(.btn-white) {
  background: #fff !important;
  color: #111 !important;
}
:global(.btn-primary) {
  background: #fff !important;
  color: #000000ff !important;
  border-color: #d1d5db !important;
}

/* ---- 링크(주문번호) ---- */
.link {
  color: #111;
  text-decoration: none;
}

/* =========================
   리스트 테이블
   ========================= */
.admin-table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  text-align: center;
}
.admin-table thead tr {
  background: var(--header-bg);
  font-weight: 600;
}
.admin-table th,
.admin-table td {
  padding: 10px 8px;
  border-bottom: 1px solid var(--row-border-color);
  text-align: center;
}
.admin-table tbody tr:hover {
  background: #f9fafb;
}

/* ---- 총 매출 표기 ---- */
.total-center {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  font-size: var(--total-font-size);
  font-weight: var(--total-font-weight);
}
.total-label { margin-right: 6px; opacity: .9; }
.total-amount { letter-spacing: .2px; }

/* ---- 페이지네이션 상태 ---- */
:global(.apn-pagination .btn-3d.is-active) {
  border-color: #9ca3af !important;
  box-shadow: 0 3px 4px rgba(0, 0, 0, 0.15) !important;
}
:global(.apn-pagination .btn-3d.is-disabled) {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.08) !important;
}

/* 필터 바: 세로 2줄(기간 / 주문현황+ID검색) */
:global(.admin-actions) {
  display: flex;
  flex-direction: column;   /* 줄 단위로 쌓기 */
  align-items: center;       /* 가운데 정렬 */
  gap: 12px;                 /* 줄 간격 */
}

/* 각 줄 내부 배치(가운데 정렬, 줄바꿈 허용) */
:global(.filter-row) {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;                 /* 컨트롤 간 간격 */
  flex-wrap: wrap;           /* 폭 좁아지면 자동 줄바꿈 */
}

/* 주문현황 / ID검색 묶음(라벨+컨트롤) */
:global(.filter-group) {
  display: flex;
  align-items: center;
  gap: 6px;                  /* 라벨-인풋 간격 */
}

`}</style>


    </main>
  );
}
