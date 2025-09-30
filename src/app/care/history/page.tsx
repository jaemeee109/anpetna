// src/app/care/history/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import { Pagination } from '@/components/layout/Pagination';
import venueApi from '@/features/venue/data/venue.api';
import type { MyReservationLine } from '@/features/venue/data/venue.types';
import PawIcon from '@/components/icons/Paw';
import { useRouter, useSearchParams } from 'next/navigation';

const PAGE_SIZE = 10;

/* ===================== 날짜/시간 포맷 유틸 ===================== */
function ymd(s?: string | null) {
  if (!s) return '-';
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);               // ISO
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.slice(0, 10);   // 'YYYY-MM-DD HH:mm'
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
function hm(s?: string | null) {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(11, 16);               // ISO → HH:mm
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) return s.trim().slice(11, 16);
  return '';
}

/* ===================== 한글 라벨 매핑 ===================== */
// 상태 한글 라벨
const STATUS_LABEL: Record<string, string> = {
  PENDING:   '예약신청',
  CONFIRMED: '예약확정',
  REJECTED:  '예약취소',
  CANCELED:  '접수취소',
  NOSHOW:    '노쇼',
};
// 서비스 한글 라벨
const SERVICE_LABEL: Record<string, string> = {
  HOSPITAL: '병원',
  HOTEL:    '호텔',
};

const STATUS_CLASS: Record<string, 'pending' | 'confirmed' | 'rejected' | 'canceled' | 'noshow'> = {
  PENDING:   'pending',
  CONFIRMED: 'confirmed',
  REJECTED:  'rejected',
  CANCELED:  'canceled',
  NOSHOW:    'noshow',
};



/* ===================== 상태 칩  ===================== */
function StatusChip({ s }: { s: string }) {
  const raw = (s ?? '').toUpperCase().trim();

  // 클래스 식별 (바깥 래퍼에 붙임: 기존 CSS와의 호환 유지)
  const cls =
    raw === 'CONFIRMED' ? 'confirmed' :
    raw === 'REJECTED'  ? 'rejected'  :
    raw === 'CANCELED'  ? 'canceled'  :
    raw === 'NOSHOW'    ? 'noshow'    : 'pending';

  // 한글 레이블
  const label =
    raw === 'CONFIRMED' ? '예약확정' :
    raw === 'REJECTED'  ? '예약취소' :
    raw === 'CANCELED'  ? '접수취소' :
    raw === 'NOSHOW'    ? '노쇼'     : '예약신청';

  // 상태별 색상 (내부 pill에 직접 적용)
  const colorStyle: React.CSSProperties =
    cls === 'confirmed' ? { backgroundColor: '#cbdef7ff', color: '#2c4a6bff' } :
    cls === 'rejected'  ? { backgroundColor: '#ffebe6ff', color: '#e06167ff' } :
    cls === 'canceled'  ? { backgroundColor: '#f5f5f5', color: '#666666' } :
    cls === 'noshow'    ? { backgroundColor: '#e9e9e6ff', color: '#888787ff' } :
                          { backgroundColor: '#faf6b2ff', color: '#c08506ff' }; 

  return (
    // 바깥 래퍼: 기존 클래스 유지 (전역 규칙과의 호환)
    <span className={`rh-chip rh-${cls}`} style={{ display: 'inline-block', background: 'transparent', padding: 0, border: 0 }}>
      {/* 내부 pill: 완전 독립 스타일(인라인)로 둥근 모양 강제 */}
      <span
        style={{
          display: 'inline-block',
          height: 28,               // 칩 높이
          lineHeight: '28px',       // 텍스트 수직 중앙
          minWidth: 72,             // 최소 너비
          padding: '0 10px',        // 좌우 여백
          borderRadius: 9999,       // 둥근 pill (숫자값 OK)
          whiteSpace: 'nowrap',
          textAlign: 'center',
          userSelect: 'none',
          ...colorStyle,            // 상태별 배경/글자색
        }}
      >
        {label}
      </span>
    </span>
  );
}



export default function MyReserveHistoryPage() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MyReservationLine[]>([]);
  const [total, setTotal] = useState(0);
  const size = PAGE_SIZE;

  // 관리자 조회용 쿼리 파라미터 — useEffect 보다 위로 이동
  const sp = useSearchParams();
  const from = sp.get('from');
  const memberId = sp.get('memberId') || '';
  const venueId = Number(sp.get('venueId') || '0');
  const isAdmin = from === 'admin' && venueId > 0;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (from === 'admin' && memberId && venueId) {
        const { content, totalElements } = await venueApi.adminListReservations({
          venueId,
          memberId,
          page: page - 1,
          size,
        });
        if (!alive) return;
        const list = (content ?? []) as MyReservationLine[];
        setRows(Array.isArray(list) ? list : []);
        setTotal(Number(totalElements ?? 0));
        return;
      }

      const res = await venueApi.listMyReservations({ page, size });
      const list = (res?.dtoList ?? res?.content ?? res?.list ?? []) as MyReservationLine[];
      if (!alive) return;
      setRows(Array.isArray(list) ? list : []);
      setTotal(Number(res?.total ?? res?.totalElements ?? 0));
    })();
    return () => { alive = false; };
  }, [from, memberId, venueId, page, size]);

  const lines = useMemo(() => rows ?? [], [rows]);
  const router = useRouter();

  

  return (
    <RequireLogin>
      <main className="reserve-history">
        <h1 className="rh-title">예약 내역
              <PawIcon className="w-[1em] h-[1em] text-current ml-[5px]" />
        </h1>

        <div className="rh-sep" />

        <table className="rh-table">
          <thead className="rh-thead">
            <tr>
              <th>예약상태</th>
              <th>매장명</th>
              <th>서비스</th>
              <th>예약날짜</th>
              <th>예약시간</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={5} className="rh-empty">예약 내역이 없습니다.</td>
              </tr>
            ) : (
              lines.map((r, i) => {
                const isHospital = r.type === 'HOSPITAL';
                const dateText = isHospital
                  ? ymd(r.appointmentAt)
                  : `${ymd(r.checkIn)}~${ymd(r.checkOut)}`;
                const timeText = isHospital ? hm(r.appointmentAt) : '';
                return (
                  <tr
                    key={i}
                    onClick={() => {
                      if (isAdmin) {
                        // ✅ 관리자용 상세로 이동 (type과 venueId 함께 전달)
                        router.push(`/care/admin/${r.reservationId}?type=${r.type}&venueId=${venueId}`);
                      } else {
                        // 기존: 회원 본인 상세
                        router.push(`/care/history/${r.type.toLowerCase()}/${r.reservationId}`);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="rh-td"><StatusChip s={r.status} /></td>
                    <td className="rh-td">{r.venueName}</td>
                    <td className="rh-td">{SERVICE_LABEL[r.type] ?? r.type}</td>
                    <td className="rh-td">{dateText}</td>
                    <td className="rh-td">{timeText || '-'}</td>
                  </tr>

                );
              })
            )}
          </tbody>
        </table>

        <div className="rh-sep" />

        {/* 페이징 */}
        <Pagination
          current={page}
          size={size}
          total={total}
          onPage={(p) => setPage(p)}
        />
        <p className=" mb-[50px]"></p>

              {/* 관리자용 */}
            {from === 'admin' && venueId ? (
            <div className="text-center mt-4">
              <button
                type="button"
                className="btn-list"
                onClick={() => router.push(`/care/admin?venueId=${venueId}`)}
              >
                목록으로
              </button>
            </div>
          ) : null}



      </main>

 
     <style jsx>{`
  /***************************************************
   *  페이지 컨테이너/레이아웃 (간단 변수만 유지)
   ***************************************************/
  .reserve-history {
    --max-width: 700px;   /* 컨테이너 최대 너비만 변수로 유지 */
    width: 100%;
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 20px 16px;   /* 상하 20px, 좌우 16px */
  }

  /* 제목 */
  .rh-title {
    font-size: 20px;
    font-weight: 600;
    text-align: center;
    margin: 0 0 12px;
  }

  /* 구분선 */
  .rh-sep {
    border-top: 1px solid #e5e7eb;
    margin: 16px 0;
  }

  /***************************************************
   *  테이블 기본
   ***************************************************/
  .rh-table {
    width: 100%;
    border-collapse: separate; /* 셀 간격 제어 위해 separate 유지 */
    border-spacing: 0;
    font-size: 14px;
    text-align: center;        /* 중앙 정렬 */
  }

  .rh-thead th {
    font-weight: 700;
    background: #fafafa;
    padding: 10px 8px;         /* 상하 10px, 좌우 8px */
    white-space: nowrap;
  }

  .rh-td {
    color: #111;
    padding: 10px 8px;         /* 상하 10px, 좌우 8px */
    text-align: center;
    border-bottom: 1px solid #f0f0f0;
    vertical-align: middle;
  }

  .rh-empty {
    color: #666;
    padding: 16px 0;
    text-align: center;
  }

  /***************************************************
   *  상태 칩 
   ***************************************************/
.rh-chip {
  display: inline-flex;          /* 수직 중앙 정렬 */
  align-items: center;
  justify-content: center;

  height: 28px;                  /* 칩 높이 */
  min-width: 62px;               /* 최소 너비 */
  padding: 0 10px;               /* 좌우 여백 */

  /* >>> 둥근 모양을 전역 스타일보다 우선해서 '강제' 적용 <<< */
  border-radius: 9999px !important;
  overflow: hidden;                          /* 모서리 잘림 보장 */
  background-clip: padding-box;
  -webkit-background-clip: padding-box;

  border: 0;
  font-size: 12px;
  line-height: 1;                /* 줄간격으로 높이 틀어짐 방지 */
  text-align: center;
  white-space: nowrap;           /* 줄바꿈 방지 */
  user-select: none;
}


  .btn-list{
  border-radius: 9px !important;
  border: 1px solid #cacacaff;
  background: #fafafa;
  width: 80px;
  height: 35px;
  font-size: 14px;
  font-weight: 400;
  text-align: center;
  }
  
`}</style>

    </RequireLogin>
  );
}
