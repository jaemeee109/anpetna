// src/app/order/checkout/page.tsx
'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import { useCart } from '@/features/cart/hooks/useCart';
import type { CartItemDTO } from '@/features/cart/data/cart.types';
import http from '@/shared/data/http';
import { readMemberMe } from '@/features/member/data/member.api'; 
import { withPrefix } from '@/lib/api';
import { createOrder, type CreateOrderBody } from '@/features/order/data/order.api';



import PawIcon from '@/components/icons/Paw';

/** 1,000 단위 , + 원 표시 없이 숫자만 반환 */
function formatKRW(n: number | bigint) {
  try {
    return new Intl.NumberFormat('ko-KR').format(Number(n ?? 0));
  } catch {
    return String(n ?? 0);
  }
}

/** 상세/장바구니와 동일: 이미지 베이스 추정 */
function resolveImgBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
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

/** 🔹 장바구니/아이템 DTO에서 썸네일 후보를 안전하게 뽑기 (장바구니 페이지와 동일) */
function pickImagePath(it: any): string {
  return (
    it?.imageUrl ||
    it?.thumbnailUrl ||
    it?.thumbnails?.[0] ||
    it?.item?.thumbnails?.[0] ||
    it?.images?.[0]?.url ||
    it?.item?.images?.[0]?.url ||
    ''
  );
}

/** ====== 주문자/배송지 타입 ====== */
type Buyer = {
  name: string;
  phone: string;
  zip: string;
  road: string;
  detail: string;
};
type Ship = Buyer;

const EMPTY_ADDR: Buyer = { name: '', phone: '', zip: '', road: '', detail: '' };

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: cart } = useCart();

  const IMG_BASE = resolveImgBase();

  /** ===== cart / item 모드 판별 및 파라미터 ===== */
  const mode: 'cart' | 'item' = useMemo(() => {
    if (params.get('mode')) {
      const m = String(params.get('mode')).toLowerCase();
      return m === 'item' ? 'item' : 'cart';
    }
    return params.get('itemId') ? 'item' : 'cart';
  }, [params]);
  const itemIdParam = params.get('itemId');
  const qtyParam = Math.max(1, parseInt(String(params.get('qty') ?? params.get('quantity') ?? '1'), 10) || 1);


  // cartItems=1,2,3 -> 숫자 배열
  const selectedIds = useMemo(() => {
    const raw = String(params.get('cartItems') || '').trim();
    if (!raw) return [] as number[];
    return raw
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [params]);

  /** ===== item 모드일 때 단건 아이템을 상세에서 로드해 CartItemDTO로 매핑 ===== */
  const [directItem, setDirectItem] = useState<CartItemDTO | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (mode !== 'item' || !itemIdParam) {
        setDirectItem(null);
        return;
      }
      try {
        const resp = await fetch(`${IMG_BASE}/item/${itemIdParam}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await resp.clone().json().catch(() => null as any);
        const r: any = data?.result ?? data;
        if (!resp.ok || !r?.itemId) throw new Error(data?.message || data?.resMessage || `상세 조회 실패 (HTTP ${resp.status})`);

        const it: CartItemDTO = {
          itemId: Number(r.itemId),
          name: String(r.itemName ?? ''),
          price: Number(r.itemPrice ?? 0),
          quantity: qtyParam,
          imageUrl: r?.thumbnailUrl || (Array.isArray(r?.imageUrls) ? r.imageUrls[0] : '') || '',
        };
        if (alive) setDirectItem(it);
      } catch (e) {
        if (alive) setDirectItem(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, itemIdParam, qtyParam, IMG_BASE]);

  // 장바구니에서 선택된 항목만 추림 (cart 모드)
  const orderItems: CartItemDTO[] = useMemo(() => {
    if (mode === 'item') {
      return directItem ? [directItem] : [];
    }
    const list = cart?.items || [];
    if (!selectedIds.length) return [];
    const set = new Set(selectedIds);
    return list.filter((it) => set.has(it.itemId));
  }, [mode, directItem, cart?.items, selectedIds]);

  // 금액 합계
  const itemsTotal = useMemo(
    () => orderItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0),
    [orderItems]
  );
  // ✅ (4) 배송비: 10만원 미만이면 3,000원, 이상이면 0원
  const shippingFee = itemsTotal < 100000 ? 3000 : 0;
  const payTotal = itemsTotal + shippingFee;

  // 주문자/배송지
  const [buyer, setBuyer] = useState<Buyer>(EMPTY_ADDR);
  const [ship, setShip] = useState<Ship>(EMPTY_ADDR);
  const [shipSame, setShipSame] = useState(false); // ✅ 기본: 체크 해제(=빈칸)
  // 백엔드 DTO 검증용 memberId
  const [meId, setMeId] = useState<string>('');

  // ✅ 공식 readMemberMe() 사용 — 토큰/세션/베이스URL/헤더를 통합 처리
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await readMemberMe(); // returns member fields (관대 객체)
        if (!mounted) return;

        const name = String(me?.memberName ?? me?.name ?? '').trim();
        const phone = String(me?.memberPhone ?? me?.phone ?? '').trim();
        const zip = String(me?.memberZipCode ?? me?.zipCode ?? '').trim();
        const road = String(me?.memberRoadAddress ?? me?.roadAddress ?? '').trim();
        const detail = String(
          me?.memberDetailAddress ??
          (me as any)?.memberDetailaddress ??
          (me as any)?.member_detail_address ??
          (me as any)?.memberDetailedAddress ??
          (me as any)?.detailedAddress ??
          me?.addressDetail ??
          me?.detailAddress ??
          (me as any)?.detail ??
          ''
        ).trim();

        setBuyer({ name, phone, zip, road, detail });
        
          // 다양한 키 후보에서 memberId 추출
          const uid = String(
            me?.memberId ?? (me as any)?.id ?? (me as any)?.memberEmail ?? me?.email ?? ''
          ).trim();
          setMeId(uid);
      } catch {
        setBuyer(EMPTY_ADDR);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ 배송지 = 주문자 동일 토글 (detail 포함 복사)
  useEffect(() => {
    if (shipSame) {
      setShip({
        name: buyer.name,
        phone: buyer.phone,
        zip: buyer.zip,
        road: buyer.road,
        detail: buyer.detail,
      });
    } else {
      setShip(EMPTY_ADDR);
    }
  }, [shipSame, buyer]);

  // 이미지 URL 보정
  const imgSrc = (it: CartItemDTO) => {
    const candidate = pickImagePath(it);
    const abs = toAbs(candidate, IMG_BASE);
    return abs || '/file.svg';
  };

  /** ===== 결제하기: 서버에 주문 생성 요청 후 완료 페이지로 이동 ===== */


// src/app/order/checkout/page.tsx  안의 onPay 함수 전체교체
const onPay = async () => {
  // (1) 입력 검증 (기존 유지)
  const required = [ship.name, ship.phone, ship.zip, ship.road, ship.detail];
  if (required.some(v => !String(v ?? '').trim())) {
    alert('배송지 정보가 비어 있습니다. (이름/연락처/우편번호/주소/상세주소)');
    return;
  }
  const agree = (document.getElementById('agree-privacy') as HTMLInputElement | null)?.checked;
  if (!agree) {
    alert('개인정보 제공에 동의해야 결제할 수 있습니다.');
    return;
  }
  if (!orderItems.length) {
    alert('주문할 상품이 없습니다.');
    return;
  }

  try {
    // (2) 백엔드 CreateOrderReq.items 스키마로 정규화
    const items =
      mode === 'item'
        ? [{ itemId: Number(itemIdParam), quantity: qtyParam }]
        : orderItems.map(it => ({ itemId: Number(it.itemId), quantity: Number(it.quantity ?? 1) }));

    // (3) 배송지 AddressDTO (Back AddressEntity ↔ AddressDTO 매핑과 동일)
    const shippingAddress = {
      zipcode: String(ship.zip),
      street: String(ship.road),
      detail: String(ship.detail),
      receiver: String(ship.name),
       phone: String(ship.phone), 
    };

    // (4) memberId/cardId 생성
    const me = await readMemberMe();
    const memberId = String(me?.memberId ?? me?.id ?? me?.loginId ?? '').trim();

    const body = {
      memberId,
      cardId: 'CARD-' + memberId,
      useSavedAddress: false,
      shippingAddress,
      items,
      shippingFee: itemsTotal < 100000 ? 3000 : 0, // ← 규칙 적용(10만원 미만 3000, 이상 0)
      
    };

    // (5) 주문 생성 (POST /order)
    const created = await createOrder(body);
    const ordersId = (created as any)?.ordersId ?? (created as any)?.result?.ordersId;
    if (!ordersId) throw new Error('주문번호를 받지 못했습니다.');

    // (6) 완료 페이지로 이동
    router.replace(`/order/pay/${ordersId}`);
  } catch (e: any) {
  // axios 에러든 fetch 에러든 최대한 상태코드/메시지 추출
  const status =
    e?.response?.status ?? e?.cause?.status ?? e?.status ??
    Number((e?.message || '').match(/\bHTTP\s*(\d{3})\b/)?.[1] || NaN);
  const msg =
    e?.response?.data?.message || e?.response?.data?.error ||
    e?.message || '오류가 발생했습니다.';

  if (status === 409 || /재고.*부족/i.test(msg)) {
    alert('재고 수 부족으로 주문할 수 없습니다.');
    return;
  }
  alert(msg);
}

};






  const onCancel = () => {
    router.back();
  };

  // (본문 너비 고정 + 중앙정렬)
  return (
    <RequireLogin>
      <main className="mx-auto w-[700px] px-4">
        <h1 className="text-2xl font-semibold text-center mt-[30px] mb-[30px]">Order&nbsp;<PawIcon/></h1>
        <hr className="apn-hr mb-[45px]" />

        {/* ===================== (1) 주문자 정보 ===================== */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">주문자 정보</h2>
        <section className="apn-card p-4 h-card-buyer">
          <div className="flex flex-col items-start gap-5 ml-[30px] mt-[20px] mb-[20px]">
            <div className="flex items-center gap-5 ">
              <span className="order-plain"><b>Name </b> : {buyer.name || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="order-plain ml-[5px]"><b>Tel</b> : {buyer.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="order-plain ml-[5px]"><b>Zipcode</b> : {buyer.zip || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="order-plain ml-[5px]"><b>Road Address</b> : {buyer.road || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <span className="order-plain ml-[5px]"><b>Detail Address</b> :  {buyer.detail || '-'}</span>
            </div>
          </div>
        </section>

        {/* ===================== (3) 배송지 정보 ===================== */}
        <div className="flex items-center gap-1 mt-[30px] mb-[0px] ">
          <h2 className="text-lg font-semibold text-left">배송지 정보</h2>
          <label htmlFor="ship-same" className="ml-[10px] text-[12px] flex items-center gap-1 select-none">
            <input
              id="ship-same"
              type="checkbox"
              checked={shipSame}
              onChange={(e) => setShipSame(e.target.checked)}
            />
            &nbsp;주문자 정보와 동일
          </label>
        </div>
        <section className="apn-card p-4 h-card-ship ">
          <div className="flex flex-col items-start gap-2 ml-[45px]">
            <div className="flex items-center gap-3 mt-[20px]">
              <label className="w-[140px] text-left">이름</label>
              <input
                className="order-input"
                value={ship.name}
                onChange={(e) => setShip((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">연락처</label>
              <input
                className="order-input"
                value={ship.phone}
                onChange={(e) => setShip((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">Zipcode</label>
              <input
                className="order-input"
                value={ship.zip}
                onChange={(e) => setShip((s) => ({ ...s, zip: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">Road Address</label>
              <input
                className="order-input"
                value={ship.road}
                onChange={(e) => setShip((s) => ({ ...s, road: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 mb-[20px]">
              <label className="w-[140px] text-left">Detail address</label>
              <input
                className="order-input"
                value={ship.detail}
                onChange={(e) => setShip((s) => ({ ...s, detail: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ===================== 주문상품 ===================== */}
        <h2 className="text-lg font-semibold mt-[50px] mb-[8px] text-left">주문상품</h2>
        <section className="apn-card p-4 h-card-items">
          {/*  상단 여백 컨트롤러 */}
          <div className="items-top-pad" />

          {!orderItems.length ? (
            <div className="py-10 text-center text-gray-500">선택된 상품이 없습니다.</div>
          ) : (
            //  행 간격 컨트롤러
            <div className="items-list">
              {orderItems.map((it, idx) => {
                const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
                const key = it.itemId ?? `idx-${idx}`;
                return (
                  // ▷ 각 행 자체 상/하 패딩 컨트롤러
                  <div key={key} className="items-row flex items-center px-2">
                    {/* 썸네일 고정폭 */}
                    <div className="order-thumb mr-2 mt-[20px] ml-[30px] mb-[20px]">
                      <Image
                        src={imgSrc(it)}
                        alt={it?.name ? `${it.name} 썸네일` : '상품 이미지'}
                        width={100}
                        height={100}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>

                    {/* 썸네일 제외 나머지 공간 정확히 3등분 + (커스텀 세로실선) */}
                    <div className="flex-1 grid grid-cols-3">
                      {/* 상품명 */}
                      <div className="px-3 flex items-center ml-[25px] min-w-0">
                        <div className="truncate">{it.name}</div>
                      </div>
                      {/* 수량 (⬅ 왼쪽 세로선) */}
                      <div className="px-3 flex items-center justify-center tabular-nums col-divide">
                        {Number(it.quantity) || 0}개
                      </div>
                      {/* 금액 (⬅ 왼쪽 세로선) */}
                      <div className="px-3 flex items-center mr-[40px] justify-end tabular-nums col-divide">
                        {formatKRW(lineTotal)} <span className="text-sm">원</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 하단 여백 컨트롤러  */}
          <div className="items-bottom-pad" />
        </section>

        {/* ===================== 결제수단 ===================== */}
        <h2 className="text-lg font-semibold mt-[50px] mb-[8px] text-left">결제수단</h2>
        <section className="apn-card p-4 h-card-pay">
          <div className="flex items-center justify-start gap-2 mt-[20px] ml-[15px]">
            <input id="pay-card" type="checkbox" defaultChecked />
            <label htmlFor="pay-card" className="flex items-center gap-1 ">
              {/* (8) 부트스트랩 카드 아이콘 */}
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"
                   fill="currentColor" viewBox="0 0 16 16" className="inline-block ml-[10px] mr-[10px]">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/>
                <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
              </svg> TOSS
            </label>
          </div>
        </section>

        {/* ===================== 개인정보 제공 동의 ===================== */}
        <div className="flex items-center gap-[5px] mt-[50px] mb-[3px]">
          <h2 className="text-lg font-semibold text-left  "><input id="agree-privacy" type="checkbox" />&nbsp;개인정보 제공 동의</h2>
        </div>
        <section className="apn-card p-4 h-card-priv ">
          <div className="private-note text-[12px] leading-5 text-gray-600">
            ·개인정보를 제공받는 자&nbsp;:&nbsp;상품 및 서비스 판매자
            <br /><p></p>
            · 제공하는 개인정보 항목: <br/>&nbsp;&nbsp;이름, 아이디, (휴대)전화번호, 상품 구매정보, 결제수단, 
            <br/>&nbsp;&nbsp;상품 수령인 정보(배송상품:수령인명,
            주소, 출입방법 및 수령위치(필요 상품 주문 시에만 해당), 
            <br />&nbsp;&nbsp;(휴대)전화번호/ 쿠폰:이름, 네이버 아이디, 휴대전화번호)
            <p></p>
            <br />· 개인정보를 제공받는 자의 이용목적: 판매자와 구매자의 원활한 거래 진행, 본인의사의 확인, 
            <br />&nbsp;&nbsp;고객상담 및 불만처리/부정이용 방지 등의 고객관리, 물품배송, 통관, 새로운 상품/서비스 정보와 고지사항의 안내, 
            <br />&nbsp;&nbsp;상품/서비스 구매에
            따른 혜택 제공, 서비스 개선·통계·분석 <br />
            <p></p>
            · 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 
            <br />&nbsp;&nbsp;개인정보 이용목적 달성 시까지 보존합니다. 
            <br />&nbsp;&nbsp;단, 관계 법령의 규정에 의하여 일정 기간 보존이 필요한 경우에는 해당 기간만큼 보관 후 삭제합니다. <br />
            <br />위 개인정보 제공 동의를 거부할 권리가 있으나, 거부 시 상품 구매가 불가능합니다.
          </div>
        </section>

        {/* ===================== 합계 ===================== */}
        <h2 className="text-lg font-semibold mt-[50px] mb-[15px] text-left">결제금액</h2>
        <section className="apn-card p-4 h-card-sum">
          {/* 가운데 정렬 유지 */}
          <div className="sum-center-wrap">
            {/* ▷ 총 주문금액 행 */}
            <div className="sum-row total w-[420px] flex justify-between mt-[35px]">
              <div>총 주문금액</div>
              <div>{formatKRW(itemsTotal)} <span className="text-sm ">원</span></div>
            </div>

            {/* ▷ 배송비 행 */}
            <div className="sum-row shipping w-[420px] flex justify-between">
              <div>+ 배송비</div>
              <div>{formatKRW(shippingFee)} <span className="text-sm">원</span></div>
            </div>

            {/* ▷ 배송비 ↔ 결제금액 사이 구분선 */}
            <div className="sum-divider" />

            {/* ▷ 결제금액 행 */}
            <div className="sum-row pay w-[420px] flex justify-between font-bold mt-1">
              <div>결제금액</div>
              <div className="pay-amount"><b>{formatKRW(payTotal)} </b><span className="text-sm">원</span></div>
            </div>

            {/* ▷ 안내문 */}
            <div className="w-[420px] rural-note mt-[20px] mb-[25px]">
              ※&nbsp;총 주문금액이 100,000원 이상일 경우, 배송비는 무료입니다         
             <br />  ※&nbsp;도서산간지역은 추가 배송비가 발생할 수 있어  판매자가 별도로 안내드립니다
              <br/>&nbsp;&nbsp;&nbsp;·&nbsp;기본 배송비 3,000원은 결제 시 포함
              
            </div>
          </div>
        </section>

        {/* ===================== 버튼 ===================== */}
        <div className="flex justify-center gap-[20px] mt-[40px] mb-[150px]">
          <button type="button" className="btn-3d btn-white w-[200px] px-4 py-2" onClick={onPay}>
            결제하기
          </button>
          <button type="button" className="btn-3d btn-white w-[200px] px-4 py-2" onClick={onCancel}>
            취소하기
          </button>
        </div>

        {/* ====== 이 페이지 한정 스타일 ====== */}
        <style jsx global>{`
          /* =========================
             전역 CSS 변수 (네가 조절)
             ========================= */
          :root {
            /* 주문상품 카드 여백(상/하) & 행 간격/패딩 */
            --order-items-card-top-gap: 20px;
            --order-items-card-bottom-gap: 20px;
            --order-items-row-gap: 12px;
            --order-items-row-py: 0px;

            /* (세로실선 색상) */
            --items-divider-color: #d1d5db;       /* 원하는 색으로 바꿔 */

            /* 결제금액 카드 */
            --sum-divider-color: #e5e7eb;
            --sum-rows-gap: 8px;
            --sum-total-fs: 14px;
            --sum-total-color: #111111;
            --sum-shipping-fs: 14px;
            --sum-shipping-color: #111111;
            --sum-pay-fs: 18px;
            --sum-pay-color: #111111;
          }

          /* 버튼(3D) */
          .btn-3d {
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 0 rgba(0,0,0,0.06);
            border-radius: 12px;
            transition: transform 0.02s ease-in-out;
          }
          .btn-3d:active { transform: translateY(1px); }
          .btn-white { background: #ffffff; }

          /* 카드 공통 */
          .apn-card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            box-shadow: 0 2px 0 rgba(0,0,0,0.06);
            overflow: hidden;
          }

          .apn-hr { border-color: #f0f0f0ff; }

          /* 배송지 입력 */
          .order-input {
            display: inline-block;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            height: 28px;
            padding: 3px 8px;
            font-size: 13.5px;
            color: #111;
            width: 200px;
            background: #fff;
            margin-top: 10px;
            margin-bottom: 10px;
            margin-left: 15px;
          }

          /* 주문자 텍스트 */
          .order-plain {
            display: inline-block;
            width: 300px;
            min-height: 28px;
            line-height: 28px;
            font-size: 15px;
            color: #111;
          }

          /* 썸네일 */
          .order-thumb {
            width: 100px; height: 100px;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: #fff;
          }

          /* 섹션 높이 */
          .h-card-buyer { min-height: 140px; }
          .h-card-ship  { min-height: 220px; }
          .h-card-items { min-height: 150px; }
          .h-card-pay   { min-height: 80px;  }
          .h-card-sum   { min-height: 200px; }
          .h-card-priv  { height: 350px; }

          /* 결제금액 강조 */
          .pay-amount { font-size: var(--sum-pay-fs); }
          .rural-note { font-size: 12px; color: #6b7280; }
          .private-note { font-size: 13px; color: #3f3f3fff; margin-top: 20px; margin-left: 20px; gap: 10px; }

          /* 주문상품 여백/간격 */
          .items-top-pad { height: var(--order-items-card-top-gap); }
          .items-list { display: flex; flex-direction: column; row-gap: var(--order-items-row-gap); }
          .items-row { padding-top: var(--order-items-row-py); padding-bottom: var(--order-items-row-py); }
          .items-bottom-pad { height: var(--order-items-card-bottom-gap); }

          /* ✅ 세로실선: 2,3번째 칸에만 border-left 지정 (색은 변수) */
          .col-divide { border-left: 1px solid var(--items-divider-color); }

          /* 결제금액 카드 정렬/간격/타이포 */
          .sum-center-wrap {
            display: flex; flex-direction: column; align-items: center;
            row-gap: var(--sum-rows-gap);
          }
          .sum-row.total    { 
          font-size: 15px(--sum-total-fs);    
          color: var(--sum-total-color); 
          }
          .sum-row.shipping { 
          font-size: 15px(--sum-shipping-fs); 
          color: var(--sum-shipping-color); 
          margin-top: 10px;
          margin-bottom:5px;
          }
          .sum-row.pay      { 
          font-size: 25px(--sum-pay-fs);      
          color: var(--sum-pay-color); 
          }

          /* 배송비 ↔ 결제금액 사이 구분선 (색은 변수) */
          .sum-divider {
            width: 420px; height: 1px;
            background: var(--sum-divider-color);
            margin: 8px 0;
          }
        `}</style>
      </main>
    </RequireLogin>
  );
}
