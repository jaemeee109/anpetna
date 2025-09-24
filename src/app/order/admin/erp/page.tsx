// src/app/order/admin/erp/page.tsx
'use client';

import { useMemo, useState } from 'react';
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
import InventoryTable from '@/features/order/ui/InventoryTable';
import { createPortal } from 'react-dom';

const WRAP = 'mx-auto w-full max-w-[960px] px-4';

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

      // (ordersId <= 0) 제거
      const list = (res.content || []).filter((o: any) => Number(o?.ordersId) > 0);

      // 상세 한 건씩 보강
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
              row.firstItemQty = Number(first?.quantity ?? 0);
            }
          } catch {
            // ignore detail error per row
          }
          return row;
        })
      );

      return { ...res, content: lines as Row[] } as { content: Row[] } & ErpPage;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  type PageData = { content: Row[] } & ErpPage;
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

  const applyBulk = () => {
    const ids = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (ids.length === 0) return setBulkOpen(false);
    setDraft((m) => {
      const n = { ...m };
      ids.forEach((id) => (n[id] = bulkNext));
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
          <span>Sales & Stock</span>
          <Paw className="apn-title-ico" />
        </h1>
      </div>

      {/* 옵션 바 */}
      <div className="admin-actions flex flex-wrap items-end justify-center gap-2 mt-[25px]">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <label className="text-sm">회원ID</label>
          <input
            className="admin-input w-36"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="(선택)"
          />
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
              // 상태값이 null/undefined로 내려오지 않도록 보정
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
                  {/* 주문번호만 링크 (검정, 밑줄X) */}
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
                      {/* 선택 안내 제거(빈값 금지) → value 경고 방지 */}
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
        <div className="flex items-center gap-2 justify-end">
          <button
            className="btn-3d btn-white"
            onClick={() => {
              const ids = Object.entries(checked)
                .filter(([, v]) => v)
                .map(([k]) => Number(k));
              if (ids.length === 0) return alert('선택된 주문이 없습니다.');
              setBulkOpen(true);
            }}
          >
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

      {/* 일괄변경 모달 (createPortal 사용) */}
      {bulkOpen &&
        createPortal(
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setBulkOpen(false)} />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow p-5 w-[420px]">
                <div className="font-semibold mb-3">주문현황 일괄변경</div>
                <div className="mb-3">
                  <select
                    className="w-full border px-2 py-2 rounded"
                    value={bulkNext}
                    onChange={(e) => setBulkNext(e.target.value as OrdersStatus)}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  총 <b>{Object.entries(checked).filter(([, v]) => v).length}</b>건의 주문상태를
                  변경하시겠습니까?
                </div>
                <div className="flex justify-end gap-2">
                  <button className="btn-3d btn-white" onClick={() => setBulkOpen(false)}>
                    취소
                  </button>
                  <button className="btn-3d btn-primary" onClick={applyBulk}>
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 재고 테이블 */}
      <InventoryTable from={from} to={to} />

      {/* 페이지 전용 스타일 */}
      <style jsx>{`
        .apn-main {
          --row-border-color: #e5e7eb;
          --header-bg: #fafafa;
          --total-font-size: 18px;
          --total-font-weight: 700;
        }

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
        }
        .admin-sep {
          border-top: 1px solid var(--row-border-color);
          margin: 16px 0;
        }
        .admin-input {
          height: 40px;
          padding: 0 12px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          text-align: center;
        }
        .dropdown {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0 10px;
          background: #fff;
          text-align: center;
        }
        .role-select {
          width: 140px;
        }

        /* (공통 버튼) */
        .btn-3d {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #d1d5db; /* 회색 테두리 */
          background: #fff;
          color: #111;
          cursor: pointer;
          box-shadow: 0 2px 2px rgba(0, 0, 0, 0.08);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .btn-3d:hover {
          box-shadow: 0 3px 4px rgba(0, 0, 0, 0.15);
        }
        .btn-3d:active {
          transform: translateY(1px);
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
        }
        .btn-white {
          background: #fff;
          color: #111;
        }

        /* 링크 (검정, 밑줄X) */
        .link {
          color: #111;
          text-decoration: none;
        }

        /* 테이블 전체 가운데 정렬 */
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

        /* 총매출 */
        .total-center {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          font-size: var(--total-font-size);
          font-weight: var(--total-font-weight);
        }
        .total-label {
          margin-right: 6px;
          opacity: 0.9;
        }
        .total-amount {
          letter-spacing: 0.2px;
        }

        /* 페이징: 현재/비활성 상태 */
        :global(.apn-pagination .btn-3d.is-active) {
          border-color: #9ca3af;
          box-shadow: 0 3px 4px rgba(0, 0, 0, 0.15);
        }
        :global(.apn-pagination .btn-3d.is-disabled) {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: 0 2px 2px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </main>
  );
}
