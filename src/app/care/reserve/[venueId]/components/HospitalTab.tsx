// src/app/care/reserve/[venueId]/components/HospitalTab.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from './Calendar';
import venueApi from '@/features/venue/data/venue.api';
import type { DoctorDTO, CreateHospitalReservationReq, PetGender } from '@/features/venue/data/venue.types';

/* ── 유틸(원본 유지) ───────────────────────────────────────── */
function buildTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 10; h <= 18; h++) {
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
/* ───────────────────────────────────────────────────────── */

type Props = {
  venueId: number;
  venueName: string;
};

export default function HospitalTab({ venueId }: Props) {
  const router = useRouter();

  // 공통 입력
  const [reserverName, setReserverName] = useState('');
  const [agree, setAgree] = useState(false);
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [petName, setPetName] = useState('');
  const [petBirthYear, setPetBirthYear] = useState<number | ''>('');
  const [memo, setMemo] = useState('');

  // 병원 전용
  const [petSpecies, setPetSpecies] = useState('');
  const [petGender, setPetGender] = useState<PetGender | ''>('');

  // 날짜/시간/의사
  const [date, setDate] = useState('');      // YYYY-MM-DD
  const [time, setTime] = useState('');      // HH:mm
  const [doctors, setDoctors] = useState<DoctorDTO[] | null>(null);
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);

  const timeSlots = useMemo(buildTimeSlots, []);
  const years = useMemo(buildBirthYears, []);

  // 의사 목록 로드(원본 로직 유지)
 useEffect(() => {
  if (!(venueId > 0)) { setDoctors([]); return; }
  (async () => {
    try {
      const list = await venueApi.listDoctors(venueId);
      setDoctors(list || []);
    } catch {
      setDoctors([]);
    }
  })();
}, [venueId]);


// venue가 바뀌면 선택된 의사/시간/불가시간 초기화
useEffect(() => {
  setDoctorId('');
  setTime('');
  setUnavailableTimes([]);
}, [venueId]);


  // 의사/날짜 변경 시 예약 불가 시간 갱신(원본 로직 유지)
  useEffect(() => {
    async function fetchUnavailableTimes(did?: number, ymd?: string) {
      if (!did || !ymd) {
        setUnavailableTimes([]);
        return;
      }
      try {
        const arr = await venueApi.listUnavailableTimes({ doctorId: did, date: ymd });
        setUnavailableTimes(Array.from(new Set((arr || []).filter((t: any): t is string => typeof t === 'string'))));
      } catch {
        setUnavailableTimes([]);
      }
    }
    if (doctorId && date) {
      fetchUnavailableTimes(Number(doctorId), date);
      setTime('');
    }
  }, [doctorId, date]);

  const canSubmit =
    venueId > 0 &&
    date && time &&
    doctorId !== '' &&
    reserverName.trim() &&
    primaryPhone.trim() &&
    petName.trim() &&
    petBirthYear !== '' &&
    petSpecies.trim() &&
    petGender !== '';

async function submit() {
  if (!canSubmit) return;

  // 1) 동의 체크
  if (!agree) {
    alert("유의사항에 체크해주세요.");
    return;
  }

  // 2) 과거 시각 클라이언트 차단 (date: YYYY-MM-DD, time: HH:mm)
  if (!date || !time) return;
  const selected = new Date(`${date}T${time}:00`);
  const now = new Date();
  if (isNaN(selected.getTime()) || selected.getTime() < now.getTime()) {
    alert("지나간 날짜는 예약할 수 없습니다.");
    return;
  }

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

  // 3) API 호출 + 서버측 400 메시지 노출
  try {
    await venueApi.createHospitalReservation(venueId, body);
    alert("예약 신청이 완료되었습니다.");
    router.push("/");
  } catch (err: any) {
    const msg =
      err?.response?.status === 400
        ? (err?.response?.data?.message || "지나간 날짜는 예약할 수 없습니다.")
        : "예약 중 오류가 발생했습니다.";
    alert(msg);
  }
}



  return (
    <div className="space-y-8">
      {/* 상단: 달력(좌) + (우) 선생님 선택/시간 버튼 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       
          
          <Calendar mode="single" value={date} onChange={(v: string) => setDate(v)} />
        

        <div className="card mt-[15px]">
          {/* 선생님 선택 */}
          <div className="card-title">담당의 선택</div>
          <select
            className="inp mb-4"
            onFocus={() =>
              !doctors && venueId > 0 &&
              venueApi.listDoctors(venueId).then(setDoctors).catch(() => setDoctors([]))
            }
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">수의사를 선택해주세요</option>
            {(doctors || []).map((d) => (
              <option key={d.doctorId} value={d.doctorId}>{d.doctorName}</option>
            ))}
          </select>

          <div className="card-title mt-[15px]">진료 시간</div>
          <div className="slot-grid mt-[15px] mb-[15px]">
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
      <div className="card-notice">
        <div className="card-title">※ 예약 유의사항</div>
        <div className="note">
         <ul className="custom-bullet">
          <li>예약 시간 10분 전까지 도착해주세요</li>
          <li>예약 변경 및 취소는 최소 하루 전까지 가능합니다</li>
          <li>예약 시간으로부터 15분 경과 시 미접수 고객님은 노쇼 처리됩니다</li>
          <li>무단 취소/노쇼가 반복될 경우 추후 예약이 제한될 수 있습니다</li>
          <li>반려동물은 반드시 목줄·이동장을 이용해주세요</li>
          <li>공격성이 있는 반려동물은 사전 고지 바랍니다</li>
          <li>진료 내용에 따라 대기 시간이 발생할 수 있습니다</li>
          <li>응급 환자는 예약 순서와 무관하게 우선 진료될 수 있습니다</li>
          <li> <p/>
          ※ 요청사항에 아래와 같은 내용을 반드시 기재해주세요
          <p/>
           최근 증상, 복용 중인 약/치료 이력, 알레르기 정보, 진료 목적, 공격성 여부, 
           <br/>진료 시 주의사항 , 특이사항
          </li>
         <li>요청사항에 필요한 정보를 기재하지 않아 발생하는 불이익은 병원이 책임지지 않습니다 </li>
        </ul>

        </div>
      </div>

           <label className="flex items-center space-x-2 mt-[10px] mb-[20px] gap-[10px]">
  <input
    type="checkbox"
    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
    checked={agree}
    onChange={(e) => setAgree(e.target.checked)}
    aria-describedby="agree-help"
  />
  <div className="text-sm text-gray-700">
    <p>유의사항을 모두 확인하였으며 동의합니다.</p>
  
  </div>
</label>


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
                <option key={y} value={y}>{y}년생</option>
              ))}
            </select>
          </label>
          <label className="row">
            <span>반려동물 종류</span>
            <input className="inp" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)} />
          </label>
          <label className="row">
            <span>반려동물 성별</span>
            <div className="flex gap-[5px]">
              <button type="button" className={`chip ${petGender === 'FEMALE' ? 'active' : ''}`} onClick={() => setPetGender('FEMALE')}>암컷</button>
              <button type="button" className={`chip ${petGender === 'MALE' ? 'active' : ''}`} onClick={() => setPetGender('MALE')}>수컷</button>
            </div>
          </label>
        </div>
      </div>

      {/* 요청사항 */}
      <div className="card">
        <div className="card-title">요청사항</div>
        <textarea
          className="inp-1"
          rows={7}
          placeholder="요청사항을 입력해 주세요"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      {/* 버튼 */}
      <div className="actions mt-[20px] mb-[50px]">
       <button className="btn-primary" onClick={submit} disabled={!canSubmit || !agree}>예약신청</button>

        <button className="btn" onClick={() => router.push('/')}>취소</button>
      </div>

      {/* ───────────────────────────────────────────────
          HospitalTab 전용/공용 스타일 (원본 디자인 요소 반영)
         ─────────────────────────────────────────────── */}
     <style jsx>{`
  /***************************************************
   * 공통 카드/폼/버튼/슬롯 스타일
   * - 원본 스타일 유지
   * - 의미별로 구역을 나눠 주석 정리
   ***************************************************/

  /* ───────── 카드(박스) ───────── */
  /* 카드 컨테이너: 테두리 + 둥근모서리 + 내부여백 */
  .card {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 16px;
    background: #fff;

  }

  /* 카드 내 섹션 타이틀(볼드 + 아랫간격) */
  .card-title {
    font-weight: 600;
    margin-bottom: 10px;
  }

  /* ───────── 유의사항 ───────── */
  .card-notice{
    border: 1px solid #ffffffff;
    border-radius: 16px;
    padding: 16px;
    background: #fff;
  }

  /* ───────── 안내문 ───────── */
  /* 설명/보조문구 컬러 */
  .note {
    color: #6b7280;
    font-size: 15px;
    margin-left: -10px;
    margin-top: 10px;
  }
  .custom-bullet li::marker {
    font-size: 0.5em;  /* 크기 조절 */
    color: #333;       /* 색상도 변경 가능 */
  }
    .custom-bullet li {
      line-height: 1.3;   /* 줄간격 */
      margin-bottom: 6px; /* 항목 간격 */
    }


  /* ───────── 폼(라벨/인풋) ───────── */
  /* 폼 블록 타이틀 */
  .form-title {
    font-weight: 600;
    margin-bottom: 10px;
    margin-left: 5px;
    margin-top: 8px;
  }

  /* 한 줄(라벨 + 입력영역) 레이아웃
     - 좌측 라벨 고정폭 130px, 우측은 가변(1fr)
     - 수직 중앙정렬 + 요소 간 10px 간격
  */
  .row {
    display: grid;
    grid-template-columns: 130px 1fr;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    margin-left: 10px;
  }

  /* 입력요소 공통: 테두리/둥근모서리/패딩/가로폭 */
  .inp {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 10px;
    width: 200px;
    background: #fff;
  }

  .inp-1{
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 15px 10px 20px 20px;
    margin-left: 1px;
    width: 530px;
    background: #fff;

  }

  /* ───────── 시간 슬롯(그리드 + 버튼) ───────── */
  /* 시간 버튼 그리드
     - 기본 4열, md(≥768px)에서는 6열로 확장
     - 격자 간격 8px
  */
  .slot-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
  }

  /* 반응형: 768px 이상에서 6열 */
  @media (min-width: 768px) {
    .slot-grid {
      grid-template-columns: repeat(6, minmax(0, 1fr));
    }
  }

  /* 시간 슬롯 버튼 기본 모양 */
  .slot {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 8px 0;       /* 세로 여백만(텍스트 중앙 정렬) */
    background: #fff;
  }

  /* 활성(선택)된 시간 슬롯: 약한 음영 + 배경 강조 */
  .slot.active {
    background: #eee;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12);
  }

  /* 비활성(예약 불가) 슬롯: 흐리게 + 커서 제한 */
  .slot.disabled {
    background: #f3f4f6;
    color: #9ca3af;
    cursor: not-allowed;
    opacity: 0.65;
  }

  /* ───────── 칩 버튼(성별 선택 등) ───────── */
  /* 칩 기본: 둥근 캡슐 형태 */
  .chip {
    border: 1px solid #e5e7eb;
    border-radius: 999px;  /* 완전 둥근-pill */
    padding: 6px 12px;
    background: #fff;
  }

  /* 칩 활성: 연한 회색 배경 */
  .chip.active {
    background: #eee;
  }

  /* ───────── 하단 액션 버튼 영역 ───────── */
  /* 버튼 묶음: 가운데 정렬 + 간격 10px */
  .actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  /* 보통 버튼 */
  .btn {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 8px 18px;
    background: #fff;
  }

  /* 기본 강조 버튼(살짝 그림자) */
  .btn-primary {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 8px 18px;
    background: #fff;
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
  }

  /* 비활성 강조 버튼: 반투명 + 클릭 불가 */
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`}</style>

    </div>
  );
}
