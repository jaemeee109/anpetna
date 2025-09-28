// src/app/care/reserve/[venueId]/components/Calendar.tsx
'use client';

import { useState } from 'react';

/* ── 타입 정의 (원본 달력 시그니처 유지) ───────────────────────── */
type SingleProps = {
  mode: 'single';
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
};
type RangeProps = {
  mode: 'range';
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
  onChange: (next: { start?: string; end?: string }) => void;
};
type CalendarProps = SingleProps | RangeProps;
/* ─────────────────────────────────────────────────────────── */

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export default function Calendar(props: CalendarProps) {
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
        <button type="button" className="cal-nav" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        <div className="cal-title">{viewYear}.{pad2(viewMonth + 1)}</div>
        <button type="button" className="cal-nav" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
      </div>

      <div className="cal-week">
        <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
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
              className={`cal-day ${c.ymd ? '' : 'empty'} ${selected ? 'selected' : ''} ${edge ? 'edge' : ''}`}
              onClick={() => c.ymd && handlePick(ymd)}
              disabled={!c.ymd}
            >
              {c.day ?? ''}
            </button>
          );
        })}
      </div>

      {/* 달력 전용 스타일 (원본 그대로) */}
      <style jsx>{`
         /* 전체 달력 컨테이너 */
      .cal {
        border: 1px solid #e5e7eb;      /* 옅은 회색 테두리 */
        border-radius: 16px;             /* 둥근 모서리 */
        padding: 12px;                   /* 내부 여백 */
        background: #fff;                /* 흰색 배경 */
      }

      /* 상단: 이전/제목/다음 영역 */
      .cal-header {
        display: flex;                   /* 가로 배치 */
        align-items: center;             /* 세로 중앙 정렬 */
        justify-content: space-between;  /* 좌:이전, 가운데:제목, 우:다음 */
        margin-bottom: 8px;              /* 아래쪽 간격 */
      }

      /* 현재 연/월 텍스트 */
      .cal-title {
        font-weight: 600;                /* 약간 굵게 */
      }

      /* 이전/다음 달 이동 버튼 */
      .cal-nav {
        border: 1px solid #e5e7eb;       /* 버튼 테두리 */
        border-radius: 8px;              /* 둥근 모서리 */
        padding: 4px 10px;               /* 버튼 내부 여백 */
        background: #fff;                /* 흰색 배경 */
        cursor: pointer;                 /* 클릭 가능 커서 */
      }

      /* 요일(일~토) 헤더 행 */
      .cal-week {
        display: grid;                   /* 7등분 그리드 */
        grid-template-columns: repeat(7, 1fr);
        font-size: 12px;                 /* 작은 폰트 */
        color: #6b7280;                  /* 중간 회색 글자 */
        margin: 6px 0;                   /* 위/아래 간격 */
        text-align: center;              /* 가운데 정렬 */
      }

      /* 날짜 셀 그리드 */
      .cal-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr); /* 7열 고정 */
        gap: 6px;                        /* 셀 간격 */
      }

      /* 날짜 버튼 기본 모양 */
      .cal-day {
        border: 1px solid #e5e7eb;       /* 셀 테두리 */
        border-radius: 8px;              /* 살짝 둥글게 */
        min-height: 38px;                /* 터치 영역 확보 */
        background: #fff;                /* 흰색 배경 */
      }

      /* 비어있는 칸(해당 월에 속하지 않는 자리) */
      .cal-day.empty {
        visibility: hidden;              /* 자리는 유지, 내용만 숨김 */
      }

      /* 선택된 날짜 또는 범위 내부(단일/레인지 공통) */
      .cal-day.selected {
        background: #eee;                /* 선택 표시용 연회색 배경 */
      }

      /* 선택 범위의 시작/끝(엣지) 강조 */
      .cal-day.edge {
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.12); /* 안쪽 음영으로 포커스 */
      }

      /* ───────── 옵션: 필요하면 활성/호버 피드백 추가 ─────────
      .cal-day:not(.empty):hover {
        background: #f8fafc;             // 살짝 밝은 배경
      } }
      `}</style>
    </div>
  );
}
