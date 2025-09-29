// src/app/care/reserve/[venueId]/components/HotelTab.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from './Calendar';
import venueApi from '@/features/venue/data/venue.api';
import type { CreateHotelReservationReq } from '@/features/venue/data/venue.types';

/* ── 유틸(원본 유지) ───────────────────────────────────────── */
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

export default function HotelTab({ venueId }: Props) {
  const router = useRouter();

  // 공통 입력
  const [reserverName, setReserverName] = useState('');
  const [agree, setAgree] = useState(false);
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [petName, setPetName] = useState('');
  const [petBirthYear, setPetBirthYear] = useState<number | ''>('');
  const [memo, setMemo] = useState('');

  // 날짜
  const [checkIn, setCheckIn] = useState('');   // YYYY-MM-DD
  const [checkOut, setCheckOut] = useState(''); // YYYY-MM-DD

  const years = useMemo(buildBirthYears, []);

  const canSubmit =
    venueId > 0 &&
    checkIn && checkOut &&
    reserverName.trim() &&
    primaryPhone.trim() &&
    petName.trim() &&
    petBirthYear !== '';

 async function submit() {
  if (!canSubmit) return;

  // 1) 동의 체크
  if (!agree) {
    alert("유의사항에 체크해주세요.");
    return;
  }

  // 2) 과거 날짜/순서 클라이언트 차단
  if (!checkIn || !checkOut) return;
  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const inDate = new Date(`${checkIn}T00:00:00`);
  const outDate = new Date(`${checkOut}T00:00:00`);

  if (isNaN(inDate.getTime()) || inDate.getTime() < todayZero.getTime()) {
    alert("지나간 날짜는 예약할 수 없습니다.");
    return;
  }
  if (!(outDate.getTime() > inDate.getTime())) {
    alert("퇴실일은 입실일 다음날 이후여야 합니다.");
    return;
  }

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

  try {
    await venueApi.createHotelReservation(venueId, {
      ...body,
      checkIn: `${checkIn}T00:00:00`,
      checkOut: `${checkOut}T00:00:00`,
    });
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



  const selectedRange = checkIn && checkOut ? `${checkIn} ~ ${checkOut}` : '';

  return (
    <div className="space-y-8">
      {/* 상단: 달력(좌) + 유의사항(우) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
    
          <Calendar
            mode="range"
            start={checkIn}
            end={checkOut}
            onChange={(next: { start?: string; end?: string }) => {
              const { start, end } = next;
              setCheckIn(start || '');
              setCheckOut(end || '');
            }}
          />
        
               {/* 선택한 날짜 표시 */}
            <div className="pill mt-[10px] mb-[10px]">
                <span className="pill-indent">
              {selectedRange || '예약 날짜를 선택해주세요'}
              </span>
            </div>
      
        
          <div className="card-title mt-[20px] ml-[15px] ">※ 예약 유의사항</div>
          <div className="note mb-[20px]">
             <ul className="custom-bullet">
            <li>체크인은 오후 2시 이후, 체크아웃은 오전 11시까지입니다</li>
            <li>예방접종을 완료한 반려견만 입실 가능합니다</li>
            <li>전염성 질환·발정 중인 반려견은 예약이 제한됩니다</li>
            <li>사료와 간식은 반드시 지참해 주세요</li>
            <li>개인 담요·장난감을 가져오시면 적응에 도움이 됩니다</li>
            <li>예약 변경·취소는 최소 하루 전까지 가능합니다</li>
            <li>무단 취소/노쇼 시 추후 예약이 제한될 수 있습니다</li>
            <li>입실 시 건강 체크가 진행되며, 공격성 반려견은 사전 고지 바랍니다</li>
             <li> <p/> ※ 요청사항에 아래와 같은 내용을 반드시 기재해주세요
              <p/>
            - 반려동물의 종류·식사·배변 습관과 성격
            <br/>- 복용 중인 약이나 알레르기 정보가 있다면 반드시 입력해 주세요
            <br/>- 짖음·분리불안·공격성 등 돌봄 시 주의할 행동을 알려주세요</li>
            <p/>
             <li>요청사항에 기재하지 않은 반려동물의 특성(습관, 성격, 질환 등)으로 인한 
            <br/>&nbsp;문제 발생 시 호텔은 책임지지 않습니다</li>

           
         
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


 

      {/* 하단: 좌측 메모, 우측 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        <div className="grid grid-cols-1 gap-8">
          <div className="form card mt-[20px]">
            <div className="form-title">예약 정보를 입력해주세요</div>
            <label className="row">
              <span>예약자 이름</span>
              <input className="inp" value={reserverName} onChange={(e) => setReserverName(e.target.value)} />
            </label>
            <label className="row">
              <span>예약자 연락처</span>
              <input className="inp" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} />
            </label>
            <label className="row">
              <span>+ 추가 연락처</span>
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
                  <option key={y} value={y}>{y}년생</option>
                ))}
              </select>
            </label>
          </div>
        </div>
          <div className="card mt-[20px]">
          <div className="card-title">요청사항</div>
          <textarea
            className="inp-1 mt-[15px] mb-[10px]"
            rows={7}
            placeholder="요청사항을 입력해 주세요"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="actions gap-[5px] mt-[20px] mb-[50px]">
       <button className="btn-primary" onClick={submit} disabled={!canSubmit || !agree}>예약신청</button>

        <button className="btn" onClick={() => router.push('/')}>취소</button>
      </div>

      {/* ───────────────────────────────────────────────
          HotelTab 전용/공용 스타일 (원본 디자인 요소 반영)
         ─────────────────────────────────────────────── */}
          <style jsx>{`
            /***************************************************
             * 카드, Pill, 안내문, 폼, 버튼 공통 스타일
             * - 원본 스타일 유지
             * - 읽기 쉬운 들여쓰기 + 속성별 설명 주석
             ***************************************************/

            /* ───────── 카드 박스 ───────── */
            .card {
              border: 1px solid #e5e7eb;   /* 옅은 테두리 */
              border-radius: 16px;          /* 둥근 모서리 */
              padding: 16px;                /* 내부 여백 */
              background: #fff;             /* 흰 배경 */
            }

            /* 카드 내 섹션 타이틀 */
            .card-title {
              font-weight: 600;             /* 반굵게 */
              margin-bottom: 10px;          /* 아래 간격 */
            }

            /* ───────── 선택 범위 출력용 Pill ───────── */
            .pill {
          display: block;
          width: 550px;
          margin: 10px auto;          /* 좌우 자동 → 가운데 정렬 */
          border: 0.002em solid #d8d8d8ff; 
          border-radius: 120px;       /* 완전 둥근 캡슐 */
          padding: 8px 14px;          /* 세로/가로 여백 */
          text-align: center;         /* 내부 텍스트 중앙 정렬 */
          background: #fafafaff;
        }

        /* Pill 내부 텍스트
          - 좌측 들여쓰기 margin-left 제거 (가운데 정렬을 방해하므로)
        */
        .pill-indent {
          color: #6e6c6c;
          font-size: 14px;
          font-weight: 500;
          /* margin-left: 12px;  ← 삭제 */
        }

            /* ───────── 안내문(보조 설명) ───────── */
            .note {
              color: #6b7280;               /* 중간 회색 텍스트 */
            }


              .custom-bullet li::marker {
                font-size: 0.5em;  /* 크기 조절 */
                color: #333;       /* 색상도 변경 가능 */
              }
                .custom-bullet li {
                  line-height: 1.3;   /* 줄간격 */
                  margin-bottom: 6px; /* 항목 간격 */
                }


            /* ───────── 폼 영역 ───────── */
            /* 폼 블록 타이틀 */
            .form-title {
              font-weight: 600;             /* 반굵게 */
              margin-bottom: 10px;          /* 아래 간격 */
            }

            /* 한 줄(라벨+입력) 레이아웃
              - 좌측 라벨 고정폭 130px
              - 우측 입력 영역 가변(1fr)
              - 수직 중앙 정렬 + 요소 간격 10px
            */
            .row {
              display: grid;
              grid-template-columns: 130px 1fr;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
            }

            /* 입력 요소 공통 */
            .inp {
              border: 1px solid #e5e7eb;    /* 입력 테두리 */
              border-radius: 8px;           /* 둥근 모서리 */
              padding: 8px 10px;            /* 내부 여백 */
              width: 200px;                  /* 가로 꽉 채우기 */
              background: #fff;             /* 흰 배경 */
            }

            .inp-1 {
            border: 1px solid #e5e7eb;    /* 입력 테두리 */
              border-radius: 8px;           /* 둥근 모서리 */
              padding: 8px 10px;            /* 내부 여백 */
              width: 530px;                  /* 가로 꽉 채우기 */
              background: #fff;             /* 흰 배경 */
              margin-left: 6px;
            }

            /* ───────── 하단 버튼 영역 ───────── */
            .actions {
              display: flex;                /* 가로 배치 */
              gap: 10px;                    /* 버튼 간 간격 */
              justify-content: center;      /* 가운데 정렬 */
            }

            /* 일반 버튼 */
            .btn {
              border: 1px solid #e5e7eb;    /* 테두리 */
              border-radius: 10px;          /* 둥근 모서리 */
              padding: 8px 18px;            /* 내부 여백 */
              background: #fff;             /* 흰 배경 */
            }

            /* 기본 강조 버튼(미세한 그림자로 강조) */
            .btn-primary {
              border: 1px solid #e5e7eb;    /* 테두리 */
              border-radius: 10px;          /* 둥근 모서리 */
              padding: 8px 18px;            /* 내부 여백 */
              background: #fff;             /* 흰 배경 */
              box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06); /* 아래쪽 약한 음영 */
            }

            /* 비활성 강조 버튼: 클릭 불가 표시 */
            .btn-primary:disabled {
              opacity: 0.5;                 /* 반투명 */
              cursor: not-allowed;          /* 금지 커서 */
            }
`}</style>

    </div>
  );
}
