'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  useCart,
  useUpdateCart,
  useRemoveCartItem,
} from '@/features/cart/hooks/useCart';
import type { CartItemDTO } from '@/features/cart/data/cart.types';
import PawIcon from '@/components/icons/Paw';

/** 1,000 단위 , + 원 표시 없이 숫자만 반환 */
function formatKRW(n: number | bigint) {
  try {
    return new Intl.NumberFormat('ko-KR').format(Number(n ?? 0));
  } catch {
    return String(n ?? 0);
  }
}

/** 상세페이지와 동일: 이미지 베이스 추정 */
function resolveImgBase(): string {
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

/** 상대경로 → 절대경로 */
function toAbs(url?: string, base?: string) {
  const u = url || '';
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const B = (base || '').replace(/\/+$/, '');
  const p = u.startsWith('/') ? u : `/${u}`;
  return `${B}${p}`;
}

/** 🔹 장바구니 항목에서 썸네일 후보를 안전하게 뽑기 */
function pickImagePath(it: CartItemDTO): string {
  const any = it as any;
  return (
    any?.imageUrl ||
    any?.thumbnailUrl ||
    any?.item?.thumbnailUrl ||
    // 서버가 images 배열을 내려주는 케이스
    any?.images?.[0]?.url ||
    any?.item?.images?.[0]?.url ||
    ''
  );
}

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const updateMut = useUpdateCart();
  const removeMut = useRemoveCartItem();

  const IMG_BASE = resolveImgBase();

  // ✅ 선택 상태: itemId 기준으로 관리(백엔드 아이템 중심 DTO 구조)
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // 장바구니 로딩/갱신 시 초기값(전체선택)
  useEffect(() => {
    if (cart?.items?.length) {
      setSelected(new Set(cart.items.map((it) => it.itemId)));
    } else {
      setSelected(new Set());
    }
  }, [cart?.items]);

  const allSelected = useMemo(() => {
    const total = cart?.items?.length ?? 0;
    return total > 0 && selected.size === total;
  }, [cart?.items, selected]);

  // (9) 총 n건: 선택된 itemId 개수
  const selectedCount = selected.size;

  // (10) 선택된 카드들의 (수량×단가) 합
  const selectedTotal = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((sum, it) => {
      if (!selected.has(it.itemId)) return sum;
      return sum + (Number(it.price) || 0) * (Number(it.quantity) || 0);
    }, 0);
  }, [cart?.items, selected]);

  // 개별 선택 토글
  const toggleOne = (itemId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // (2) 전체선택 토글
  const toggleAll = () => {
    if (!cart?.items?.length) return;
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(cart.items.map((it) => it.itemId)));
    }
  };

  // (6) 수량 변경 (최소 1) → itemId 기준으로 업데이트
  const changeQty = (it: CartItemDTO, delta: -1 | 1) => {
    const current = Math.max(1, Number(it.quantity) || 1);
    const next = Math.max(1, current + delta);
    if (next === current) return;
    updateMut.mutate({ itemId: it.itemId, quantity: next });
  };

  // (4)(16) 선택된 항목만 삭제 (itemId 기준)
  const handleDeleteSelected = async () => {
    if (!cart?.items?.length || selected.size === 0) return;
    const targets = cart.items.filter((it) => selected.has(it.itemId));
    for (const it of targets) {
      try {
        await removeMut.mutateAsync(it.itemId);
      } catch {}
    }
    setSelected(new Set());
  };

  // 이미지 URL 안전 처리(상대경로 보정) — 여러 후보 필드를 지원
  const imgSrc = (it: CartItemDTO) => {
    const candidate = pickImagePath(it);
    const abs = toAbs(candidate, IMG_BASE);
    return abs || '/file.svg';
  };

  // (1) 본문 전체 가운데정렬 컨테이너
  return (
    <main className="mx-auto max-w-4xl px-4">
      <h1 className="text-2xl font-semibold text-center mt-6 mb-4">
        CART&nbsp;<PawIcon />
      </h1>

      {/* 상단 회색 실선 */}
      <hr className="border-gray-300" />

      {/* (2) 전체선택: 왼쪽 정렬 */}
      <div className="flex items-center gap-2 py-3">
        <input
          id="check-all"
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
        />
        <label htmlFor="check-all" className="select-none">
          전체선택
        </label>
      </div>

      {/* 회색 실선 */}
      <hr className="border-gray-300" />

      {/* (18) 비어있을 때 */}
      {!isLoading && (!cart?.items || cart.items.length === 0) && (
        <div className="py-20 text-center text-gray-500">장바구니가 비었습니다</div>
      )}

      {/* (3) 상품 카드들 */}
      <div className="flex flex-col gap-3 my-4">
        {cart?.items?.map((it, idx) => {
          const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
          const isChecked = selected.has(it.itemId);
          // 고유 key: itemId → 보조로 idx
          const _key = it.itemId ?? `idx-${idx}`;
          return (
            <section key={_key} className="apn-card p-3">
              <div className="flex items-stretch gap-3">
                {/* 상품 선택 체크박스 */}
                <div className="pt-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(it.itemId)}
                  />
                </div>
                
                {/* (5) 고정 크기 이미지 */}
                <div
                  className="shrink-0 overflow-hidden border border-gray-200 rounded-lg"
                  style={{ width: 120, height: 120 }}
                >
                  <Image
                    src={imgSrc(it)}
                    alt={it?.name ? `${it.name} 썸네일` : '상품 이미지'}
                    width={120}
                    height={120}
                    className="object-cover w-[120px] h-[120px]"
                    unoptimized
                  />
                </div>
                
                {/* 상품명/가격 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div className="font-medium leading-6 line-clamp-2" title={it.name}>
                    {it.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {formatKRW(Number(it.price) || 0)}원
                  </div>
                </div>

                   <div className="h-3 border-l border-gray-300 mt-[10px] mb-[10px]"></div>

                {/* 수량/금액 영역 */}
                <div className="w-[160px] flex flex-col items-center justify-between py-1">
                  {/* 수량 */}
                  <div className="text-sm text-gray-600">수량</div>
                  <div className="mt-1 inline-flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-3d btn-white px-2 py-1 text-sm"
                      onClick={() => changeQty(it, -1)}
                      disabled={updateMut.isPending}
                      aria-label="수량 감소"
                    >
                      −
                    </button>
                    <span className="px-2 tabular-nums">{Number(it.quantity) || 0}</span>
                    <button
                      type="button"
                      className="btn-3d btn-white px-2 py-1 text-sm"
                      onClick={() => changeQty(it, +1)}
                      disabled={updateMut.isPending}
                      aria-label="수량 증가"
                    >
                      +
                    </button>
                  </div>

                  {/* 금액 */}
                  <div className="mt-3 text-sm text-gray-600">금액</div>
                  <div className="text-2xl font-extrabold tabular-nums">
                    {formatKRW(lineTotal)} <span className="text-base font-semibold">원</span>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* 하단 회색 실선 */}
      <hr className="border-gray-300" />

      {/* (13) 총 n건 주문금액 ___원 : 1줄 굵은 텍스트, 가운데 정렬 */}
      <div className="text-center my-6 text-2xl font-bold">
        총 <span className="tabular-nums">{selectedCount}</span>건&nbsp;&nbsp;
        주문금액 <span className="tabular-nums">{formatKRW(selectedTotal)}</span>원
      </div>

      {/* (14)(4) 버튼: 가운데 정렬 + 선택된 항목만 동작 */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          type="button"
          className="btn-3d btn-white px-4 py-2"
          disabled={selected.size === 0}
          onClick={() => {
            if (selected.size === 0) return;
            alert('주문 페이지는 준비 중입니다');
          }}
        >
          주문하기
        </button>
        <button
          type="button"
          className="btn-3d btn-white px-4 py-2"
          disabled={selected.size === 0 || removeMut.isPending}
          onClick={handleDeleteSelected}
        >
          삭제하기
        </button>
      </div>

      {/* 회색 실선 */}
      <hr className="border-gray-300" />

      {/* 안내 문구 */}
      <ul className="text-sm text-gray-600 my-6 leading-6 list-disc list-inside">
        <li>장바구니에 최대 00개의 상품을 담을 수 있습니다.</li>
        <li>장바구니 상품은 최대 00일간 저장됩니다.</li>
        <li>장바구니에 담긴 상품은 옵션 또는 추가상품 단위로 최대 100개의 상품만 동시 주문할 수 있습니다.</li>
        <li>가격, 옵션 등 정보가 변경된 경우 주문이 불가할 수 있습니다.</li>
        <li>일부 상품의 경우 카드 할부기간이 카드사 제공 기간보다 적게 제공될 수 있습니다.</li>
        <li>장바구니에 배송비는 표기되지 않으며, 주문 시 구매 금액이나 주문 주소지에 따라 추가 됩니다.</li>
      </ul>

      {/* 이 페이지 한정 스타일: 기존 UI 톤과 맞춘 3D 버튼/카드 */}
      <style jsx global>{`
        .btn-3d {
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          transition: transform 0.02s ease-in-out;
        }
        .btn-3d:active {
          transform: translateY(1px);
        }
        .btn-white {
          background: #ffffff;
        }
        .apn-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
        }
      `}</style>
    </main>
  );
}
