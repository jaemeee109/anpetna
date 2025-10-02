// src/app/care/reserve/[venueId]/page.tsx
'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import PawIcon from '@/components/icons/Paw';
import HospitalTab from './components/HospitalTab';
import HotelTab from './components/HotelTab';

type Tab = 'HOSPITAL' | 'HOTEL';

export default function ReservePage() {
  const params = useParams<{ venueId: string }>();
  const sp = useSearchParams();

  const venueId = Number(params?.venueId);
  const venueName = sp.get('name') || '선택 지점';
  const [tab, setTab] = useState<Tab>('HOSPITAL');

  return (
    <RequireLogin>
      {/* 레이아웃 폭*/}
      <section className="mx-auto w-full max-w-[600px] px-4 py-6">
        {/* 페이지 타이틀  */}
        <h1 className="text-3xl font-semibold mb-6 flex justify-center items-center gap-2">
          {venueName}
          <PawIcon className="w-[1em] h-[1em] text-current ml-[5px]" />
        </h1>

        {/* 병원/호텔 탭 - 가운데 정렬 */}
        <div className="flex items-center gap-3 mb-8 justify-center mb-[20px] gap-[10px]">
          <button
            type="button"
            className={`tab ${tab === 'HOSPITAL' ? 'active' : ''}`}
            onClick={() => setTab('HOSPITAL')}
          >
            병원
          </button>
          <button
            type="button"
            className={`tab ${tab === 'HOTEL' ? 'active' : ''}`}
            onClick={() => setTab('HOTEL')}
          >
            호텔
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        {tab === 'HOSPITAL' ? (
         <HospitalTab key={venueId} venueId={venueId} venueName={venueName} />
        ) : (
          <HotelTab    key={venueId} venueId={venueId} venueName={venueName} />
        )}

        {/* ───────────────────────────────────────────────
            페이지 전용(공용) 스타일: 탭 버튼만 보유
            나머지 카드/폼/버튼 등의 스타일은 각 탭 컴포넌트로 이동
           ─────────────────────────────────────────────── */}
        <style jsx>{`
          /* 탭 버튼 공용 */
          .tab {
            /* 외곽선/둥근모서리/내부여백/배경/살짝 그림자(원본) */
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 6px 16px;
            background: #fff;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          }
          .tab.active {
            /* 활성 탭 배경(원본) */
            background: #eee;
          }
        `}</style>
      </section>
    </RequireLogin>
  );
}
