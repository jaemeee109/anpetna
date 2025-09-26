// src/app/care/reserve/[venueId]/page.tsx
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import PawIcon from '@/components/icons/Paw';
import venueApi from '@/features/venue/data/venue.api';
import type {
  DoctorDTO,
  CreateHospitalReservationReq,
  CreateHotelReservationReq,
  PetGender,
} from '@/features/venue/data/venue.types';

type Tab = 'HOSPITAL' | 'HOTEL';

/* ===================== 공통 유틸 ===================== */
function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/* ===================== 인라인 달력 컴포넌트 ===================== */
type CalendarProps =
  | {
      mode: 'single';
      value?: string; // YYYY-MM-DD
      onChange: (value: string) => void;
    }
  | {
      mode: 'range';
      start?: string; // YYYY-MM-DD
      end?: string; // YYYY-MM-DD
      onChange: (next: { start?: string; end?: string }) => void;
    };

function Calendar(props: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-11

  function changeMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const first = new Date(viewYear, viewMonth, 1);
  const firstWeekday = first.getDay(); // 0-6
  const last = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = last.getDate();

  const cells: Array<{ ymd: string | null; day?: number }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ ymd: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ ymd: `${viewYear}-${pad2(viewMonth + 1)}-${pad2(d)}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ ymd: null });

  const sel = props.mode === 'single' ? props.value : undefined;
  const start = props.mode === 'range' ? props.start : undefined;
  const end = props.mode === 'range' ? props.end : undefined;

  function isSelected(ymd: string) {
    if (!ymd) return false;
    if (props.mode === 'single') return sel === ymd;
    if (start && end) return ymd >= start && ymd <= end;
    if (start && !end) return ymd === start;
    return false;
  }
  function isRangeEdge(ymd: string) {
    if (props.mode !== 'range' || !ymd) return false;
    return (start && ymd === start) || (end && ymd === end);
  }

  function handlePick(ymd: string) {
    if (!ymd) return;
    if (props.mode === 'single') {
      props.onChange(ymd);
      return;
    }
    // range
    const hasStart = !!start;
    const hasEnd = !!end;
    if (!hasStart || (hasStart && hasEnd)) {
      props.onChange({ start: ymd, end: undefined });
    } else if (hasStart && !hasEnd) {
      if (ymd >= start!) props.onChange({ start, end: ymd });
      else props.onChange({ start: ymd, end: start });
    }
  }

  return (
    <div className="cal">
      <div className="cal-header">
        <button type="button" className="cal-nav" onClick={() => changeMonth(-1)} aria-label="이전 달">
          ‹
        </button>
        <div className="cal-title">
          {viewYear}.{pad2(viewMonth + 1)}
        </div>
        <button type="button" className="cal-nav" onClick={() => changeMonth(1)} aria-label="다음 달">
          ›
        </button>
      </div>
      <div className="cal-week">
        <span>일</span>
        <span>월</span>
        <span>화</span>
        <span>수</span>
        <span>목</span>
        <span>금</span>
        <span>토</span>
      </div>
      <div className="cal-grid">
        {cells.map((c, i) => {
          const ymd = c.ymd ?? '';
          const selected = ymd && isSelected(ymd);
          const edge = ymd && isRangeEdge(ymd);
          return (
            <button
              key={i}
              type="button"
              className={`cal-day ${c.ymd ? '' : 'empty'} ${selected ? 'selected' : ''} ${
                edge ? 'edge' : ''
              }`}
              onClick={() => c.ymd && handlePick(ymd)}
              disabled={!c.ymd}
            >
              {c.day ?? ''}
            </button>
          );
        })}
      </div>
      <style jsx>{`
        .cal {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 12px;
          background: #fff;
        }
        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .cal-title {
          font-weight: 600;
        }
        .cal-nav {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 4px 10px;
          background: #fff;
        }
        .cal-week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          font-size: 12px;
          color: #6b7280;
          margin: 6px 0;
          text-align: center;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }
        .cal-day {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          min-height: 38px;
          background: #fff;
        }
        .cal-day.empty {
          visibility: hidden;
        }
        .cal-day.selected {
          background: #eee;
        }
        .cal-day.edge {
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
        }
      `}</style>
    </div>
  );
}

/* ===================== 옵션 빌더 ===================== */
function buildTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 9; h <= 18; h++) {
    for (const m of [0, 30]) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      out.push(`${hh}:${mm}`);
    }
  }
  return out;
}
function buildBirthYears(): number[] {
  const now = new Date().getFullYear();
  const years: number[] = [];
  for (let y = now; y >= 2000; y--) years.push(y);
  return years;
}

/* ===================== 페이지 ===================== */
export default function ReservePage() {
  const params = useParams<{ venueId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const venueId = Number(params?.venueId);
  const venueName = sp.get('name') || '선택 지점';
  const [tab, setTab] = useState<Tab>('HOSPITAL');

  // 공통 입력
  const [reserverName, setReserverName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [petName, setPetName] = useState('');
  const [petBirthYear, setPetBirthYear] = useState<number | ''>('');
  const [memo, setMemo] = useState('');

  // 병원 전용
  const [petSpecies, setPetSpecies] = useState('');
  const [petGender, setPetGender] = useState<PetGender | ''>('');

  // 병원 탭
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [time, setTime] = useState('');
  const [doctors, setDoctors] = useState<DoctorDTO[] | null>(null);
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]); // 예약 불가 시간

  // 호텔 탭
  const [checkIn, setCheckIn] = useState(''); // YYYY-MM-DD
  const [checkOut, setCheckOut] = useState(''); // YYYY-MM-DD

  const timeSlots = useMemo(buildTimeSlots, []);
  const years = useMemo(buildBirthYears, []);

  // 병원 탭 진입 시 의사 목록 1회 로드
  useEffect(() => {
    if (tab !== 'HOSPITAL' || doctors || !(venueId > 0)) return;
    (async () => {
      try {
        const list = await venueApi.listDoctors(venueId);
        setDoctors(list || []);
      } catch {
        setDoctors([]);
      }
    })();
  }, [tab, venueId, doctors]);

  // 의사/날짜 변경 시 예약 불가 시간 갱신
  useEffect(() => {
    async function fetchUnavailableTimes(did?: number, ymd?: string) {
      if (!did || !ymd) {
        setUnavailableTimes([]);
        return;
      }
      try {
        const times = await venueApi.listUnavailableTimes({ doctorId: did, date: ymd });
        setUnavailableTimes(times || []);
      } catch {
        setUnavailableTimes([]);
      }
    }
    if (tab === 'HOSPITAL' && doctorId && date) {
      fetchUnavailableTimes(Number(doctorId), date);
      setTime(''); // 의사/날짜 바뀌면 시간 초기화
    }
  }, [tab, doctorId, date]);

  const canSubmitHospital =
    tab === 'HOSPITAL' &&
    venueId > 0 &&
    date &&
    time &&
    doctorId !== '' &&
    reserverName.trim() &&
    primaryPhone.trim() &&
    petName.trim() &&
    petBirthYear !== '' &&
    petSpecies.trim() &&
    petGender !== '';

  const canSubmitHotel =
    tab === 'HOTEL' &&
    venueId > 0 &&
    checkIn &&
    checkOut &&
    reserverName.trim() &&
    primaryPhone.trim() &&
    petName.trim() &&
    petBirthYear !== '';

async function submitHospital() {
  if (!canSubmitHospital) return;
  const appointmentAt = `${date}T${time}:00`;
  const body: CreateHospitalReservationReq = {
    doctorId: Number(doctorId),
    appointmentAt,
    reserverName,
    primaryPhone,
    secondaryPhone: secondaryPhone || undefined,
    petName,
    petBirthYear: Number(petBirthYear),
    petSpecies,
    petGender: petGender as PetGender,
    memo: memo || undefined,
  };
  // ✅ venueId를 함께 전달
 await venueApi.createHospitalReservation(body);
  alert('예약 신청이 완료되었습니다.');
  router.push('/');
}

  async function submitHotel() {
    if (!canSubmitHotel) return;
    const body: CreateHotelReservationReq = {
      checkIn,
      checkOut,
      reserverName,
      primaryPhone,
      secondaryPhone: secondaryPhone || undefined,
      petName,
      petBirthYear: Number(petBirthYear),
      memo: memo || undefined,
    };
    await venueApi.createHotelReservation(body);
    alert('예약 신청이 완료되었습니다.');
    router.push('/');
  }

  const hotelSelectedRange = checkIn && checkOut ? `${checkIn} ~ ${checkOut}` : '';

  return (
    <RequireLogin>
      <section className="mx-auto w-full max-w-[800px] px-4 py-6">
        {/* 선택한 지점명 */}
        <h1 className="text-3xl font-semibold mb-6 flex justify-center items-center gap-2">
          {venueName}
          <PawIcon className="w-[1em] h-[1em] text-current ml-[5px]" />
        </h1>

        {/* 병원/호텔 탭 */}
        <div className="flex items-center gap-3 mb-8">
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

        {/* ====== 탭: 호텔 (01.PNG 배치) ====== */}
        {tab === 'HOTEL' && (
          <div className="space-y-8">
            {/* 상단: 달력(좌) + 유의사항(우) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-title">달력</div>
                <Calendar
                  mode="range"
                  start={checkIn}
                  end={checkOut}
                  onChange={({ start, end }) => {
                    setCheckIn(start || '');
                    setCheckOut(end || '');
                  }}
                />
              </div>
              <div className="card">
                <div className="card-title">예약 유의사항</div>
                <div className="note">예약에 대한 유의사항이 적혀있는 곳</div>
              </div>
            </div>

            {/* 선택한 날짜 표시 */}
            <div className="pill">
              {hotelSelectedRange || '달력에서 선택한 날짜를 표시합니다 (예: 2025.09.03~2025.09.10)'}
            </div>

            {/* 하단: 좌측 메모, 우측 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="card">
                <div className="card-title">요청사항</div>
                <textarea
                  className="inp"
                  rows={7}
                  placeholder="요청사항을 입력해 주세요"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-8">
                <div className="form card">
                  <div className="form-title">예약자 정보를 입력해주세요</div>
                  <label className="row">
                    <span>예약자 이름</span>
                    <input className="inp" value={reserverName} onChange={(e) => setReserverName(e.target.value)} />
                  </label>
                  <label className="row">
                    <span>예약자 연락처</span>
                    <input className="inp" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} />
                  </label>
                  <label className="row">
                    <span>추가 연락처</span>
                    <input className="inp" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
                  </label>
                  <label className="row">
                    <span>반려동물 이름</span>
                    <input className="inp" value={petName} onChange={(e) => setPetName(e.target.value)} />
                  </label>
                  <label className="row">
                    <span>반려동물 나이</span>
                    <select
                      className="inp"
                      value={petBirthYear}
                      onChange={(e) => setPetBirthYear(e.target.value ? Number(e.target.value) : '')}
                    >
                      <option value="">출생년도 선택</option>
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}년생
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="actions">
              <button className="btn-primary" onClick={submitHotel} disabled={!canSubmitHotel}>
                예약신청
              </button>
              <button className="btn" onClick={() => router.push('/')}>
                취소
              </button>
            </div>
          </div>
        )}

        {/* ====== 탭: 병원 (02.PNG 배치) ====== */}
        {tab === 'HOSPITAL' && (
          <div className="space-y-8">
            {/* 상단: 달력(좌) + (우) 선생님 선택 → 시간 버튼 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <div className="card-title">달력</div>
                <Calendar mode="single" value={date} onChange={(v) => setDate(v)} />
              </div>

              <div className="card">
                {/* 선생님 선택 (시간 버튼 위) */}
                <div className="card-title">선생님</div>
                <select
                  className="inp mb-4"
                  onFocus={() =>
                    !doctors && venueId > 0 && venueApi.listDoctors(venueId).then(setDoctors).catch(() => setDoctors([]))
                  }
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">선택하세요</option>
                  {(doctors || []).map((d) => (
                    <option key={d.doctorId} value={d.doctorId}>
                      {d.doctorName}
                    </option>
                  ))}
                </select>

                <div className="card-title">진료 시간</div>
                <div className="slot-grid">
                  {timeSlots.map((t) => {
                    const disabled = unavailableTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`slot ${time === t ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                        onClick={() => !disabled && setTime(t)}
                        disabled={disabled}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 유의사항 */}
            <div className="card">
              <div className="card-title">예약 유의사항</div>
              <div className="note">예약 유의사항이 적혀있는 곳</div>
            </div>

            {/* 중단: 좌(예약자) | 우(반려동물) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="form card">
                <div className="form-title">예약자 정보를 입력해주세요</div>
                <label className="row">
                  <span>예약자 이름</span>
                  <input className="inp" value={reserverName} onChange={(e) => setReserverName(e.target.value)} />
                </label>
                <label className="row">
                  <span>예약자 연락처</span>
                  <input className="inp" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} />
                </label>
                <label className="row">
                  <span>추가 연락처</span>
                  <input className="inp" value={secondaryPhone} onChange={(e) => setSecondaryPhone(e.target.value)} />
                </label>
              </div>

              <div className="form card">
                <div className="form-title">반려동물 정보를 입력해주세요</div>
                <label className="row">
                  <span>반려동물 이름</span>
                  <input className="inp" value={petName} onChange={(e) => setPetName(e.target.value)} />
                </label>
                <label className="row">
                  <span>반려동물 나이</span>
                  <select
                    className="inp"
                    value={petBirthYear}
                    onChange={(e) => setPetBirthYear(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">출생년도 선택</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}년생
                      </option>
                    ))}
                  </select>
                </label>
                <label className="row">
                  <span>반려동물 종류</span>
                  <input className="inp" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} />
                </label>
                <label className="row">
                  <span>반려동물 성별</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={`chip ${petGender === 'FEMALE' ? 'active' : ''}`}
                      onClick={() => setPetGender('FEMALE')}
                    >
                      암컷
                    </button>
                    <button
                      type="button"
                      className={`chip ${petGender === 'MALE' ? 'active' : ''}`}
                      onClick={() => setPetGender('MALE')}
                    >
                      수컷
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {/* 요청사항 */}
            <div className="card">
              <div className="card-title">요청사항</div>
              <textarea
                className="inp"
                rows={7}
                placeholder="요청사항을 입력해 주세요"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            {/* 버튼 */}
            <div className="actions">
              <button className="btn-primary" onClick={submitHospital} disabled={!canSubmitHospital}>
                예약신청
              </button>
              <button className="btn" onClick={() => router.push('/')}>
                취소
              </button>
            </div>
          </div>
        )}

        {/* 스타일 — 기존 톤 유지, 달력/그리드 배치 추가 */}
        <style jsx>{`
          .tab {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 6px 16px;
            background: #fff;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          }
          .tab.active {
            background: #eee;
          }
          .card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 16px;
            background: #fff;
          }
          .card-title {
            font-weight: 600;
            margin-bottom: 10px;
          }
          .pill {
            display: inline-block;
            border: 1px dashed #e5e7eb;
            border-radius: 999px;
            padding: 8px 14px;
            color: #6b7280;
          }
          .note {
            color: #6b7280;
          }

          .form-title {
            font-weight: 600;
            margin-bottom: 10px;
          }
          .row {
            display: grid;
            grid-template-columns: 130px 1fr;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
          }
          .inp {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px 10px;
            width: 100%;
            background: #fff;
          }

          .slot-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 8px;
          }
          @media (min-width: 768px) {
            .slot-grid {
              grid-template-columns: repeat(6, minmax(0, 1fr));
            }
          }
          .slot {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px 0;
            background: #fff;
          }
          .slot.active {
            background: #eee;
            box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
          }
          .slot.disabled {
            background: #f3f4f6;
            color: #9ca3af;
            cursor: not-allowed;
            opacity: 0.65;
          }

          .chip {
            border: 1px solid #e5e7eb;
            border-radius: 999px;
            padding: 6px 12px;
            background: #fff;
          }
          .chip.active {
            background: #eee;
          }

          .actions {
            display: flex;
            gap: 10px;
            justify-content: center;
          }
          .btn {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 8px 18px;
            background: #fff;
          }
          .btn-primary {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 8px 18px;
            background: #fff;
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
          }
          .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </section>
    </RequireLogin>
  );
}
