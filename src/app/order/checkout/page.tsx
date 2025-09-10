'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import { useCart } from '@/features/cart/hooks/useCart';
import type { CartItemDTO } from '@/features/cart/data/cart.types';
import { readMemberMe } from '@/features/member/data/member.api'; // ✅ 공식 API 사용
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

  /** ===== [추가] cart / item 모드 판별 및 파라미터 ===== */
  const mode: 'cart' | 'item' = useMemo(() => {
    if (params.get('mode')) {
      const m = String(params.get('mode')).toLowerCase();
      return m === 'item' ? 'item' : 'cart';
    }
    return params.get('itemId') ? 'item' : 'cart';
  }, [params]);
  const itemIdParam = params.get('itemId');
  const qtyParam = Math.max(1, parseInt(String(params.get('qty') || '1'), 10) || 1);

  // cartItems=1,2,3 -> 숫자 배열
  const selectedIds = useMemo(() => {
    const raw = String(params.get('cartItems') || '').trim();
    if (!raw) return [] as number[];
    return raw
      .split(',')
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  }, [params]);

  /** ===== [추가] item 모드일 때 단건 아이템을 상세에서 로드해 CartItemDTO로 매핑 ===== */
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

  // ✅ 공식 readMemberMe() 사용 — 토큰/세션/베이스URL/헤더를 통합 처리
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await readMemberMe(); // returns member fields (관대 객체)
        if (!mounted) return;

        // ✅ (2) detail 보완: 키 편차 광범위 대응 (실제 응답 중 하나라도 있으면 채움)
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
      } catch {
        setBuyer(EMPTY_ADDR);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ (3)(7) 배송지 = 주문자 동일 토글 (detail 포함 복사)
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

  /** ===== [교체] 결제하기: 서버에 주문 생성 요청 후 완료 페이지로 이동 ===== */
  const onPay = async () => {
    if (!orderItems.length) {
      alert('주문할 상품이 없습니다.');
      return;
    }

    try {
      const body =
        mode === 'item'
          ? { mode: 'ITEM', itemId: Number(itemIdParam), quantity: qtyParam }
          : { mode: 'CART', itemIds: orderItems.map((it) => Number(it.itemId)) };

      const resp = await fetch(`${IMG_BASE}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await resp.clone().json().catch(() => null as any);
      if (!resp.ok) throw new Error(data?.message || data?.resMessage || `주문 생성 실패 (HTTP ${resp.status})`);

      const payload: any = data?.result ?? data;
      const ordersId = payload?.ordersId ?? payload?.id ?? null;
      if (!ordersId) throw new Error('주문번호를 받지 못했습니다.');

      alert('주문에 성공했습니다');
      router.replace(`/order/complete/${ordersId}`);
    } catch (e: any) {
      alert(e?.message || '주문 처리 중 오류가 발생했습니다.');
    }
  };

  const onCancel = () => {
    router.back();
  };

  // (본문 너비 고정 + 중앙정렬)
  return (
    <RequireLogin>
      <main className="mx-auto w-[750px] px-4">
        <h1 className="text-2xl font-semibold text-center mt-[30px] mb-[30px]">Order&nbsp;<PawIcon/></h1>
        <hr className="apn-hr mb-[45px]" />

        {/* ===================== (1) 주문자 정보 : 제목은 카드 바깥/왼쪽, 내용은 카드 안 ===================== */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">주문자 정보</h2>
        <section className="apn-card p-4">
          <div className="flex flex-col items-center gap-2">
            {/* (1) 주문자 정보는 input 대신 글자만 보이도록 변경 */}
            <div className="flex items-center gap-3 ">
              <label className="w-[140px] text-right">NAME : </label>
              <span className="order-plain">{buyer.name || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <label className="w-[140px] text-right">TEL : </label>
              <span className="order-plain ml-[5px]"> {buyer.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <label className="w-[140px] text-right">ZIPCODE : </label>
              <span className="order-plain ml-[5px]"> {buyer.zip || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <label className="w-[140px] text-right">Road Address : </label>
              <span className="order-plain ml-[5px]"> {buyer.road || '-'}</span>
            </div>
            <div className="flex items-center gap-5">
              <label className="w-[140px] text-right">Detail Address : </label>
              <span className="order-plain ml-[5px]"> {buyer.detail || '-'}</span>
            </div>
          </div>
        </section>

        {/* ===================== (3) 배송지 정보 : 제목 옆에 '주문자 정보와 동일' (카드 바깥, 작은 글씨) ===================== */}
        <div className="flex items-center gap-2 mt-[20px] mb-[8px]">
          <h2 className="text-lg font-semibold text-left">배송지 정보</h2>
          <label htmlFor="ship-same" className="text-[12px] flex items-center gap-1 select-none">
            <input
              id="ship-same"
              type="checkbox"
              checked={shipSame}
              onChange={(e) => setShipSame(e.target.checked)}
            />
            주문자 정보와 동일
          </label>
        </div>
        <section className="apn-card p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-right">이름</label>
              <input
                className="order-input"
                value={ship.name}
                onChange={(e) => setShip((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-right">연락처</label>
              <input
                className="order-input"
                value={ship.phone}
                onChange={(e) => setShip((s) => ({ ...s, phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-right">Zipcode</label>
              <input
                className="order-input"
                value={ship.zip}
                onChange={(e) => setShip((s) => ({ ...s, zip: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-right">Road Address</label>
              <input
                className="order-input"
                value={ship.road}
                onChange={(e) => setShip((s) => ({ ...s, road: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-right">Detail address</label>
              <input
                className="order-input"
                value={ship.detail}
                onChange={(e) => setShip((s) => ({ ...s, detail: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* ===================== 주문상품 : 제목 카드 바깥/왼쪽, 행 표현 고정 ===================== */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">주문상품</h2>
        <section className="apn-card p-4">
          {!orderItems.length ? (
            <div className="py-10 text-center text-gray-500">선택된 상품이 없습니다.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {orderItems.map((it, idx) => {
                const lineTotal = (Number(it.price) || 0) * (Number(it.quantity) || 0);
                const key = it.itemId ?? `idx-${idx}`;
                return (
                  // ✅ (3) 썸네일+상품명 | n개 | nnnn원 (세로실선)
                  <div key={key} className="flex items-center px-2">
                    {/* 왼쪽: 썸네일 + 상품명 */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="order-thumb">
                        <Image
                          src={imgSrc(it)}
                          alt={it?.name ? `${it.name} 썸네일` : '상품 이미지'}
                          width={60}
                          height={60}
                          className="object-cover w-full h-full"
                          unoptimized
                        />
                      </div>
                      <div className="truncate">{it.name}</div>
                    </div>

                    {/* 가운데: 수량 - 세로 실선 좌측 */}
                    <div className="w-[90px] text-center border-l border-gray-300 py-2 mx-2">
                      {Number(it.quantity) || 0}개
                    </div>

                    {/* 오른쪽: 금액 - 세로 실선 좌측 */}
                    <div className="w-[140px] text-right border-l border-gray-300 py-2">
                      {formatKRW(lineTotal)} <span className="text-sm">원</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ===================== 결제수단 : 제목 카드 바깥/왼쪽, 아이콘 유지 ===================== */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">결제수단</h2>
        <section className="apn-card p-4">
          <div className="flex items-center justify-center gap-2">
            <input id="pay-card" type="checkbox" defaultChecked />
            <label htmlFor="pay-card" className="flex items-center gap-1">
              카드
              {/* (8) 부트스트랩 카드 아이콘 */}
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                   fill="currentColor" viewBox="0 0 16 16" className="inline-block">
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/>
                <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z"/>
              </svg>
            </label>
          </div>
        </section>

        {/* ===================== (4) 개인정보 제공 동의 : 체크박스는 카드 바깥 왼쪽정렬 ===================== */}
        <div className="flex items-center gap-2 mt-[20px] mb-[8px]">
          <h2 className="text-lg font-semibold text-left"><input id="agree-privacy" type="checkbox" />개인정보 제공 동의</h2>
          
        </div>
        <section className="apn-card p-4">
          {/* 안내문: 더 작고 옅은 색 (기존 유지) */}
          <div className="text-[12px] leading-5 text-gray-600">
            ·개인정보를 제공받는 자: 상품 및 서비스 판매자<br />
            · 제공하는 개인정보 항목: 이름, 아이디, (휴대)전화번호, 상품 구매정보, 결제수단, 상품 수령인 정보(배송상품:수령인명,
            주소, 출입방법 및 수령위치(필요 상품 주문 시에만 해당), (휴대)전화번호/ 쿠폰:이름, 네이버 아이디, 휴대전화번호)
            <br />
            · 개인정보를 제공받는 자의 이용목적: 판매자와 구매자의 원활한 거래 진행, 본인의사의 확인, 고객상담 및
            불만처리/부정이용 방지 등의 고객관리, 물품배송, 통관, 새로운 상품/서비스 정보와 고지사항의 안내, 상품/서비스 구매에
            따른 혜택 제공, 서비스 개선·통계·분석 <br />
            · 개인정보를 제공받는 자의 개인정보 보유 및 이용기간: 개인정보 이용목적 달성 시까지 보존합니다. 단, 관계 법령의
            규정에 의하여 일정 기간 보존이 필요한 경우에는 해당 기간만큼 보관 후 삭제합니다. <br />
            위 개인정보 제공 동의를 거부할 권리가 있으나, 거부 시 상품 구매가 불가능합니다.
          </div>
        </section>

        {/* ===================== 합계 ===================== */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">합계</h2>
        <section className="apn-card p-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-[420px] flex justify-between">
              <div>총 주문금액</div>
              <div>
                {formatKRW(itemsTotal)} <span className="text-sm">원</span>
              </div>
            </div>
            <div className="w-[420px] flex justify-between">
              <div>+ 배송비</div>
              <div>
                {formatKRW(shippingFee)} <span className="text-sm">원</span>
              </div>
            </div>
            <div className="w-[420px] flex justify-between font-bold mt-1">
              <div>결제금액</div>
              <div>
                {formatKRW(payTotal)} <span className="text-sm">원</span>
              </div>
            </div>
            {/* (5) 결제금액 아래 안내문 */}
            <div className="w-[420px] text-[12px] text-gray-400 mt-1">
              ※ 도서,산간 지방의 경우 기본 배송비 (3,000원) 외에 별도의 배송비가 추가 됩니다
            </div>
          </div>
        </section>

        {/* ===================== 버튼 ===================== */}
        <div className="flex justify-center gap-[10px] mt-[20px] mb-[30px]">
          <button type="button" className="btn-3d btn-white w-[120px] px-4 py-2" onClick={onPay}>
            결제하기
          </button>
          <button type="button" className="btn-3d btn-white w-[120px] px-4 py-2" onClick={onCancel}>
            취소하기
          </button>
        </div>

        <hr className="apn-hr" />

        {/* ====== 이 페이지 한정 스타일 (디테일 수정 지점) ====== */}
        <style jsx global>{`
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
            overflow: hidden;
           
          }

          .apn-hr { border-color: #f0f0f0ff; }

          /* 입력 공통 (배송지 입력 필드 전용) */
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
            margin-top: 15px;
            margin-bottom: 15px;
            margin-left: 15px;
          }

          /* (1) 주문자 정보 표시는 input이 아니라 텍스트만 보이도록 */
          .order-plain {
            display: inline-block;
            width: 300px;      /* 입력칸과 같은 폭으로 정렬 유지 */
            min-height: 28px;  /* 라인 높이 맞춤 */
            line-height: 28px;
            font-size: 13.5px;
            color: #111;
            
          }

          /* 주문상품 썸네일 */
          .order-thumb {
            width: 60px;
            height: 60px;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: #fff;
          }
        `}</style>
      </main>
    </RequireLogin>
  );
}
