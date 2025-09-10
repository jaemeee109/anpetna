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
    any?.thumbnails?.[0] ||
    any?.item?.thumbnails?.[0] ||
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

  // ✅ 선택 상태: itemId 기준으로 관리
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

  // (9) 총 n건
  const selectedCount = selected.size;

  // (10) 선택 합계
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
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(cart.items.map((it) => it.itemId)));
  };

  // (6) 수량 변경
  const changeQty = (it: CartItemDTO, delta: -1 | 1) => {
    const current = Math.max(1, Number(it.quantity) || 1);
    const next = Math.max(1, current + delta);
    if (next === current) return;
    updateMut.mutate({ itemId: it.itemId, quantity: next });
  };

  // (4)(16) 선택 삭제
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

  // 이미지 URL 보정
  const imgSrc = (it: CartItemDTO) => {
    const candidate = pickImagePath(it);
    const abs = toAbs(candidate, IMG_BASE);
    return abs || '/file.svg';
  };

  // (1) 본문 컨테이너 너비 고정 — 본문 폭은 여기에서만 조정 (카드 폭과 무관)
  //    ▶ 원하는 폭으로 바꿔 사용: w-[750px] → w-[900px] 등
  return (
    <main className="mx-auto w-[750px] px-4">
      <h1 className="text-2xl font-semibold text-center mt-6 mb-4">
        CART&nbsp;<PawIcon />
      </h1>

      {/* 상단 회색 실선 */}
      <hr className="apn-hr" />

      {/* (2) 전체선택 */}
      <div className="flex items-center gap-2 py-3 mt-[20px] mb-[30px]">
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

      

      {/* (18) 비어있을 때 */}
      {!isLoading && (!cart?.items || cart.items.length === 0) && (
        <div className="py-20 text-center text-gray-500">장바구니가 비었습니다</div>
      )}

      {/* (3) 상품 카드들 */}
      <div className="flex flex-col gap-3 my-4 ">
        {cart?.items?.map((it, idx) => {
          const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
          const isChecked = selected.has(it.itemId);
          const _key = it.itemId ?? `idx-${idx}`;
          return (
            /**
             * ▶ (1)(2) 상품카드 크기 별개/고정
             * - 카드의 가로/세로 고정은 .cart-card 클래스에서 조정 (아래 style 블록)
             * - 필요 시 아래 className에서 w-[…], h-[…]로 직접 줄 수도 있음 (권장은 .cart-card에서 통합 관리)
             */
            <section key={_key} className="apn-card cart-card p-3">
              {/* ✅ 카드 상단 한 줄 전체를 체크박스가 차지 */}
              <div className="pb-2">
                {/**
                 * ▶ (3) 체크박스 크기 조절: .card-check 에서 scale/size 조정
                 */}
                <input
                  type="checkbox"
                  className="card-check"
                  checked={isChecked}
                  onChange={() => toggleOne(it.itemId)}
                />
              </div>

              {/* 본문 행 */}
              <div className="flex items-stretch gap-3 h-[calc(100%-36px)]">
                {/**
                 * ▶ (4) 썸네일 크기 조절: .card-thumb에서 가로/세로 조정
                 *   - 아래 <Image>의 width/height 숫자도 .card-thumb의 값과 동일하게 맞춰줄 것
                 */}
                <div className="card-thumb shrink-0 overflow-hidden rounded-lg ml-[15px] mr-[15px]">
                  <Image
                    src={imgSrc(it)}
                    alt={it?.name ? `${it.name} 썸네일` : '상품 이미지'}
                    width={140}   /* ← 썸네일 가로(px) — .card-thumb와 일치시킬 것 */
                    height={140}  /* ← 썸네일 세로(px) — .card-thumb와 일치시킬 것 */
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                </div>

                {/* 이미지 제외 영역: 가운데 세로선 고정 + 우측 반영역 중앙 정렬 */}
                <div className="flex-1 relative">
                  <div className="apn-vline-abs" />

                  {/* 좌/우 2등분 */}
                  <div className="grid grid-cols-2 h-full">
                    {/**
                     * ▶ (5) 상품명/금액 타이포/여백/정렬 조정:
                     *   - .info-name / .info-price (글자 크기/줄수/두께/여백)
                     *   - .info-box(좌측 컨테이너 패딩/정렬)
                     */}
                    <div className="info-box min-w-0 flex items-start">
                      <div>
                        <div className="info-name" title={it.name}>
                          {it.name}
                        </div>
                        <div className="info-price">
                          {formatKRW(Number(it.price) || 0)}원
                        </div>
                      </div>
                    </div>

                    {/* 우측: 수량/금액 — 오른쪽 절반 중앙 정렬 */}
                    <div className="py-1 pl-6 flex flex-col items-center justify-start gap-3 mt-[10px]">
                      <div>
                        <div className="qty-label text-center">수량</div>
                        <div className="qty-box mt-1">
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(it, -1)}
                            disabled={updateMut.isPending}
                            aria-label="수량 감소"
                          >
                            −
                          </button>
                          <span className="qty-num">{Number(it.quantity) || 0}</span>
                          <button
                            type="button"
                            className="qty-btn"
                            onClick={() => changeQty(it, +1)}
                            disabled={updateMut.isPending}
                            aria-label="수량 증가"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="text-center mt-[13px]">
                        <div className="amt-label">금액</div>
                        <div className="amt-strong">
                          {formatKRW(lineTotal)} <span className="amt-won">원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      

      {/* (4) 총 n건 주문금액 — 글씨 크기 조절은 .cart-summary 에서 */}
      <div className="cart-summary text-center my-6 mt-[30px] font-bold">
       <b> 총 </b><span className="tabular-nums">{selectedCount}</span><b>건</b>&nbsp;&nbsp;
        <b>주문금액</b> <span className="tabular-nums">{formatKRW(selectedTotal)}</span><b>원</b>
      </div>

      {/* 버튼 */}
      <div className="flex justify-center gap-[10px] mt-[20px] mb-[20px]">
        <button
          type="button"
          className="btn-3d btn-white w-[120px] px-4 py-2"
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
          className="btn-3d btn-white w-[120px] px-4 py-2"
          disabled={selected.size === 0 || removeMut.isPending}
          onClick={handleDeleteSelected}
        >
          삭제하기
        </button>
      </div>

      {/* 회색 실선 */}
      <hr className="apn-hr" />

      {/**
       * ▶ (6) 장바구니 설명 리스트 글씨 색/크기 조절은 .cart-notes / .cart-notes li 에서
       */}
      <ul className="cart-notes my-6 mt-[20px] mb-[50px]">
        <li>장바구니에 최대 00개의 상품을 담을 수 있습니다.</li>
        <li>장바구니 상품은 최대 00일간 저장됩니다.</li>
        <li>장바구니에 담긴 상품은 옵션 또는 추가상품 단위로 최대 100개의 상품만 동시 주문할 수 있습니다.</li>
        <li>가격, 옵션 등 정보가 변경된 경우 주문이 불가할 수 있습니다.</li>
        <li>일부 상품의 경우 카드 할부기간이 카드사 제공 기간보다 적게 제공될 수 있습니다.</li>
        <li>장바구니에 배송비는 표기되지 않으며, 주문 시 구매 금액이나 주문 주소지에 따라 추가 됩니다.</li>
      </ul>

      {/* 이 페이지 한정 스타일 (요청한 항목들 조절 지점에 전부 주석 처리) */}
      <style jsx global>{`
        /* ----------------------------- 공통 버튼/카드 베이스 ----------------------------- */
        .btn-3d {
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          transition: transform 0.02s ease-in-out;
        }
        .btn-3d:active { transform: translateY(1px); }
        .btn-white { background: #ffffff; }

        .apn-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          overflow: hidden;  /* 썸네일이 카드 밖으로 보이지 않게 */
        }

        /* ----------------------------- (6) 실선 색상 조절 ----------------------------- */
        .apn-hr { border-color: #f0f0f0ff; } /* 필요 시 한 번에 변경 */
        .apn-vline-abs {
          position: absolute;
          top: 10px;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          border-left: 1px solid #d9d9df; /* 필요 시 색 조정 */
          pointer-events: none;
        }

        /* ----------------------------- (1)(2) 카드 크기 별개/고정 ----------------------------- */
        /* ▶ 여기서 "본문과 별개로" 카드 가로/세로를 고정한다 */
        .cart-card {
          width: 650px;    /* ← 카드 가로 고정(px). 본문 폭과 무관. 원하는 값으로 변경 */
          height: 200px;   /* ← 카드 세로 고정(px). auto 금지 요구 반영 */
          margin: 0 auto;  /* 카드 자체 가운데 정렬 */
          margin-bottom: 20px;
          display: block;
        }

        /* ----------------------------- (3) 체크박스 크기 조절 ----------------------------- */
        /* 방법 A) 스케일로 확대/축소 (가장 호환성 좋음) */
        .card-check {
          transform: scale(1.2); /* ← 체크박스 크기 배율. 1.0~2.0 사이로 조정 */
          transform-origin: top left;
          margin-left: 10px;
          margin-top: 10px;
          margin-bottom: 10px;
        }
        /* 방법 B) 실제 사이즈 지정 (브라우저별 차이 존재) */
        /* .card-check { width: 30px; height: 30px; } */

        /* ----------------------------- (4) 썸네일 크기 조절 ----------------------------- */
        /* ▶ 아래 값 변경 시, 위 <Image width/height> 숫자도 같은 값으로 수정 */
        .card-thumb { 
        width: 140px; 
        height: 140px; 
        margin-left: 20px;
        margin-bottom:20px;
        } /* ← 썸네일 가로/세로(px) */

        /* ----------------------------- (5) 상품명/금액 타이포 & 여백/정렬 ----------------------------- */
        .info-box { padding: 4px 16px 4px 0; } /* ← 좌측 텍스트 영역 여백 (top/right/bottom/left) */
        .info-name {
          font-size: 20px;    /* ← 상품명 글씨 크기 */
          font-weight: 600;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;   /* 2줄 말줄임 */
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin-top: 20px;
          margin-bottom: 15px;  /* ← 상품명과 가격 사이 간격 */
          
        }
        .info-price {
          font-size: 15px;     /* ← 상품 단가 글씨 크기 */
          color: #4b5563;      /* text-gray-600 */
          margint-left: 10px;
        }

        /* 수량 영역(버튼 3개는 기존 스타일 유지) */
        .qty-label { font-size: 13px; color: #4b5563;}
        .qty-box {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: none;  /* 외곽 큰 테두리 없앰 */
          padding: 0;
          background: transparent;
        }
        .qty-btn {
          width: 26px; height: 26px;
          line-height: 24px;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          background: #ffffff;
          box-shadow: 0 2px 0 rgba(0,0,0,0.06);
          font-size: 16px;
        }
        .qty-btn:active { transform: translateY(1px); }
        .qty-num {
          min-width: 24px;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .amt-label { margin-top: 6px; font-size: 13px; color: #4b5563; }
        .amt-strong { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; }
        .amt-won { font-size: 15px; font-weight: 700; }

        /* ----------------------------- (4) 하단 요약 줄 크기 ----------------------------- */
        .cart-summary { 
        font-size: 21px; } /* ← 하단 "총 N건 주문금액" 글씨 크기 */

        /* ----------------------------- (6) 설명 리스트 글씨/색/불릿 ----------------------------- */
        .cart-notes {
          /* 글씨 크기/색은 여기서 조정 */
          font-size: 13px;     /* ← 설명 글씨 크기 */
          color: #4b5563;      /* ← 설명 글씨 색 */
          line-height: 1.6;
          list-style: none;    /* 기본 불릿 제거 */
          padding-left: 0;
          
        }
        .cart-notes li { position: relative; padding-left: 14px; }
        .cart-notes li::before {
          content: '·';        /* 작은 점 불릿 */
          position: absolute;
          left: 0;
          top: 0;
          line-height: 1.2;
          font-size: 18px;     /* 불릿 크기 */
          color: #4b5563;      /* 불릿 색상 */
        }
      `}</style>
    </main>
  );
}
