// src/app/care/admin/[reservationId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import PawIcon from '@/components/icons/Paw';

export default function AdminReserveDetailPage() {
  const params = useParams<{ reservationId: string }>();
  const router = useRouter();
  const id = params?.reservationId;

  return (
    <RequireLogin>
      <main className="mx-auto max-w-[800px] px-4 py-8">
        <h1 className="text-[26px] font-semibold text-center mb-6">
          <PawIcon className="inline-block mr-1" /> 예약 상세 #{id} <PawIcon className="inline-block ml-1" />
        </h1>

        {/* 상세 API/화면은 백엔드 응답 형식 확정 후 채워넣으면 됩니다 */}
        <p className="text-center text-gray-600">상세 화면은 추후 데이터 필드에 맞춰 채울 예정입니다.</p>

        <div className="flex items-center justify-center mt-6">
          <button className="btn-3d btn-white" onClick={() => router.back()}>
            목록으로
          </button>
        </div>

        <style jsx global>{`
          .btn-3d { padding:8px 14px; border:1px solid #2222; border-radius:10px; background:#fff; }
          .btn-white { background:#fff; }
        `}</style>
      </main>
    </RequireLogin>
  );
}
