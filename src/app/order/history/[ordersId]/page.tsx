// src/app/order/history/[ordersId]/page.tsx  (전체 교체)
'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import orderApi from '@/features/order/data/order.api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

export default function OrderDetailPage() {
  const { ordersId } = useParams<{ ordersId: string }>();
  const id = Number(Array.isArray(ordersId) ? ordersId[0] : ordersId);
  const router = useRouter();
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
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['order', 'detail', id] });
      alert('배송지가 저장되었습니다.');
    },
    onError: (e: any) => alert(e?.message || '배송지 저장 실패'),
  });

  const mCancel = useMutation({
    mutationFn: () => orderApi.changeStatus(id, 'CANCELLED'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders', 'me'] });
      router.replace('/order/history');
    },
    onError: (e: any) => alert(e?.message || '구매취소 실패'),
  });

  if (isLoading) return <div className="px-4 py-10 text-center">불러오는 중…</div>;
  if (error) return <div className="px-4 py-10 text-center text-red-600">오류: {(error as any)?.message}</div>;
  if (!data) return null;

  const items = Array.isArray(data.ordersItems) ? data.ordersItems : [];
  const pay = Number(data.totalAmount ?? 0);

  return (
    <RequireLogin>
      <main className="mx-auto w-[700px] px-4">
        {/* 상단 타이틀/주문번호 */}
        <h1 className="text-2xl font-semibold text-center mt-[30px] mb-[20px]">Order Detail</h1>
        <p className="text-center mb-[24px]">
          <span className="font-semibold">주문번호:&nbsp;</span>
          <span className="font-bold text-emerald-600">{id}</span>
        </p>

        {/* (1) 배송지 카드: checkout과 동일 UI 형태, 인풋만 수정가능 */}
        <h2 className="text-lg font-semibold mt-[20px] mb-[8px] text-left">배송지 정보</h2>
        <section className="apn-card p-4 h-card-ship">
          <div className="flex flex-col gap-3 ml-[30px]">
            <label className="order-plain"><b>수령인</b> : <input className="border rounded px-2 py-1"
              value={addr.receiver} onChange={e=>setAddr(s=>({ ...s, receiver: e.target.value }))} /></label>
            <label className="order-plain"><b>우편번호</b> : <input className="border rounded px-2 py-1 w-[120px]"
              value={addr.zipcode} onChange={e=>setAddr(s=>({ ...s, zipcode: e.target.value }))} /></label>
            <label className="order-plain"><b>도로명주소</b> : <input className="border rounded px-2 py-1 w-full"
              value={addr.street} onChange={e=>setAddr(s=>({ ...s, street: e.target.value }))} /></label>
            <label className="order-plain"><b>상세주소</b> : <input className="border rounded px-2 py-1 w-full"
              value={addr.detail} onChange={e=>setAddr(s=>({ ...s, detail: e.target.value }))} /></label>

            <div className="mt-2">
              <button className="btn-3d btn-white !px-4 !py-2" onClick={() => mUpdate.mutate(addr)}>
                배송지변경 저장
              </button>
            </div>
          </div>
        </section>

        {/* (2) 결제수단 카드: 체크박스 제거, 카드 고정 노출 */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">결제수단</h2>
        <section className="apn-card p-4 h-card-pay">
          <div className="ml-[30px]">카드</div>
        </section>

        {/* (3) 개인정보 제공 동의: 이미 동의함 표시, 수정불가 */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">개인정보 제공 동의</h2>
        <section className="apn-card p-4 h-card-priv">
          <div className="ml-[30px]">
            <label className="inline-flex items-center gap-2 opacity-60 cursor-not-allowed">
              <input type="checkbox" checked readOnly />
              이미 동의하셨습니다(수정 불가)
            </label>
          </div>
        </section>

        {/* (4) 배송조회 안내 카드 */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">배송조회</h2>
        <section className="apn-card p-4">
          <div className="ml-[30px]">현재 상품준비중이므로 운송장조회가 불가능합니다</div>
        </section>

        {/* (5) 주문상품 목록: 썸네일/상품명/수량/금액 */}
        <h2 className="text-lg font-semibold mt-[24px] mb-[8px] text-left">주문상품</h2>
        <section className="apn-card p-4 h-card-items">
          <div className="items-list">
            {items.map((it: any) => (
              <div key={it.orderId} className="items-row flex items-center gap-4">
                <img src={it.thumbnailUrl || '/file.svg'} alt="" className="w-[96px] h-[72px] object-cover rounded-md border" />
                <div className="flex-1 grid grid-cols-4 gap-2 items-center">
                  <div className="col-span-2 font-semibold truncate">{it.name ?? '(상품명)'}</div>
                  <div className="text-center">수량 {Number(it.quantity ?? 0)}</div>
                  <div className="text-right font-bold">{Number(it.price ?? 0).toLocaleString()} 원</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* (6) 하단 버튼: 문의하기/목록으로/구매 취소 + 안내문구 */}
        <div className="flex items-center gap-[10px] mt-[24px]">
          <Link href="/board/qna" className="btn-3d btn-white !px-5 !py-2.5">문의하기</Link>
          <Link href="/order/history" className="btn-3d btn-white !px-5 !py-2.5">목록으로</Link>
          <button className="btn-3d btn-white !px-5 !py-2.5" onClick={() => mCancel.mutate()}>
            구매 취소
          </button>
        </div>
        <p className="mt-3 text-sm text-gray-600">※ 교환 및 환불신청은 Q&amp;A에서 상담 후 가능합니다</p>

        {/* (7) 결제금액 박스는 기존 체크아웃 UI와 동일하게 상단/리스트에서 이미 표시하므로 생략 */}
      </main>
    </RequireLogin>
  );
}
