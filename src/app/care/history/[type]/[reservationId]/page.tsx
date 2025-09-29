// src/app/care/history/[type]/[reservationId]/page.tsx
'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, type CSSProperties } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import PawIcon from '@/components/icons/Paw';
import venueApi from '@/features/venue/data/venue.api';
import type {
  MyHospitalReservationDetail,
  MyHotelReservationDetail,
} from '@/features/venue/data/venue.types';

/* ===================== 날짜/시간 포맷 유틸 ===================== */
function pad2(n: number) { return String(n).padStart(2, '0'); }
function ymd(s?: string) { if (!s) return ''; const d = new Date(s); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; }
function hm(s?: string)  { if (!s) return ''; const d = new Date(s); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

/* ==== 취소 가능 여부 계산 유틸 ==== */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function parseLocalDate(s?: string | null): Date | null {
  if (!s) return null;
  // 'YYYY-MM-DD'만 온 경우 자정으로 해석
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00`);
  // ISO 문자열 포함은 Date에 그대로
  return new Date(s);
}
function canCancelByStatus(status?: string, eventDate?: Date | null): boolean {
  const st = (status ?? '').toUpperCase();
  if (st === 'PENDING') return true; // 언제든 취소 가능
  if (st === 'CONFIRMED') {
    if (!eventDate) return false; // 날짜 없으면 보수적으로 비허용
    const today = startOfDay(new Date());
    const eventD0 = startOfDay(eventDate);
    const cutoff = new Date(eventD0.getTime() - 24 * 60 * 60 * 1000); // 이벤트 전날 00:00
    // "전날까지" → 오늘 날짜가 cutoff(전날) 이하이면 취소 가능
    return today.getTime() <= cutoff.getTime();
  }
  // REJECTED / CANCELED / NOSHOW → 취소 버튼 노출 X
  return false;
}

function StatusChip({
  s,
  h = 28,        // 칩 높이(px)
  px = 10,       // 좌우 패딩(px)
  minW = 72,     // 최소 너비(px)
}: {
  s?: string;
  h?: number;
  px?: number;
  minW?: number;
}) {
  const raw = (s ?? '').toUpperCase().trim();
  const label =
    raw === 'CONFIRMED' ? '예약확정' :
    raw === 'REJECTED'  ? '예약취소' :
    raw === 'CANCELED'  ? '접수취소' :
    raw === 'NOSHOW'    ? '노쇼'     : '예약신청';

  const style: CSSProperties =
    raw === 'CONFIRMED' ? { backgroundColor: '#cbdef7ff', color: '#2c4a6bff' } :
    raw === 'REJECTED'  ? { backgroundColor: '#ffebe6ff', color: '#e06167ff' } :
    raw === 'CANCELED'  ? { backgroundColor: '#f5f5f5',   color: '#666666'   } :
    raw === 'NOSHOW'    ? { backgroundColor: '#e9e9e6ff', color: '#888787ff' } :
                          { backgroundColor: '#faf6b2ff', color: '#c08506ff' };

  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: h,
        minWidth: minW,
        padding: `0 ${px}px`,
        borderRadius: 9999,
        textAlign: 'center',
        userSelect: 'none',
        ...style,
      }}
    >
      {label}
    </span>
  );
}

export default function ReservationDetail() {
  const router = useRouter();
  const p = useParams() as { type?: string; reservationId?: string };

  const type = (p?.type ?? '').toUpperCase() as 'HOSPITAL' | 'HOTEL';
  const id = Number(p?.reservationId);

  const [h, setH] = useState<MyHospitalReservationDetail | null>(null);
  const [t, setT] = useState<MyHotelReservationDetail | null>(null);

  useEffect(() => {
    if (!id || !type) return;
    let alive = true;
    (async () => {
      try {
        if (type === 'HOSPITAL') {
          const data = await venueApi.readMyHospitalReservation(id);
          if (alive) setH(data);
        } else {
          const data = await venueApi.readMyHotelReservation(id);
          if (alive) setT(data);
        }
      } catch {
        alert('예약 정보를 불러오지 못했습니다.');
      }
    })();
    return () => { alive = false; };
  }, [type, id]);

  const status = h?.status ?? t?.status ?? '';
  const venueName = h?.venueName ?? t?.venueName ?? '';
  const serviceLabel = type === 'HOSPITAL' ? '병원' : '호텔';

  // 예약 시작 날짜(병원은 appointmentAt, 호텔은 checkIn)를 기준으로 판정
  const eventDate =
    type === 'HOSPITAL'
      ? parseLocalDate(h?.appointmentAt)
      : parseLocalDate(t?.checkIn);

  const canCancel = canCancelByStatus(status, eventDate);
  const isTerminal =
    (status ?? '').toUpperCase() === 'REJECTED' ||
    (status ?? '').toUpperCase() === 'CANCELED' ||
    (status ?? '').toUpperCase() === 'NOSHOW';

  const onCancel = async () => {
    if (!canCancel) {
      alert('현재 상태에서는 예약을 취소할 수 없습니다.\n(예약확정 시에는 예약일 전날까지만 취소 가능합니다)');
      return;
    }
    if (!confirm('해당 예약을 취소하시겠습니까?')) return;
    try {
      if (type === 'HOSPITAL') await venueApi.cancelMyHospitalReservation(id);
      else await venueApi.cancelMyHotelReservation(id);
      alert('예약이 취소되었습니다.');
      router.push('/care/history');
    } catch {
      alert('예약 취소에 실패했습니다.');
    }
  };

  return (
    <RequireLogin>
      <main className="reserve-detail ">
        {/* (1) 예약상태 표시 */}
        <h1 className="rd-title ">
          <StatusChip s={status} h={36} px={12} minW={88} />
        </h1>

        {/* (2) 매장명 + 아이콘 + 서비스 */}
        <div className="rd-headline mt-[15px] mb-[20px]">
          <span className="rd-service-tag">{serviceLabel}</span>
          <span className="rd-venue">{venueName}</span>
          <PawIcon className="w-[1em] h-[1em] text-current mx-[6px]" />
        </div>

        <div className="rd-sep" />

        {/* (유의사항) — 서비스 타입별로 내용 분기 */}
        <section className="rd-block">
          <div className="rd-subtitle-1">※ 예약 유의사항 ※</div>
          <div className="rd-note">
            {type === 'HOSPITAL' && (
              <ul className="custom-bullet">
                <li>예약 시간 10분 전까지 도착해주세요</li>
                <li>예약 변경 및 취소는 최소 하루 전까지 가능합니다</li>
                <li>예약 시간으로부터 15분 경과 시 미접수 고객님은 노쇼 처리됩니다</li>
                <li>무단 취소/노쇼가 반복될 경우 추후 예약이 제한될 수 있습니다</li>
                <li>반려동물은 반드시 목줄·이동장을 이용해주세요</li>
                <li>공격성이 있는 반려동물은 사전 고지 바랍니다</li>
                <li>진료 내용에 따라 대기 시간이 발생할 수 있습니다</li>
                <li>응급 환자는 예약 순서와 무관하게 우선 진료될 수 있습니다</li>
                <li>
                  <p />
                  ※ 요청사항에 아래와 같은 내용을 반드시 기재해주세요
                  <p />
                  최근 증상, 복용 중인 약/치료 이력, 알레르기 정보, 진료 목적, 공격성 여부, 
                  <br/>진료 시 주의사항 , 특이사항
                </li>
                <li>요청사항에 필요한 정보를 기재하지 않아 발생하는 불이익은 병원이 책임지지 않습니다 </li>
              </ul>
            )}
            {type === 'HOTEL' && (
              <ul className="custom-bullet">
                <li>체크인은 오후 2시 이후, 체크아웃은 오전 11시까지입니다</li>
                <li>예방접종을 완료한 반려견만 입실 가능합니다</li>
                <li>전염성 질환·발정 중인 반려견은 예약이 제한됩니다</li>
                <li>사료와 간식은 반드시 지참해 주세요</li>
                <li>개인 담요·장난감을 가져오시면 적응에 도움이 됩니다</li>
                <li>예약 변경·취소는 최소 하루 전까지 가능합니다</li>
                <li>무단 취소/노쇼 시 추후 예약이 제한될 수 있습니다</li>
                <li>입실 시 건강 체크가 진행되며, 공격성 반려견은 사전 고지 바랍니다</li>
                <li>
                  <p/> ※ 요청사항에 아래와 같은 내용을 반드시 기재해주세요
                  <p/>
                  - 반려동물의 종류·식사·배변 습관과 성격
                  <br/>- 복용 중인 약이나 알레르기 정보가 있다면 반드시 입력해 주세요
                  <br/>- 짖음·분리불안·공격성 등 돌봄 시 주의할 행동을 알려주세요
                </li>
                <p/>
                <li>
                  요청사항에 기재하지 않은 반려동물의 특성(습관, 성격, 질환 등)으로 인한 
                  <br/>&nbsp;문제 발생 시 호텔은 책임지지 않습니다
                </li>
              </ul>
            )}
          </div>

          <label className="rd-agree">
            <input type="checkbox" checked disabled />
            <span>유의사항을 모두 확인하였으며 동의합니다.</span>
          </label>
        </section>

        {/* 공통 상단 요약 */}
        {type === 'HOSPITAL' && h && (
          <section className="rd-block">
            <div className="rd-row-1"><b>예약일 | </b> {ymd(h.appointmentAt)}</div>
            <div className="rd-row-1"><b>예약 시간 | </b> {hm(h.appointmentAt)}</div>
            <div className="rd-row-1"><b>담당의 | </b> {h.doctorName || '-'}</div>
          </section>
        )}
        {type === 'HOTEL' && t && (
          <section className="rd-block">
            <div className="rd-row-1"><b>예약일 : </b> {t.checkIn} ~ {t.checkOut}</div>
          </section>
        )}

        {/* 병원 상세 */}
        {type === 'HOSPITAL' && h && (
          <>
            <section className="rd-block">
              <div className="rd-subtitle-1">* 예약자 정보</div>
              <div className="rd-list">
                <div className="rd-line"><b>예약자 | </b> <span>{h.reserverName}</span></div>
                <div className="rd-line"><b>연락처 | </b> <span>{h.primaryPhone}</span></div>
                <div className="rd-line"><b>추가연락처 | </b> <span>{h.secondaryPhone || '-'}</span></div>
              </div>
            </section>

            <section className="rd-block">
              <div className="rd-subtitle-1">* 반려동물 정보</div>
              <div className="rd-list">
                <div className="rd-line"><b>이름 | </b> <span>{h.petName}</span></div>
                <div className="rd-line"><b>나이 | </b> <span>{h.petBirthYear ? `${new Date().getFullYear() - h.petBirthYear}세` : '-'}</span></div>
                <div className="rd-line"><b>종류 | </b> <span>{h.petSpecies}</span></div>
                <div className="rd-line"><b>성별 | </b> <span>{h.petGender}</span></div>
              </div>
            </section>

            <section className="rd-block">
              <div className="rd-subtitle-1">* 요청사항</div>
              <div className="rd-box">{h.memo || '-'}</div>
            </section>
          </>
        )}

        {/* 호텔 상세 */}
        {type === 'HOTEL' && t && (
          <>
            <section className="rd-block">
              <div className="rd-subtitle-1">* 예약자 정보</div>
              <div className="rd-list">
                <div className="rd-line"><b>예약자 | </b> <span>{t.reserverName}</span></div>
                <div className="rd-line"><b>연락처 | </b> <span>{t.primaryPhone}</span></div>
                <div className="rd-line"><b>추가연락처 | </b> <span>{t.secondaryPhone || '-'}</span></div>
              </div>
            </section>

            <section className="rd-block">
              <div className="rd-subtitle-1">* 반려동물 정보</div>
              <div className="rd-list">
                <div className="rd-line"><b>이름 | </b> <span>{t.petName}</span></div>
                <div className="rd-line"><b>나이 | </b> <span>{t.petBirthYear ? `${new Date().getFullYear() - t.petBirthYear}세` : '-'}</span></div>
              </div>
            </section>

            <section className="rd-block mt-[50px]">
              <div className="rd-subtitle-1">* 요청사항</div>
              <div className="rd-box ">{t.memo || '-'}</div>
            </section>
          </>
        )}

        {/* 하단 버튼 */}
        <div className="rd-actions mt-[50px] mb-[50px]">
          {canCancel ? (
            <>
              <button type="button" className="rd-btn" onClick={onCancel}>예약취소</button>
              <Link href="/care/history" className="rd-btn" style={{ textDecoration: 'none', color: '#111111' }}>
                목록으로
              </Link>
            </>
          ) : (
            <Link href="/care/history" className="rd-btn" style={{ textDecoration: 'none', color: '#111111' }}>
              목록으로
            </Link>
          )}
        </div>

        <p className="mb-[50px]"></p>
      </main>

      <style jsx>{`
        /***************************************************
         * 레이아웃/타이틀 (전체 가운데 정렬)
         ***************************************************/
        .reserve-detail {
          --max-width: 650px;
          width: 100%;
          max-width: var(--max-width);
          margin: 0 auto;
          padding: 20px 16px;

          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .rd-title {
          font-size: 20px;
          font-weight: 600;
          margin: 0 0 8px;
        }
        /* 매장명/아이콘/서비스 한 줄 */
        .rd-headline {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 16px;
          margin-bottom: 8px;
          width: 100%;
        }
        .rd-venue { 
          font-weight: 500;
          font-size: 18px;
          /* NOTE: 사용자 요청 외 변경 없음 */
        }
        /* 서비스 태그: 흰배경/회색테두리 */
        .rd-service-tag {
          display: inline-block;
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          width: 32px;
          height: 20px;
          padding: 2px 8px;
          font-size: 14px;
          line-height: 20px;
          font-weight: 500;
          text-align: center;
        }

        .rd-sep { border-top: 1px solid #e5e7eb; margin: 12px 0 16px; width: 100%; }
        .rd-block { margin: 14px 0; width: 100%; }
        .rd-row { margin: 6px 0; }
       .rd-row-1 { 
        margin: 6px 0;        /* 바깥 여백 */
        font-size: 18px;      /* 글자 크기 */
        line-height: 1.8;     /* 줄 간격  */
        letter-spacing: 0.7px;/* 글자 간격 */
        }
        .rd-subtitle { font-weight: 600; margin-bottom: 8px; }
        .rd-subtitle-1 { 
        font-weight: 600; 
        font-size: 20px;
        margin: 10px 0 20px 0px;
         }

        /***************************************************
         * 유의사항 + 동의 체크
         ***************************************************/
        .rd-note {
          padding: 10px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          color: #374151;
        }
        .rd-agree {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          color: #6b7280;
        }

        /* 커스텀 불릿 리스트: 유의사항 안에서만 좌측 정렬 */
        .custom-bullet {
          list-style: disc;
          padding-left: 18px;
          margin: 15px 0 20px 25px; // t,r,b,l
          text-align: left;

        }
        .custom-bullet li { 
        margin: 4px 0;
         }

         .custom-bullet li::marker {
         font-size: 8px;  /* 점 크기 */
         color: #444;      /* 점 색상 */
                }

        /***************************************************
         * 리스트 형태
         ***************************************************/
        .rd-list { display: block; }
        .rd-line {
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: baseline;
          padding: 6px 0;
          
        }
        .rd-line:last-child { border-bottom: 0; }

        /***************************************************
         * 요청사항 박스
         ***************************************************/
        .rd-box {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-height: 48px;
          background: #fff;
          white-space: pre-wrap;
        }

        /***************************************************
         * 하단 버튼(두 개 동일 스타일)
         ***************************************************/
        .rd-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
          width: 100%;
        }
        .rd-btn,
        a.rd-btn {
          display: inline-block;
          padding: 8px 14px;
          background: #ffffff !important;
          border: 1px solid #9ca3af !important;
          color: #111111 !important;
          border-radius: 8px !important;
          text-decoration: none !important;
          cursor: pointer;
        }
        .rd-btn:hover,
        a.rd-btn:hover { background: #f9fafb !important; }

        :global(a.rd-btn) {
          display: inline-block;
          padding: 8px 14px;
          background: #ffffff !important;
          border: 1px solid #9ca3af !important;
          color: #111111 !important;
          border-radius: 8px !important;
          text-decoration: none !important;
          cursor: pointer;
        }
        :global(a.rd-btn:hover) {
          background: #f9fafb !important;
        }
      `}</style>
    </RequireLogin>
  );
}
