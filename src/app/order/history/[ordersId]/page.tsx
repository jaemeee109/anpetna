// src/app/order/history/[ordersId]/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import orderApi from '@/features/order/data/order.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

/** ===== 이미지 베이스/절대경로 (checkout과 동일 로직) ===== */
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
function toAbs(url?: string, base?: string) {
  const u = url || '';
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const B = (base || '').replace(/\/+$/, '');
  const p = u.startsWith('/') ? u : `/${u}`;
  return `${B}${p}`;
}
/** 상세 품목에서 썸네일 후보 선택 */
function pickImagePath(it: any): string {
  return (
    it?.thumbnailUrl ||
    it?.imageUrl ||
    it?.thumbnails?.[0] ||
    it?.images?.[0]?.url ||
    it?.item?.thumbnailUrl ||
    it?.item?.images?.[0]?.url ||
    ''
  );
}

export default function OrderDetailPage() {
  const { ordersId } = useParams<{ ordersId: string }>();
  const id = Number(Array.isArray(ordersId) ? ordersId[0] : ordersId);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['order', 'detail', id],
    queryFn: () => orderApi.detail(id),
    enabled: Number.isFinite(id) && id > 0,
  });

  // 배송지 입력 폼 상태 (초기값: 서버 값)
  const [addr, setAddr] = useState({ zipcode: '', street: '', detail: '', receiver: '' });
  useEffect(() => {
    if (data?.shippingAddress) {
      setAddr({
        zipcode: data.shippingAddress.zipcode ?? '',
        street: data.shippingAddress.street ?? '',
        detail: data.shippingAddress.detail ?? '',
        receiver: data.shippingAddress.receiver ?? '',
      });
    }
  }, [data]);

  const mUpdate = useMutation({
    mutationFn: (a: typeof addr) => orderApi.updateAddress(id, a),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['order', 'detail', id] });
      alert('배송지가 저장되었습니다.');
    },
    onError: (e: any) => alert(e?.message || '배송지 저장 실패'),
  });

  if (isLoading) return <div className="px-4 py-10 text-center">불러오는 중…</div>;
  if (error) return <div className="px-4 py-10 text-center text-red-600">오류: {(error as any)?.message}</div>;
  if (!data) return null;

  const items = Array.isArray(data.ordersItems) ? data.ordersItems : [];
  const IMG_BASE = resolveImgBase();

  // ===== 합계(주문페이지와 동일 규칙) =====
  const itemsTotal = items.reduce(
    (sum, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
    0
  );
  const shippingFee =
    data?.shippingFee != null ? Number(data.shippingFee) : itemsTotal < 100000 ? 3000 : 0;
  const payTotal =
    data?.totalAmount != null ? Number(data.totalAmount) : itemsTotal + shippingFee;

  return (
    <RequireLogin>
      {/* ▶ 체크아웃과 동일한 폭/레이아웃 */}
      <main className="mx-auto w-[700px] px-4">
        <h1 className="text-2xl font-semibold text-center mt-[30px] mb-[20px]">Order Detail</h1>
        <p className="text-center mb-[24px]">
          <span className="font-semibold">주문번호:&nbsp;</span>
          <span className="font-bold text-emerald-600">{id}</span>
        </p>

        {/* (1) 배송지 정보 — 주문페이지와 동일 UI/클래스 */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">배송지 정보</h2>
        <section className="apn-card p-4 h-card-ship">
          <div className="flex flex-col items-start gap-2 ml-[45px]">
            <div className="flex items-center gap-3 mt>[20px]">
              <label className="w-[140px] text-left">이름</label>
              <input
                className="order-input"
                value={addr.receiver}
                onChange={(e) => setAddr((s) => ({ ...s, receiver: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">연락처</label>
              <input
                className="order-input"
                value={'' as any}
                onChange={() => {}}
                placeholder="연락처 입력"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">Zipcode</label>
              <input
                className="order-input"
                value={addr.zipcode}
                onChange={(e) => setAddr((s) => ({ ...s, zipcode: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-[140px] text-left">Road Address</label>
              <input
                className="order-input"
                value={addr.street}
                onChange={(e) => setAddr((s) => ({ ...s, street: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3 mb-[10px]">
              <label className="w-[140px] text-left">Detail address</label>
              <input
                className="order-input"
                value={addr.detail}
                onChange={(e) => setAddr((s) => ({ ...s, detail: e.target.value }))}
              />
            </div>

            <div className="mt-2">
              <button className="btn-3d btn-white !px-4 !py-2" onClick={() => mUpdate.mutate(addr)}>
                배송지변경 저장
              </button>
            </div>
          </div>
        </section>

        {/* (2) 결제수단 — 체크박스 체크 고정 + 수정불가 (주문페이지 디자인 유지) */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">결제수단</h2>
        <section className="apn-card p-4 h-card-pay">
          <div className="flex items-center justify-start gap-2 mt-[20px] ml-[15px]">
            <input id="pay-card" type="checkbox" checked readOnly disabled />
            <label htmlFor="pay-card" className="flex items-center gap-1 ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                fill="currentColor"
                viewBox="0 0 16 16"
                className="inline-block ml-[10px] mr-[10px]"
              >
                <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z" />
                <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
              </svg>
              카드
            </label>
          </div>
        </section>

        {/* (3) 개인정보 제공 동의 — 체크박스 체크 고정 + 수정불가 + 주문페이지 문구 그대로 */}
        <div className="flex items-center gap-[5px] mt-[50px] mb-[3px]">
          <h2 className="text-lg font-semibold text-left">
            <input id="agree-privacy" type="checkbox" checked readOnly disabled />&nbsp;개인정보 제공 동의
          </h2>
        </div>
        <section className="apn-card p-4 h-card-priv">
          <div className="private-note text-[13px] ml-[30px] mt-[25px] leading-5 text-gray-600">
            ·개인정보를 제공받는 자&nbsp;:&nbsp;상품 및 서비스 판매자
            <br />
            <p></p>
            · 제공하는 개인정보 항목: <br />
            &nbsp;&nbsp;이름, 아이디, (휴대)전화번호, 상품 구매정보, 결제수단,
            <br />
            &nbsp;&nbsp;상품 수령인 정보(배송상품:수령인명, 주소, 출입방법 및 수령위치(필요 상품 주문 시에만 해당),
            <br />
            &nbsp;&nbsp;(휴대)전화번호/ 쿠폰:이름, 네이버 아이디, 휴대전화번호)
            <p></p>
            <br />
            · 개인정보를 제공받는 자의 이용목적: 판매자와 구매자의 원활한 거래 진행, 본인의사의 확인,
            <br />
            &nbsp;&nbsp;고객상담 및 불만처리/부정이용 방지 등의 고객관리, 물품배송, 통관, 새로운 상품/서비스 정보와 고지사항의 안내,
            <br />
            &nbsp;&nbsp;상품/서비스 구매에 따른 혜택 제공, 서비스 개선·통계·분석 <br />
            <p></p>
            · 개인정보를 제공받는 자의 개인정보 보유 및 이용기간:
            <br />
            &nbsp;&nbsp;개인정보 이용목적 달성 시까지 보존합니다.
            <br />
            &nbsp;&nbsp;단, 관계 법령의 규정에 의하여 일정 기간 보존이 필요한 경우에는 해당 기간만큼 보관 후 삭제합니다. <br />
            <br />
            위 개인정보 제공 동의를 거부할 권리가 있으나, 거부 시 상품 구매가 불가능합니다.
          </div>
        </section>

        {/* (4) 주문상품 */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">주문상품</h2>
        <section className="apn-card p-4 h-card-items">
          <div className="items-top-pad" />
          {items.length === 0 ? (
            <div className="py-10 text-center text-gray-500">주문 상품이 없습니다.</div>
          ) : (
            <div className="items-list">
              {items.map((it: any, idx: number) => {
                const key = it.orderId ?? it.itemId ?? `idx-${idx}`;
                const img = toAbs(pickImagePath(it), IMG_BASE) || '/file.svg';
                const qty = Number(it.quantity ?? 0);
                const priceOne = Number(it.price ?? 0);
                const lineTotal = priceOne * qty;

                return (
                  <div key={key} className="items-row flex items-center px-2">
                    <div className="order-thumb mr-2 mt-[20px] ml-[30px] mb-[20px]">
                      <Image
                        src={img}
                        alt={it?.name ? `${it.name} 썸네일` : '상품 이미지'}
                        width={100}
                        height={100}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 grid grid-cols-3">
                      <div className="px-3 flex items-center ml-[25px] min-w-0">
                        <div className="truncate">{it.name ?? '(상품명)'}</div>
                      </div>
                      <div className="px-3 flex items-center justify-center tabular-nums col-divide">
                        {qty}개
                      </div>
                      <div className="px-3 flex items-center mr-[40px] justify-end tabular-nums col-divide">
                        {lineTotal.toLocaleString()} <span className="text-sm">원</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="items-bottom-pad" />
        </section>

        {/* ▷ 결제금액 (주문페이지와 동일, 안내문 폰트/색 동일 적용) */}
        <h2 className="text-lg font-semibold mt-[50px] mb-[15px] text-left">결제금액</h2>
        <section className="apn-card p-4 h-card-sum">
          <div className="sum-center-wrap">
            <div className="sum-row total w-[420px] flex justify-between mt-[35px]">
              <div>총 주문금액</div>
              <div>
                {itemsTotal.toLocaleString()} <span className="text-sm">원</span>
              </div>
            </div>
            <div className="sum-row shipping w-[420px] flex justify-between">
              <div>+ 배송비</div>
              <div>
                {shippingFee.toLocaleString()} <span className="text-sm">원</span>
              </div>
            </div>
            <div className="sum-divider" />
            <div className="sum-row pay w-[420px] flex justify-between font-bold mt-1">
              <div>결제금액</div>
              <div className="pay-amount">
                <b>{payTotal.toLocaleString()} </b>
                <span className="text-sm">원</span>
              </div>
            </div>
            {/* ▶ 안내문: 주문페이지와 동일 클래스(.rural-note)로 폰트/색 통일 */}
            <div className="w-[420px] rural-note mt-[20px] mb-[25px]">
              ※&nbsp;총 주문금액이 100,000원 이상일 경우, 배송비는 무료입니다
              <br />※&nbsp;도서산간지역은 추가 배송비가 발생할 수 있어 판매자가 별도로 안내드립니다
              <br />
              &nbsp;&nbsp;&nbsp;·&nbsp;기본 배송비 3,000원은 결제 시 포함
            </div>
          </div>
        </section>

        {/* 하단 버튼 — 가운데 정렬 */}
        <div className="flex justify-center gap-[20px] mt-[40px] mb-[60px]">
          <Link href="/board/QNA" className="btn-3d btn-white w-[200px] px-4 py-2 text-center">
            문의하기
          </Link>
          <Link href="/order/history" className="btn-3d btn-white w-[200px] px-4 py-2 text-center">
            목록으로
          </Link>
        </div>
        <p className="after-note text-center">
          ※ 교환 및 환불신청은 Q&amp;A에서 상담 후 가능합니다
        </p>

        {/* ===== 이 페이지 한정 스타일: 주문페이지와 동일 세트 + 안내문 커스텀 변수 ===== */}
        <style jsx global>{`
          :root {
            /* 주문상품 카드 여백/간격 */
            --order-items-card-top-gap: 20px;
            --order-items-card-bottom-gap: 20px;
            --order-items-row-gap: 12px;
            --order-items-row-py: 0px;

            /* (세로실선 색상) */
            --items-divider-color: #d1d5db;

            /* 결제금액 카드 */
            --sum-divider-color: #e5e7eb;
            --sum-rows-gap: 8px;
            --sum-total-fs: 14px;
            --sum-total-color: #111111;
            --sum-shipping-fs: 14px;
            --sum-shipping-color: #111111;
            --sum-pay-fs: 18px;
            --sum-pay-color: #111111;

            /* 하단 안내문(요청: 폰트/색 조절 가능) */
            --after-note-fs: 13px;
            --after-note-color: #6b7280; /* gray-500 */
          }

          /* 버튼(3D) */
          .btn-3d {
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
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
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }

          /* 주문/배송지 입력 */
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
          .order-plain {
            display: inline-block;
            min-height: 28px;
            line-height: 28px;
            font-size: 15px;
            color: #111;
          }

          /* 썸네일 */
          .order-thumb {
            width: 100px;
            height: 100px;
            overflow: hidden;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: #fff;
          }

          /* 섹션 높이 */
          .h-card-ship { min-height: 220px; }
          .h-card-items { min-height: 150px; }
          .h-card-pay { min-height: 80px; }
          .h-card-sum { min-height: 200px; }
          .h-card-priv { height: 350px; }

          /* 주문상품 여백/간격 */
          .items-top-pad { height: var(--order-items-card-top-gap); }
          .items-list { display: flex; flex-direction: column; row-gap: var(--order-items-row-gap); }
          .items-row { padding-top: var(--order-items-row-py); padding-bottom: var(--order-items-row-py); }
          .items-bottom-pad { height: var(--order-items-card-bottom-gap); }

          /*  세로실선: 2,3번째 칸에만 border-left 지정 */
          .col-divide { border-left: 1px solid var(--items-divider-color); }

          /* 결제금액 카드 정렬/간격/타이포 */
          .sum-center-wrap { display: flex; flex-direction: column; align-items: center; row-gap: var(--sum-rows-gap); }
          .sum-row.total    { font-size: var(--sum-total-fs);    color: var(--sum-total-color); }
          .sum-row.shipping { font-size: var(--sum-shipping-fs); color: var(--sum-shipping-color); margin-top: 10px; margin-bottom: 5px; }
          .sum-row.pay      { font-size: var(--sum-pay-fs);      color: var(--sum-pay-color); }
          .sum-divider { width: 420px; height: 1px; background: var(--sum-divider-color); margin: 8px 0; }

          /* ▶ 주문페이지와 동일: 안내문 폰트/색 */
          .rural-note { font-size: 12px; color: #6b7280; }

          /* 하단 안내문 커스터마이즈 */
          .after-note { font-size: var(--after-note-fs); color: var(--after-note-color); margin-bottom: 120px; }
        `}</style>
      </main>
    </RequireLogin>
  );
}
