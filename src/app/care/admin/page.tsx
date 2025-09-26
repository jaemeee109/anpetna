// src/app/care/admin/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import PawIcon from '@/components/icons/Paw';
import venueApi from '@/features/venue/data/venue.api';
import type { AdminReservationLine } from '@/features/venue/data/venue.types';
import Link from 'next/link';

export default function AdminReserveListPage() {
  // 필터
  const [venueId, setVenueId] = useState<string>('');
  const [status, setStatus] = useState<string>(''); // 전체: ''
  const [type, setType] = useState<'HOSPITAL' | 'HOTEL' | ''>('');
  const [memberId, setMemberId] = useState<string>('');

  // 페이지
  const [page, setPage] = useState(1);
  const size = 10;

  // 데이터
  const [content, setContent] = useState<AdminReservationLine[]>([]);
  const [totalPages, setTotalPages] = useState(1);

  // 선택
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  // 모달
  const [open, setOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string>('');

  async function fetchList(p = 1) {
    const { content, totalPages } = await venueApi.adminListReservations({
      venueId: venueId || undefined,
      status: status || undefined,
      type: type || undefined,
      memberId: memberId || undefined,
      page: p,
      size,
    });
    setContent(content || []);
    setTotalPages(totalPages || 1);
    setPage(p);
    setChecked({});
  }

  useEffect(() => {
    fetchList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allChecked = useMemo(() => {
    const ids = content.map((c) => c.reservationId);
    if (ids.length === 0) return false;
    return ids.every((id) => checked[id]);
  }, [content, checked]);

  function toggleAll(v: boolean) {
    const next: Record<number, boolean> = {};
    content.forEach((c) => (next[c.reservationId] = v));
    setChecked(next);
  }

  async function saveBulk() {
    const ids = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (!ids.length || !bulkStatus) return;
    await venueApi.adminBulkUpdateReservationStatus({ ids, status: bulkStatus });
    setOpen(false);
    await fetchList(page);
  }

  return (
    <RequireLogin>
      <main className="mx-auto w-full max-w-[960px] px-4 py-8">
        <h1 className="text-[28px] font-semibold text-center mb-6">
          <PawIcon className="inline-block mr-1" /> 예약 관리 <PawIcon className="inline-block ml-1" />
        </h1>

        {/* ===== 상단 필터 ===== */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)} title="지점">
            <option value="">지점(전체)</option>
            {/* 지점 목록 API가 확정되면 여기에 옵션 주입 */}
            {/* <option value="1">가맹점 A</option> */}
          </select>

          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} title="예약상태">
            <option value="">상태(전체)</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NOSHOW">NOSHOW</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            title="병원/호텔"
          >
            <option value="">구분(전체)</option>
            <option value="HOSPITAL">병원</option>
            <option value="HOTEL">호텔</option>
          </select>

          <input
            className="input"
            placeholder="회원ID 검색"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />

          <button className="btn-3d btn-white" onClick={() => fetchList(1)}>
            검색
          </button>
        </div>

        <div className="h-3" />
        <hr className="border-gray-200" />
        <div className="h-4" />

        {/* ===== 리스트 헤더 ===== */}
        <div className="grid grid-cols-12 gap-2 text-sm items-center">
          <div className="col-span-1 text-center">
            <label>
              <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} />
              <span className="ml-2">전체</span>
            </label>
          </div>
          <div className="col-span-2 text-center">예약번호</div>
          <div className="col-span-3 text-center">예약상태</div>
          <div className="col-span-2 text-center">구분</div>
          <div className="col-span-4 text-center">지점명</div>
        </div>

        <div className="h-2" />
        <hr className="border-gray-100" />
        <div className="h-2" />

        {/* ===== 리스트 바디 ===== */}
        {content.map((r) => (
          <div key={r.reservationId} className="grid grid-cols-12 gap-2 py-2 items-center">
            <div className="col-span-1 text-center">
              <input
                type="checkbox"
                checked={!!checked[r.reservationId]}
                onChange={(e) =>
                  setChecked((c) => ({ ...c, [r.reservationId]: e.target.checked }))
                }
              />
            </div>
            <div className="col-span-2 text-center">
              <Link href={`/care/admin/${r.reservationId}`} className="underline">
                {r.reservationId}
              </Link>
            </div>
            <div className="col-span-3 text-center">{r.status}</div>
            <div className="col-span-2 text-center">{r.type === 'HOSPITAL' ? '병원' : '호텔'}</div>
            <div className="col-span-4 text-center">{r.venueName}</div>
          </div>
        ))}

        <div className="h-2" />
        <hr className="border-gray-200" />
        <div className="h-4" />

        {/* ===== 우측 정렬 버튼들 ===== */}
        <div className="flex items-center justify-end gap-2">
          <button className="btn-3d btn-white" onClick={() => setOpen(true)}>
            일괄변경
          </button>
          <button className="btn-3d btn-white" onClick={() => fetchList(page)}>
            저장
          </button>
        </div>

        {/* ===== 하단 페이징 (간단형) ===== */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <button className="btn-3d btn-white" disabled={page <= 1} onClick={() => fetchList(page - 1)}>
            이전
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button className="btn-3d btn-white" disabled={page >= totalPages} onClick={() => fetchList(page + 1)}>
            다음
          </button>
        </div>

        {/* ===== 모달 ===== */}
        {open && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-5 min-w-[320px] max-w-[90vw]">
              <h2 className="text-lg font-semibold mb-4">선택 예약 상태 일괄변경</h2>
              <div className="flex items-center gap-2">
                <span className="label !w-auto">상태</span>
                <select className="input" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                  <option value="">선택</option>
                  <option value="REQUESTED">REQUESTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NOSHOW">NOSHOW</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 mt-6">
                <button className="btn-3d btn-white" onClick={() => setOpen(false)}>
                  닫기
                </button>
                <button className="btn-3d btn-white" disabled={!bulkStatus} onClick={saveBulk}>
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 스타일 공통 */}
        <style jsx global>{`
          .label { width:120px; text-align:right; font-weight:500; }
          .input { border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; font-size:14px; background:#fff; }
          .btn-3d { padding:8px 14px; border:1px solid #2222; border-radius:10px; background:#fff; }
          .btn-white { background:#fff; }
        `}</style>
      </main>
    </RequireLogin>
  );
}
