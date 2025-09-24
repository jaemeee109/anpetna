// features/order/ui/InventoryTable.tsx
'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import http from '@/shared/data/http';

type ItemRow = {
  itemId: number;
  itemName: string;
  itemCategory: string;
  itemStock: number;
};

type ItemsPage = {
  list: ItemRow[];
  totalElements: number;
};

type InventoryRow = ItemRow & {
  sold: number;
  remain: number;
};

const CATEGORIES = [
  { label: '전체', value: '' },
  { label: '사료', value: 'FEED' },
  { label: '간식', value: 'SNACKS' },
  { label: '의류', value: 'CLOTHING' },
  { label: '욕실용품', value: 'BATH_PRODUCT' },
  { label: '미용용품', value: 'BEAUTY_PRODUCT' },
  { label: '장난감', value: 'TOY' },
  { label: '기타', value: 'OTHERS' },
];

async function fetchItems(page: number, size: number, category: string): Promise<ItemsPage> {
  const qs = new URLSearchParams();
  qs.set('page', String(Math.max(0, page - 1)));
  qs.set('size', String(size));
  if (category) qs.set('itemCategory', category);

  const resp = await http.get(`/item?${qs.toString()}`);
  const data = (resp as any)?.data ?? resp;
  const p = data?.result ?? data;

  const rawList: any[] = p?.dtoList ?? [];
  const list: ItemRow[] = rawList.map((x: any): ItemRow => ({
    itemId: Number(x.itemId ?? 0),
    itemName: String(x.itemName ?? x.name ?? ''),
    itemCategory: String(x.itemCategory ?? x.category ?? ''),
    itemStock: Number(x.itemStock ?? 0),
  }));

  const totalElements = Number(p?.total ?? list.length);
  return { list, totalElements };
}

type Props = { from?: string; to?: string };

export default function InventoryTable({ from, to }: Props) {
  const [page, setPage] = useState(1);
  const size = 10;

  const [category, setCategory] = useState('');

  const { data: soldMap } = useQuery({
    queryKey: ['erp-soldmap', from, to],
    queryFn: async (): Promise<Map<number, number>> => {
      const map = new Map<number, number>();
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      qs.set('status', 'CONFIRMATION');
      qs.set('page', '0');
      qs.set('size', '100');

      const fetchPage = async (pageIdx: number) => {
        qs.set('page', String(pageIdx));
        const r = await http.get(`/order/admin/erp?${qs.toString()}`);
        const d = (r as any)?.data ?? r;
        return d?.result ?? d;
      };

      const first = await fetchPage(0);
      const totalPages: number = Number(first?.totalPages ?? 1);

      const allOrderIds: number[] = [];
      const eatOrderIds = (content: any[]) => {
        for (const row of content ?? []) {
          const oid = Number(row?.ordersId ?? 0);
          if (oid > 0) allOrderIds.push(oid);
        }
      };
      eatOrderIds(first?.content ?? first?.list ?? []);

      for (let p = 1; p < totalPages; p++) {
        const pay = await fetchPage(p);
        eatOrderIds(pay?.content ?? pay?.list ?? []);
      }

      for (const oid of allOrderIds) {
        const r = await http.get(`/order/${oid}`);
        const d = (r as any)?.data ?? r;
        const detail = d?.result ?? d;
        const items: any[] = detail?.ordersItems ?? [];
        for (const it of items) {
          const id = Number(it?.itemId ?? it?.item?.itemId ?? 0);
          const q = Number(it?.quantity ?? 0);
          if (!id || !q) continue;
          map.set(id, (map.get(id) ?? 0) + q);
        }
      }
      return map;
    },
    staleTime: 30_000,
  });

  const { data, refetch } = useQuery({
    queryKey: ['items-all', page, size, category],
    queryFn: (): Promise<ItemsPage> => fetchItems(page, size, category),
    staleTime: 30_000,
  });

  const totalPages = useMemo(() => {
    const total = data?.totalElements ?? 0;
    return Math.max(1, Math.ceil(total / size));
  }, [data?.totalElements, size]);

  const rowsBase: InventoryRow[] = useMemo(() => {
    const list = data?.list ?? [];
    return list.map((x: ItemRow): InventoryRow => {
      const sold = (soldMap as Map<number, number> | undefined)?.get(x.itemId) ?? 0;
      // ✅ 요구사항: 잔여재고 = 현재재고 (판매수량과 무관)
      const remain = x.itemStock ?? 0;
      return { ...x, sold, remain };
    });
  }, [data, soldMap]);

  const [edited, setEdited] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);

  const rows: InventoryRow[] = useMemo(() => {
    return rowsBase.map((r) => {
      const curStock = edited[r.itemId] ?? r.itemStock;
      // ✅ 요구사항: 잔여재고 = 현재재고
      const remain = curStock;
      return { ...r, itemStock: curStock, remain };
    });
  }, [rowsBase, edited]);

  async function saveAll() {
    const changes = Object.entries(edited)
      .map(([k, v]) => [Number(k), Math.max(0, Number(v))] as [number, number])
      .filter(([itemId, next]) => {
        const base = rowsBase.find((x) => x.itemId === itemId);
        return base && base.itemStock !== next;
      });

    if (changes.length === 0) return alert('변경된 재고가 없습니다.');

    try {
      setSaving(true);
      for (const [itemId, nextStock] of changes) {
        await http.put(`/item/${itemId}/stock`, { itemStock: nextStock });
      }
      await refetch();
      setEdited({});
      alert(`재고가 저장되었습니다. (총 ${changes.length}건)`);
    } catch (e: any) {
      alert(e?.message || '재고 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="apn-inventory mt-8">
      <div className="admin-head text-center">
        <h2 className="admin-title-sm">
          <span>Inventory</span>
        </h2>
      </div>

      {/* 필터 바 */}
      <div className="inv-actions flex items-center justify-center gap-2 mt-[12px]">
        <label className="text-sm">카테고리</label>
        <select
          className="dropdown"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-sep" />

      {/* 테이블 (모두 가운데 정렬) */}
      <div className="overflow-x-auto">
        <table className="admin-table min-w-full text-sm">
          <thead>
            <tr>
              <th className="w-24">상품 ID</th>
              <th className="w-32">카테고리</th>
              <th>상품명</th>
              <th className="w-28">현재 재고</th>
              <th className="w-28">판매수량(확정)</th>
              <th className="w-28">잔여 재고</th>
              <th className="w-28">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId}>
                <td>{r.itemId}</td>
                <td>{r.itemCategory}</td>
                <td>{r.itemName}</td>
                <td>
                  <input
                    type="number"
                    value={edited[r.itemId] !== undefined ? edited[r.itemId] : r.itemStock}
                    min={0}
                    className="admin-input w-24 text-center"
                    onChange={(e) => {
                      const v = e.target.value;
                      setEdited((m) => ({ ...m, [r.itemId]: v === '' ? 0 : Number(v) }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveAll();
                    }}
                  />
                </td>
                <td>{r.sold}</td>
                <td>{r.remain}</td>
                <td>
                  <Link className="link" href={`/items/${r.itemId}`}>
                    상품보기
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 하단: 저장(우측) + 페이징(가운데) */}
      <div className="mt-3 grid grid-cols-[1fr_auto] items-center">
        {/* 페이징: 가운데 정렬 */}
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <button
              className="btn-3d btn-white"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              이전
            </button>
            <span className="text-sm">
              {page} / {Math.max(1, Math.ceil((data?.totalElements ?? 0) / size))}
            </span>
            <button
              className="btn-3d btn-white"
              disabled={page >= Math.max(1, Math.ceil((data?.totalElements ?? 0) / size))}
              onClick={() => setPage(page + 1)}
            >
              다음
            </button>
          </div>
        </div>

        {/* 저장: 우측 정렬 */}
        <div className="flex justify-end">
          <button className="btn-3d btn-primary" disabled={saving} onClick={saveAll}>
            저장
          </button>
        </div>
      </div>

      {/* 페이지 한정 스타일 */}
      <style jsx>{`
        .admin-title-sm { font-size: 22px; font-weight: 600; color: #000; }
        .admin-sep { border-top: 1px solid #e5e7eb; margin: 16px 0; }
        .admin-input {
          height: 36px; padding: 0 10px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none;
          background: #fff;
        }
        .dropdown {
          height: 36px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 0 10px; background: #fff;
          text-align: center;
        }
        .btn-3d {
          display: inline-flex; align-items: center; justify-content: center;
          height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid #e5e7eb; cursor: pointer;
          transition: transform .02s ease;
        }
        .btn-3d:active { transform: translateY(1px); }
        .btn-white { background: #fff; color: #111; }
        .btn-primary { background: #fff color: #111;  }

        /* (4) 링크 스타일: 검정, 밑줄 제거 */
        .link { color: #111; text-decoration: none; }

        /* (1) 테이블 + 셀 모두 가운데 정렬 */
        .admin-table {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          text-align: center;
        }
        .admin-table thead tr {
          background: #fafafa;
          font-weight: 600;
        }
        .admin-table th, .admin-table td {
          padding: 10px 8px; border-bottom: 1px solid #e5e7eb; text-align: center;
        }
        .admin-table tbody tr:hover { background: #f9fafb; }
      `}</style>
    </section>
  );
}
