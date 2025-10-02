// src/features/order/ui/InventoryTable.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import http from '@/shared/data/http';
import { Pagination } from '@/components/layout/Pagination'; // ERP와 동일 컴포넌트 사용
import Paw from '@/components/icons/Paw';

/** 공통: API 베이스 (http 모듈 baseURL 사용) */
const API = {
  items: (page = 0, size = 30) => `/item?page=${page}&size=${size}`, // 0-base, 30개/페이지
  erp: (q: { status?: string; page?: number; size?: number; from?: string; to?: string } = {}) => {
    const p = new URLSearchParams();
    if (q.status) p.set('status', q.status);
    if (q.from) p.set('from', q.from);
    if (q.to) p.set('to', q.to);
    p.set('page', String(q.page ?? 0));   // ★ 0-base
    p.set('size', String(q.size ?? 100));
    return `/order/admin/erp?${p.toString()}`;
  },
  orderDetail: (ordersId: number) => `/order/${ordersId}`,
  putStock: (itemId: number) => `/item/${itemId}/stock`,
};

/** 응답 모양이 상황마다 content/dtoList/list로 섞여올 수 있으므로 안전 변환 */
function toArray<T = any>(input: any): T[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.content)) return input.content;
  if (Array.isArray(input.dtoList)) return input.dtoList;
  if (Array.isArray(input.list)) return input.list;
  if (Array.isArray(input.items)) return input.items;
  return [];
}

/** 숫자 표시 */
const nf = (n?: number) => (Number.isFinite(Number(n)) ? Number(n).toLocaleString('ko-KR') : '0');

/** 타입 */
type ItemRow = {
  itemId: number;
  itemCategory: string;
  itemName: string;
  itemStock: number; // DB 현재 재고(백엔드에서 즉시 차감/복원 반영)
};

type OrderLine = {
  itemId: number;
  orderQuantity: number;
};

type InventoryProps = { from?: string; to?: string };

export default function InventoryTable({ from, to }: InventoryProps) {
  /** 목록 페이징(30개/페이지 고정) */
  const [page, setPage] = useState(1); // 유저에게 1-base로 보이고, 전송은 0-base
  const size = 30;

  /** 로딩/데이터 */
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [total, setTotal] = useState(0);

  /** 주문중/매출확정 집계 */
  const [inprocByItem, setInprocByItem] = useState<Record<number, number>>({});
  const [confByItem, setConfByItem] = useState<Record<number, number>>({});

  /** 추가입고 임시값 */
  const [extraIn, setExtraIn] = useState<Record<number, number>>({});

  /** 카테고리 필터(클라이언트) */
  const [category, setCategory] = useState<string>('');

  /** 1) 아이템 목록 로드: /item (0-base 전송) */
  async function fetchItems(pg0: number) {
    const resp = await http.get(API.items(pg0, size));
    const data = (resp as any)?.data ?? resp;
    const list = toArray<any>(data?.result ?? data).map((x) => ({
      itemId: Number(x.itemId ?? x.id),
      itemCategory: String(x.itemCategory ?? x.category ?? ''),
      itemName: String(x.itemName ?? x.title ?? x.name ?? ''),
      itemStock: Number(x.itemStock ?? x.stock ?? 0),
    })) as ItemRow[];

    // 총 건수 추출(여러 필드 케이스 방어)
    const totalElements =
      Number(
        (data?.result ?? data)?.totalElements ??
          (data?.result ?? data)?.total ??
          (data?.page?.totalElements ?? (data?.totalCount ?? 0))
      ) || 0;

    return { list, totalElements };
  }

  /** 2) ERP 목록(기간 내 전체) → 주문중/매출확정 오더를 수집 후, 각 주문 상세로 라인합산 */
  async function buildQtyMaps(): Promise<{ inproc: Record<number, number>; conf: Record<number, number> }> {
    let pg0 = 0; // ★ 0-base
    const sz = 200;

    const P = new Set<string>(['PAID', 'SHIPMENT_READY', 'SHIPPED', 'DELIVERED']);
    const inprocIds: number[] = [];
    const confIds: number[] = [];

    // ERP 페이지 루프(기간 필터 적용, status 필터 없이 전체 가져온 뒤 분류)
    for (let i = 0; i < 50; i++) {
      const resp = await http.get(API.erp({ page: pg0, size: sz, from, to }));
      const data = (resp as any)?.data ?? resp;
      const pagePayload = data?.result ?? data;

      const rows = toArray<any>(pagePayload);
      if (rows.length === 0) break;

      for (const r of rows) {
        const oid = Number(r.ordersId ?? r.id ?? r.orders_id);
        const status = String(r.status ?? r.ordersStatus ?? '').toUpperCase();
        if (!oid) continue;
        if (P.has(status)) inprocIds.push(oid);
        else if (status === 'CONFIRMATION') confIds.push(oid);
      }

      const totalPages =
        Number(
          pagePayload?.totalPages ??
            pagePayload?.page?.totalPages ??
            pagePayload?.total_pages ??
            1
        ) || 1;
      if (pg0 >= totalPages - 1) break;
      pg0 += 1;
    }

    // 각 주문 상세 합산
    const accIn: Record<number, number> = {};
    const accCf: Record<number, number> = {};

    async function accumulate(ids: number[], bucket: Record<number, number>) {
      for (const oid of ids) {
        const resp = await http.get(API.orderDetail(oid));
        const data = (resp as any)?.data ?? resp;
        const payload = data?.result ?? data;

        const lines: OrderLine[] = toArray<any>(payload?.orderItems ?? payload?.ordersItems).map((li) => ({
          itemId: Number(li.itemId ?? li.item?.itemId ?? li.item_id),
          orderQuantity: Number(li.orderQuantity ?? li.quantity ?? li.order_quantity ?? 0),
        }));

        for (const li of lines) {
          if (!li.itemId || !Number.isFinite(li.orderQuantity)) continue;
          bucket[li.itemId] = (bucket[li.itemId] ?? 0) + Math.max(0, li.orderQuantity);
        }
      }
    }

    await accumulate(inprocIds, accIn);
    await accumulate(confIds, accCf);

    return { inproc: accIn, conf: accCf };
  }

  /** 최초 및 의존성 변경 로드 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // 목록은 현재 페이지, 집계는 기간(from/to)에 대해 전체
        const [{ list, totalElements }, qtyMaps] = await Promise.all([
          fetchItems(Math.max(0, page - 1)),
          buildQtyMaps(),
        ]);
        if (!alive) return;
        setItems(list);
        setTotal(totalElements);
        setInprocByItem(qtyMaps.inproc);
        setConfByItem(qtyMaps.conf);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [page, from, to]); // 페이지/기간 바뀌면 재조회

  /** 화면 표시용 rows + 카테고리 필터 적용 */
  const rows = useMemo(() => {
    const baseRows = items.map((it) => {
      const stock = Number(it.itemStock ?? 0);              // ✅ DB 현재 재고(즉시 차감/복원 반영)
      const inProcess = Number(inprocByItem[it.itemId] ?? 0); // 주문중(P~D)
      const confirmed = Number(confByItem[it.itemId] ?? 0);   // 매출확정(CONFIRMATION)
      return {
        itemId: it.itemId,
        category: it.itemCategory,
        name: it.itemName,
        stock,
        inProcess,
        confirmed,
      };
    });
    return category ? baseRows.filter((r) => r.category === category) : baseRows;
  }, [items, inprocByItem, confByItem, category]);

  /** 카테고리 목록 (현재 페이지 아이템 기준, 중복 제거) */
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.itemCategory) set.add(it.itemCategory);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [items]);

  /** “추가입고 → 전체 저장” */
  async function saveAll() {
    // 변경 있는 아이템만 추출
    const tasks: Promise<any>[] = [];
    for (const r of rows) {
      const add = Number(extraIn[r.itemId] ?? 0);
      if (!Number.isFinite(add) || add === 0) continue;
      // ✅ DB 현재 재고(stock) 기준으로 +추가입고
      const nextStock = Math.max(0, r.stock + add);
      tasks.push(http.put(API.putStock(r.itemId), { itemStock: nextStock }));
    }
    if (tasks.length === 0) {
      alert('변경된 재고가 없습니다.');
      return;
    }
    await Promise.all(tasks);
    // 저장 후 목록 재조회 + 입력값 초기화
    setExtraIn({});
    setLoading(true);
    try {
      const [{ list, totalElements }, qtyMaps] = await Promise.all([
        fetchItems(Math.max(0, page - 1)),
        buildQtyMaps(),
      ]);
      setItems(list);
      setTotal(totalElements);
      setInprocByItem(qtyMaps.inproc);
      setConfByItem(qtyMaps.conf);
      alert('재고가 저장되었습니다.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">로딩중…</div>;

  return (
    <>
      <section className="mt-[20px]">
        {/* 상단 타이틀 */}
        <div className="admin-head text-center">
          <h1 className="admin-title">
            <span>INVENTORY</span>
            <Paw className="apn-title-ico" />
          </h1>
        </div>

        {/* 카테고리 필터 (ERP 톤, 가운데 정렬) */}
        <div className="inv-actions">
          <label className="inv-label">카테고리</label>
          <select
            className="dropdown inv-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">전체</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {category && (
            <button
              type="button"
              className="btn-3d btn-white inv-reset"
              onClick={() => setCategory('')}
              aria-label="카테고리 초기화"
            >
              초기화
            </button>
          )}
        </div>

        <div className="admin-sep" />

        {/* 테이블 (모두 가운데 정렬) */}
        <div className="mt-3 overflow-x-auto">
          <table className="admin-table min-w-full text-sm">
            <thead>
              <tr>
                <th className="w-20">상품 ID</th>
                <th className="w-32">카테고리</th>
                <th className="w-[360px]">상품명</th>
                <th className="w-24">재고수</th>
                <th className="w-36">주문중</th>
                <th className="w-36">매출확정</th>
                <th className="w-28">추가입고</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId}>
                  <td>{r.itemId}</td>
                  <td>{r.category}</td>
                  <td>{r.name}</td>
                  <td>{nf(r.stock)}</td>
                  <td>{nf(r.inProcess)}</td>
                  <td>{nf(r.confirmed)}</td>
                  <td>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-[90px] text-center"
                      placeholder="0"
                      min={0}
                      value={(extraIn[r.itemId] as any) ?? ''}
                      onChange={(e) =>
                        setExtraIn((prev) => ({
                          ...prev,
                          [r.itemId]:
                            e.target.value === '' ? ('' as any) : Number(e.target.value),
                        }))
                      }
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-gray-500">
                    데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-sep" />

        {/* 페이징(가운데) + 저장(오른쪽) */}
        <div className="grid grid-cols-[1fr_auto] items-center">
          <div className="flex justify-center">
            <Pagination current={page} total={total} size={size} onPage={(p) => setPage(p)} />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button className="btn-3d btn-primary" type="button" onClick={saveAll}>
              저장
            </button>
          </div>
        </div>
      </section>

      {/* 이 컴포넌트 전용 스타일 */}
      <style jsx>{`
        .admin-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 24px;
          font-weight: 600;
          color: #000;
        }

          /* 아이콘이 보이도록 크기/색만 지정 (UI 변경 아님) */
          .apn-title-ico {
            width: 1em;
            height: 1em;
            color: #000;
            flex-shrink: 0;
          }
        .admin-sep {
          border-top: 1px solid #e5e7eb;
          margin: 16px 0;
        }

        /* 필터 바 */
        .inv-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
        }
        .inv-label {
          font-size: 14px;
        }
        .inv-select {
          height: 36px;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 0 10px;
          background: #fff;
          text-align: center;
          min-width: 180px;
        }
        .inv-reset {
          height: 36px;
          padding: 0 12px;
        }

        /* 테이블 전체/모든 셀 중앙 정렬 */
        .admin-table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          text-align: center;
        }
        .admin-table thead tr {
          background: #fafafa; /* ERP 톤 */
          font-weight: 600;
        }
        .admin-table th,
        .admin-table td {
          padding: 10px 8px;
          border-bottom: 1px solid #e5e7eb;
          text-align: center;
          vertical-align: middle;
        }
        .admin-table tbody tr:hover {
          background: #f9fafb;
        }
        /* 입력 박스 숫자 중앙 표시 */
        .admin-table input[type='number'] {
          text-align: center;
          border-color: #e5e7eb;
          border-radius: 5px;
        }
      `}</style>
    </>
  );
}
