// src/app/care/admin/page.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import PawIcon from '@/components/icons/Paw';
import Pin from '@/components/icons/Pin';
import venueApi from '@/features/venue/data/venue.api';
import type { AdminReservationLine, VenueSummary } from '@/features/venue/data/venue.types';
import { Pagination } from '@/components/layout/Pagination';

type Tab = 'HOSPITAL' | 'HOTEL';
const ALL_STATUSES = ['PENDING','CONFIRMED','REJECTED','CANCELED','NOSHOW'] as const;

/* =====================예약상태 한글화===================== */
const STATUS_LABELS: Record<(typeof ALL_STATUSES)[number], string> = {
  PENDING:   '예약신청',
  CONFIRMED: '예약확정',
  REJECTED:  '예약취소',
  CANCELED:  '접수취소',
  NOSHOW:    '노쇼',
};
/* ===================== 유틸 ===================== */
function pad2(n: number) { return String(n).padStart(2, '0'); }

/** ymd(YYYY-MM-DD) + hm(HH:mm)이 지금보다 과거인지 */
function isPastTime(ymd: string | undefined, hm: string | undefined) {
  if (!ymd || !hm) return false;
  const [Y, M, D] = ymd.split('-').map(Number);
  const [h, m] = hm.split(':').map(Number);
  const slot = new Date(Y, (M ?? 1) - 1, D ?? 1, h ?? 0, m ?? 0, 0, 0);
  return slot.getTime() < new Date().getTime();
}

/** ISO(YYYY-MM-DDTHH:mm..) 또는 'YYYY-MM-DD HH:mm' 을 짧게 표시 */
function fmtYmdHm(v?: string | null) {
  if (!v) return '-';
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 16).replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(v)) return v.slice(0, 16);
  return v;
}

/** YYYY-MM-DD만 잘라내기 */
function ymd(s?: string | null) {
  return (s ?? '').slice(0, 10);
}

/** 병원/호텔 공용: 병원 쪽 대표 시각 추출 */
function extractAppt(row: any): string | undefined {
  return (
    row?.appointmentAt ??
    row?.appointment_at ??
    row?.requestedAt ??
    row?.requested_at ??
    row?.createdAt
  );
}

/** 호텔: 선택 날짜(dayYmd)가 [checkIn ~ checkOut] 사이에 포함되는지 */
function inStayRange(row: any, dayYmd: string): boolean {
  const ci = ymd(row?.checkIn ?? row?.check_in);
  let co = ymd(row?.checkOut ?? row?.check_out);
  if (!ci) return false;
  if (!co) co = ci; // checkOut 없으면 당일 체류로 처리
  return ci <= dayYmd && dayYmd <= co;
}

/* ===================== 인라인 달력 ===================== */
type CalendarProps =
  | { mode:'single'; value?: string; onChange: (value: string) => void; }
  | { mode:'range'; start?: string; end?: string; onChange: (next:{start?:string; end?:string}) => void; };

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

  const sel = (props as any).value as string | undefined;
  const start = (props as any).start as string | undefined;
  const end = (props as any).end as string | undefined;

  function isSelected(ymd: string) {
    if (!ymd) return false;
    if ((props as any).mode === 'single') return sel === ymd;
    if (start && end) return ymd >= start && ymd <= end;
    if (start && !end) return ymd === start;
    return false;
  }
  function isRangeEdge(ymd: string) {
    if ((props as any).mode !== 'range' || !ymd) return false;
    return (start && ymd === start) || (end && ymd === end);
  }
  function handlePick(ymd: string) {
    if (!ymd) return;
    if ((props as any).mode === 'single') {
      (props as any).onChange(ymd);
      return;
    }
    const hasStart = !!start;
    const hasEnd = !!end;
    if (!hasStart || (hasStart && hasEnd)) {
      (props as any).onChange({ start: ymd, end: undefined });
    } else if (hasStart && !hasEnd) {
      if (ymd >= start!) (props as any).onChange({ start, end: ymd });
      else (props as any).onChange({ start: ymd, end: start });
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
      <style jsx>{`
        .cal { border:1px solid #e5e7eb; border-radius:16px; padding:12px; background:#fff; }
        .cal-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
        .cal-title { font-weight:600; }
        .cal-nav { border:1px solid #e5e7eb; border-radius:8px; padding:4px 10px; background:#fff; }
        .cal-week { display:grid; grid-template-columns:repeat(7,1fr); font-size:12px; color:#6b7280; margin:6px 0; text-align:center; }
        .cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:6px; }
        .cal-day { border:1px solid #e5e7eb; border-radius:8px; min-height:38px; background:#fff; }
        .cal-day.empty { visibility:hidden; }
        .cal-day.selected { background:#eee; }
        .cal-day.edge { box-shadow: inset 0 1px 3px rgba(0,0,0,0.12); }
      `}</style>
    </div>
  );
}

/* ====== 시간 슬롯 ====== */
function buildTimeSlots(): string[] {
  const out: string[] = [];
  for (let h = 10; h <= 18; h++) {
    for (const m of [0, 30]) out.push(`${pad2(h)}:${pad2(m)}`);
  }
  return out;
}

export default function AdminReservePage() {
  const sp = useSearchParams();
  const router = useRouter();

  const initialVenueId = Number(sp.get('venueId') || '0') || 0;
  const [venueId, setVenueId] = useState<number>(initialVenueId);
  const [venueName, setVenueName] = useState<string>('선택 지점');
  const [venues, setVenues] = useState<VenueSummary[]>([]);
  const [tab, setTab] = useState<Tab>('HOSPITAL');

  // 공통 페이징
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);
  const [size] = useState(10);

  // 병원: 아랫섹션 필터
  const [doctorId, setDoctorId] = useState<number | ''>('');
  const [doctors, setDoctors] = useState<{doctorId:number; doctorName:string}[]>([]);
  const [dateH, setDateH] = useState<string>('');

  // 호텔: 아랫섹션 필터
  const [dateT, setDateT] = useState<string>('');

  // 리스트 데이터
  const [topList, setTopList] = useState<AdminReservationLine[]>([]);
  const [botList, setBotList] = useState<AdminReservationLine[]>([]);
  const [topTotal, setTopTotal] = useState(0);
  const [botTotal, setBotTotal] = useState(0);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingBot, setLoadingBot] = useState(false);
  const [errTop, setErrTop] = useState<string|null>(null);
  const [errBot, setErrBot] = useState<string|null>(null);

  // 체크박스
  const [checkedTop, setCheckedTop] = useState<Record<number, boolean>>({});
  const [checkedBot, setCheckedBot] = useState<Record<number, boolean>>({});
  const topIds = useMemo(() => Object.keys(checkedTop).filter(k => checkedTop[Number(k)]).map(Number), [checkedTop]);
  const botIds = useMemo(() => Object.keys(checkedBot).filter(k => checkedBot[Number(k)]).map(Number), [checkedBot]);

  // 행 단위 상태(로컬 UI)
  const [statusTop, setStatusTop] = useState<Record<number, string>>({});
  const [statusBot, setStatusBot] = useState<Record<number, string>>({});

  // ===== 모달 상태 =====
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkTarget, setBulkTarget] = useState<'TOP' | 'BOT'>('TOP');
  const [bulkStatus, setBulkStatus] = useState<string>('CONFIRMED');

  // 포털 안전 플래그
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  useEffect(() => {
  
  const v = Number(sp.get('venueId') || '0') || 0;

  setVenueId((prev) => {
    if (prev === v) return prev;

    
    setPage1(1);
    setPage2(1);
    setDoctorId('');
    setDateH('');
    setDateT('');
    setCheckedTop({});
    setCheckedBot({});
    setStatusTop({});
    setStatusBot({});
    setUnavailableTimes([]);
    setPendingClose(new Set());

    return v;
  });
}, [sp]);



  // body 스크롤 락
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (bulkOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = prev || '';
    return () => { document.body.style.overflow = prev || ''; };
  }, [bulkOpen]);

  // ===== 병원: 진료시간 =====
  const timeSlots = useMemo(buildTimeSlots, []);
  const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  const [pendingClose, setPendingClose] = useState<Set<string>>(new Set());

  /* =============== 아랫섹션: 선택 날짜 기반 클라이언트 필터 =============== */
  const selectedDate = tab === 'HOSPITAL' ? (dateH || '') : (dateT || '');

  // 호텔 하단 리스트는: 날짜 포함 + 상태 제한(CONFIRMED, REJECTED, CANCELED, NOSHOW)
  const HOTEL_BOT_STATUSES = new Set(['CONFIRMED','REJECTED','CANCELED','NOSHOW']);

  const filteredBotList = useMemo(() => {
    const base = botList ?? [];
    const isNonPending = (r: any) => r?.status && r.status !== 'PENDING';

    if (tab === 'HOTEL') {
      if (!selectedDate) {
        return base.filter((r: any) =>
          r && isNonPending(r) && ['CONFIRMED','REJECTED','CANCELED','NOSHOW'].includes(r.status)
        );
      }
      return base.filter((r: any) =>
        r && isNonPending(r) && inStayRange(r, selectedDate)
      );
    }

    // HOSPITAL
    if (!selectedDate) {
      // 날짜 미선택이어도 PENDING은 제외
      return base.filter(isNonPending);
    }
    return base.filter((r: any) =>
      isNonPending(r) && ymd(extractAppt(r)) === selectedDate
    );
  }, [botList, selectedDate, tab]);

  // 병원: 확정/노쇼 시간 추출 (선택 날짜의 하단 리스트 기준)
  const reservedH = useMemo(() => {
    if (tab !== 'HOSPITAL') return new Set<string>();
    try {
      return new Set(
        (filteredBotList ?? [])
          .filter((r: any) => r && (r.status === 'CONFIRMED' || r.status === 'NOSHOW') && extractAppt(r))
          .map((r: any) => String(extractAppt(r)).slice(11, 16)) // HH:mm
      );
    } catch { return new Set<string>(); }
  }, [tab, filteredBotList]);

  // 관리자 사전 마감(서버에서 내려온 unavailable 중 확정이 아닌 슬롯만)
  const preClosedH = useMemo(() => {
    if (tab !== 'HOSPITAL') return new Set<string>();
    try {
      return new Set((unavailableTimes ?? []).filter(t => !reservedH.has(t)));
    } catch { return new Set<string>(); }
  }, [tab, unavailableTimes, reservedH]);

  /* =============== 초기 매장/의사 로딩 =============== */
  useEffect(() => {
    (async () => {
      try {
        const vs = await venueApi.listVenues();
        setVenues(vs);
        if (initialVenueId) {
          setVenueId(initialVenueId);
          const found = vs.find(v => v.venueId === initialVenueId);
          if (found) setVenueName(found.venueName);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const found = venues.find(v => v.venueId === venueId);
    if (found) setVenueName(found.venueName);
  }, [venueId, venues]);

  // 탭 전환 시
  useEffect(() => {
    setPage1(1);
    fetchTop();
    if (tab === 'HOSPITAL' && venueId) {
      venueApi.listDoctors(venueId).then(setDoctors).catch(() => setDoctors([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, venueId]);

  // 병원: 의사/날짜 변경 시 예약불가시간 로드
  useEffect(() => {
    async function refreshUnavailable() {
      if (tab !== 'HOSPITAL' || !doctorId || !dateH) {
        setUnavailableTimes([]);
        setPendingClose(new Set());
        return;
      }
      try {
        const arr = await venueApi.listUnavailableTimes({ doctorId: Number(doctorId), date: dateH });
        setUnavailableTimes(Array.from(new Set(arr.filter((v: any): v is string => typeof v === 'string'))));
        setPendingClose(new Set());
      } catch {
        setUnavailableTimes([]);
        setPendingClose(new Set());
      }
    }
    refreshUnavailable();
  }, [tab, doctorId, dateH]);

  // 페이징 변경 시 재조회
  useEffect(() => { fetchTop(); /* eslint-disable-next-line */ }, [page1, size, tab]);
  useEffect(() => { fetchBot(); /* eslint-disable-next-line */ }, [page2, size, doctorId, dateH, dateT, tab, venueId]);

    function setVenueQuery(nextId: number) {
      const params = new URLSearchParams(Array.from(sp.entries()));
      if (nextId) params.set('venueId', String(nextId));
      else params.delete('venueId');
      router.push(`/care/admin?${params.toString()}`);
    }



  async function fetchTop() {
    if (!venueId) return;
    setLoadingTop(true); setErrTop(null);
    try {
      const { content, totalElements } = await venueApi.adminListReservations({
        venueId, status: 'PENDING', type: tab, page: Math.max(0, page1 - 1), size
      });
      setTopList(content); setTopTotal(totalElements);
      setCheckedTop({});
      const init: Record<number, string> = {};
      content.forEach(row => { init[row.reservationId] = row.status || 'PENDING'; });
      setStatusTop(init);
    } catch (e: any) {
      setErrTop(e?.message || '목록을 불러오지 못했습니다.');
      setTopList([]); setTopTotal(0);
      setStatusTop({});
    } finally { setLoadingTop(false); }
  }

  async function fetchBot() {
    if (!venueId) return;
    setLoadingBot(true); setErrBot(null);
    try {
      const params: any = { venueId, type: tab, page: Math.max(0, page2 - 1), size };
      if (tab === 'HOSPITAL') {
        if (doctorId) params.doctorId = doctorId;
        if (dateH) params.date = dateH; // 서버가 지원하면 사용, 미지원이면 아래 filteredBotList로 보완
      } else {
        if (dateT) params.date = dateT;
      }
      const { content, totalElements } = await venueApi.adminListReservations(params);
      setBotList(content); setBotTotal(totalElements);
      setCheckedBot({});
      const init: Record<number, string> = {};
      content.forEach(row => { init[row.reservationId] = row.status || 'PENDING'; });
      setStatusBot(init);
    } catch (e: any) {
      setErrBot(e?.message || '목록을 불러오지 못했습니다.');
      setBotList([]); setBotTotal(0);
      setStatusBot({});
    } finally { setLoadingBot(false); }
  }

function StatusSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <select className="dropdown" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      {ALL_STATUSES.map(s => (
        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
      ))}
    </select>
  );
}


  function openBulk(which: 'TOP'|'BOT') {
    setBulkTarget(which);
    setBulkStatus('CONFIRMED');
    setBulkOpen(true);
  }

// ✅ 병원/호텔 모두 커버하는 업데이트 래퍼 (재시도/대체 파라미터 포함)
async function bulkUpdate(ids: number[], status: string, tab: Tab, venueId: number) {
  const api: any = venueApi as any;

  // 1) 병원/호텔 전용 함수가 있으면 그걸 우선 사용
  if (tab === 'HOSPITAL' && typeof api.adminBulkUpdateHospitalReservationStatus === 'function') {
    return api.adminBulkUpdateHospitalReservationStatus({ ids, status, venueId });
  }
  if (tab === 'HOTEL' && typeof api.adminBulkUpdateHotelReservationStatus === 'function') {
    return api.adminBulkUpdateHotelReservationStatus({ ids, status, venueId });
  }

  // 2) 공용 함수가 있으면 파라미터 변형하며 시도
  const common = api.adminBulkUpdateReservationStatus;

  if (typeof common !== 'function') {
    throw new Error('adminBulkUpdateReservationStatus API가 없습니다.');
  }

  // a. 가장 유력: type + venueId
  try {
    return await common({ ids, status, type: tab, venueId });
  } catch (e) {
    // b. reservationType 키 사용
    try {
      return await common({ ids, status, reservationType: tab, venueId });
    } catch (e2) {
      // c. venueId 없이 type만
      try {
        return await common({ ids, status, type: tab });
      } catch (e3) {
        // d. 마지막: 아무 추가키 없이(호텔은 이걸로도 보통 됨)
        return await common({ ids, status });
      }
    }
  }
}


  /**
   * 상태 저장 로직
   * - mode === 'BULK' (모달 적용): 체크된 항목만 bulkStatus로 일괄 변경
   * - mode === 'ROW'  (행/섹션 저장): 체크된 항목이 있으면 그 항목만,
   *   체크가 하나도 없으면 "화면에 보이는 행 중 변경된 항목" 전부 저장
   */
async function applyBulk(which: 'TOP' | 'BOT' | null = null, mode: 'ROW' | 'BULK' = 'ROW') {
  const target: 'TOP' | 'BOT' = (mode === 'BULK') ? (which ?? bulkTarget) : (which ?? 'TOP');

  const isTop = target === 'TOP';
  const list = isTop ? topList : botList;
  const statusMap = isTop ? statusTop : statusBot;
  const selectedIds = isTop ? topIds : botIds;

  // 현재 서버 상태(비교용)
  const currentById: Record<number, string> = {};
  list.forEach(r => { currentById[r.reservationId] = r.status; });

  // (1) 모달 일괄 변경: 체크된 항목만
  if (mode === 'BULK') {
    if (!selectedIds.length) { setBulkOpen(false); return; }

    // 낙관적 UI 업데이트 (상단 리스트에서 바로 빠지게)
    const nextStatus = bulkStatus;
    if (isTop) {
      setTopList(prev => prev.map(r => selectedIds.includes(r.reservationId) ? { ...r, status: nextStatus } : r));
    } else {
      setBotList(prev => prev.map(r => selectedIds.includes(r.reservationId) ? { ...r, status: nextStatus } : r));
    }

    await bulkUpdate(selectedIds, nextStatus, tab, venueId);
    setBulkOpen(false);
    await Promise.all([fetchTop(), fetchBot()]);
    return;
  }

  // (2) 행/섹션 저장: 체크가 있으면 그 항목들만, 없으면 보이는 행 중 변경된 것만
  const candidateIds = selectedIds.length ? selectedIds : list.map(r => r.reservationId);

  // 상태별 그룹핑
  const groups: Record<string, number[]> = {};
  candidateIds.forEach(id => {
    const current = currentById[id];
    const next = statusMap[id] ?? current;
    if (!next || next === current) return; // 변경없음
    (groups[next] ??= []).push(id);
  });

  const entries = Object.entries(groups);
  if (entries.length === 0) {
    setBulkOpen(false);
    return;
  }

  // 낙관적 UI 업데이트 (즉시 반영)
  if (isTop) {
    setTopList(prev => prev.map(r => {
      const next = statusMap[r.reservationId] ?? r.status;
      return (next && next !== r.status && candidateIds.includes(r.reservationId)) ? { ...r, status: next } : r;
    }));
  } else {
    setBotList(prev => prev.map(r => {
      const next = statusMap[r.reservationId] ?? r.status;
      return (next && next !== r.status && candidateIds.includes(r.reservationId)) ? { ...r, status: next } : r;
    }));
  }

  // 서버 반영
  for (const [st, ids] of entries) {
    await bulkUpdate(ids, st, tab, venueId);
  }

  setBulkOpen(false);
  await Promise.all([fetchTop(), fetchBot()]);
}



  function toggleAllTop(v: boolean) {
    const next: Record<number, boolean> = {};
    topList.forEach(r => { next[r.reservationId] = v; });
    setCheckedTop(next);
  }
  function toggleAllBot(v: boolean) {
    const next: Record<number, boolean> = {};
    botList.forEach(r => { next[r.reservationId] = v; });
    setCheckedBot(next);
  }

  // === 시간 마감 토글 ===
  function toggleCloseCandidate(t: string) {
    if (tab !== 'HOSPITAL') return;            // 지금은 병원만
    if (reservedH.has(t)) return;              // 확정/노쇼 시간은 토글 불가

    setPendingClose(prev => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t); // 변경분만 담아둠(대칭차집합용)
      return n;
    });
  }

  // === 시간 마감 저장(대칭차집합 방식) ===
  async function saveTimeClosures() {
    if (tab !== 'HOSPITAL' || !doctorId || !dateH) return;
    if (pendingClose.size === 0) return;

    // 기존 관리자 마감(preClosedH)에 pendingClose(변경 토글)를 대칭차집합으로 적용
    const finalClosed = new Set(preClosedH);
    pendingClose.forEach((t) => {
      if (finalClosed.has(t)) finalClosed.delete(t); // 이미 닫힘 → 재오픈
      else finalClosed.add(t);                       // 열림 → 새로 마감
    });

    // 서버에 최종 마감 배열 전달(정렬)
    const body = { doctorId: Number(doctorId), date: dateH, close: Array.from(finalClosed).sort() };
    try {
      await venueApi.adminSetClosedTimes(body);
      // 저장 후 최신 불가시간 재조회
      const arr = await venueApi.listUnavailableTimes({ doctorId: Number(doctorId), date: dateH });
      setUnavailableTimes(Array.from(new Set(arr.filter((v: any): v is string => typeof v === 'string'))));
      setPendingClose(new Set());
      alert('선택한 시간이 마감 처리되었습니다.');
    } catch {
      alert('마감 저장에 실패했습니다.');
    }
  }

  /* ========================= JSX ========================= */
  return (
    <main className="apn-main mx-auto px-4 max-w-[900px]" style={{ paddingBottom: 40 }}>
      {/* 타이틀 */}
      <div className="admin-head text-center">
  <h1 className="admin-title">
    <span>{venueName}</span>
    <PawIcon className="apn-title-ico" />
  </h1>

  {/* ▼ 지점 선택 드롭다운 추가 */}
  <div style={{ marginTop: 10 }}>
    <select
      className="dropdown"
      value={venueId || ''}
      onChange={(e) => setVenueQuery(Number(e.target.value) || 0)}
      aria-label="지점 선택"
    >
      <option value="">지점 선택</option>
      {venues.map(v => (
        <option key={v.venueId} value={v.venueId}>
          {v.venueName}
        </option>
      ))}
    </select>
  </div>
</div>


      {/* 탭 */}
      <div className="admin-actions flex items-center justify-center gap-[10px] mt-[16px] mb-[8px]">
        <button type="button" className={`tab ${tab==='HOSPITAL'?'active':''}`} onClick={() => setTab('HOSPITAL')}>병원</button>
        <button type="button" className={`tab ${tab==='HOTEL'?'active':''}`} onClick={() => setTab('HOTEL')}>호텔</button>
      </div>

      {/* ===== 윗섹션 ===== */}
      <div className="admin-sep" />
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="text-gray-700 font-semibold"><strong> <Pin className="apn-title-ico" /> 새로운 예약신청</strong></div>
          <div className="flex gap-2">
            <button className="btn-3d btn-white" onClick={() => openBulk('TOP')}>일괄변경</button>
            <button className="btn-3d btn-primary" onClick={() => applyBulk('TOP','ROW')}>저장</button>
          </div>
        </div>

        <div className="admin-sep" />

        {/* 새로운 예약신청 테이블 */}
        <div
          className={`grid ${
            tab==='HOSPITAL'
              ? 'grid-cols-[28px_140px_120px_180px_1fr_1fr_160px]'
              : 'grid-cols-[28px_140px_120px_160px_160px_1fr_160px]' /* HOTEL: 체크인/체크아웃 두 칼럼 */
          } gap-2 px-2 text-sm font-semibold`}
        >
          <div className="text-center" >
            <input type="checkbox" onChange={(e)=>toggleAllTop(e.target.checked)} aria-label="전체 선택" />
          </div>
          <div>예약상태</div>
          <div>예약번호</div>

          {tab === 'HOTEL' ? (
            <>
              <div>체크인</div>
              <div>체크아웃</div>
            </>
          ) : (
            <div>예약날짜</div>
          )}

          {tab === 'HOSPITAL' ? <div>담당의</div> : null}
          <div>예약자명</div>
          <div>연락처</div>
        </div>

        <div className="admin-sep" />

        {/* 목록 */}
        <div className="px-2 ">
          {loadingTop ? (
            <div className="text-center py-8">불러오는 중…</div>
          ) : errTop ? (
            <div className="text-center text-red-600 py-8">{errTop}</div>
          ) : topList.length === 0 ? (
            <div className="text-center py-8 mt-[15px]">데이터가 없습니다.</div>
          ) : (
            topList.map(row => (
              <div
                key={row.reservationId}
                className="grid items-center py-2 hover:bg-[#f9fafb]"
                style={{
                  gridTemplateColumns: tab==='HOSPITAL'
                    ? '28px 140px 120px 180px 1fr 1fr 160px'
                    : '28px 140px 120px 160px 160px 1fr 160px' // HOTEL: 체크인/체크아웃 2칸
                }}
              >
                <div className="text-center">
                  <input
                    type="checkbox"
                    checked={!!checkedTop[row.reservationId]}
                    onChange={(e)=>setCheckedTop((m)=>({...m, [row.reservationId]: e.target.checked}))}
                    aria-label={`${row.reservationId} 선택`}
                  />
                </div>
                <div>
                  <StatusSelect
                    value={statusTop[row.reservationId] ?? row.status}
                    onChange={(v)=> setStatusTop(prev => ({ ...prev, [row.reservationId]: v }))}
                  />
                </div>
                <div>
                 <Link href={`/care/admin/${row.reservationId}?venueId=${venueId}`} className="text-blue-600 underline">
                  {row.reservationId}
                </Link>
                </div>

                {/* 날짜/체류기간 표시 */}
                {tab === 'HOTEL' ? (
                  <>
                    <div>{(row as any).checkIn ?? '-'}</div>
                    <div>{(row as any).checkOut ?? '-'}</div>
                  </>
                ) : (
                  <div>{fmtYmdHm((row as any).appointment_at ?? (row as any).appointmentAt)}</div>
                )}

                {tab === 'HOSPITAL' ? <div>{(row as any).doctorName ?? '-'}</div> : null}
                <div>{row.reserverName ?? '-'}</div>
                <div>{row.primaryPhone ?? '-'}</div>
              </div>
            ))
          )}
        </div>

        {/* 페이징 */}
        <div className="mt-3 flex justify-center mt-[35px] mb-[30px]">
          <Pagination current={page1} size={size} total={topTotal} onPage={(p)=>setPage1(p)} />
        </div>
      </section>

      {/* ========================== 아랫섹션 ========================== */}
      <div className="admin-sep" />
      <section>
        {/* **********************병원********************** */}
        {tab === 'HOSPITAL' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            
            
              <Calendar mode="single" value={dateH} onChange={(v) => { setDateH(v); setPage2(1); }} />
            
            <div className="card mt-[20px]">
              <div className="card-title mt-[10px]">선생님</div>
              <select
                className="inp-1 mb-4"
                value={String(doctorId)}
                onChange={(e)=>{ const v=e.target.value; setDoctorId(v?Number(v):''); setPage2(1); }}
                onFocus={() => { if (doctors.length === 0 && venueId) { venueApi.listDoctors(venueId).then(setDoctors).catch(()=>setDoctors([])); } }}
              >
                <option value="">선택하세요</option>
                {doctors.map(d => <option key={d.doctorId} value={d.doctorId}>{d.doctorName}</option>)}
              </select>

              <div className="card-title mt-[15px]">진료 시간</div>
              <div className="slot-grid">
                {timeSlots.map((t) => {
                  const isReserved = reservedH.has(t);            // 확정/노쇼
                  const isPast = isPastTime(dateH, t);             // 과거 시간
                  const isDisabled = isReserved || !dateH || !doctorId || isPast;

                  // 서버 제공 불가시간(unavailableTimes)은 [확정 + 관리자마감]이 섞여 있음
                  const isPreClosed = !isReserved && (unavailableTimes ?? []).includes(t);

                  // 선택 표시: 변경 제안(pendingClose)에 들어가면 강조
                  const active = pendingClose.has(t);

                  const title =
                    !doctorId || !dateH
                      ? '날짜와 선생님을 먼저 선택하세요'
                      : isReserved
                        ? '이미 예약/노쇼 처리된 시간'
                        : isPast
                          ? '이미 지난 시간'
                          : isPreClosed
                            ? (active ? '재오픈 예정(저장 시 반영)' : '현재 마감됨(눌러서 재오픈 예정으로 표시)')
                            : (active ? '마감 예정(저장 시 반영)' : '마감 토글');

                  return (
                    <button
                      key={t}
                      type="button"
                      className={[
                        'slot',
                        active ? 'active' : '',
                        isDisabled ? 'disabled' : '',
                        (!isDisabled && isPreClosed && !active) ? 'dim' : '',
                      ].join(' ')}
                      disabled={isDisabled}
                      onClick={() => toggleCloseCandidate(t)}
                      title={title}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-[10px] mt-[20px]">
                <button className="btn" onClick={() => setPendingClose(new Set())} disabled={pendingClose.size === 0}>선택해제 </button>
                <button className="btn" onClick={saveTimeClosures} disabled={pendingClose.size === 0 || !doctorId || !dateH}>변경저장</button>
              </div>
            </div>
          </div>
        ) : (
          // 호텔
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            
        
              <Calendar mode="single" value={dateT} onChange={(v) => { setDateT(v); setPage2(1); }} />
            
        
          </div>
        )}

        {/* =================하단 예약리스트 헤더 (병원&호텔 공용)================= */}
       <div className={`grid ${tab==='HOSPITAL'
          ? 'grid-cols-[28px_140px_120px_140px_1fr_1fr_160px]'
          : 'grid-cols-[28px_140px_120px_140px_1fr_1fr_160px]'
        } gap-2 px-2 text-sm font-semibold mt-[40px]`}>
        <div className="text-center">
          <input type="checkbox" onChange={(e)=>toggleAllBot(e.target.checked)} aria-label="전체 선택" />
        </div>
        <div>예약상태</div>
        <div>예약번호</div>
        <div>회원아이디</div> {/* ← 추가 */}
        <div>예약자이름</div>
        <div>반려동물이름</div>
        <div>연락처</div>
      </div>


        <div className="admin-sep" />

        {/* 하단 목록 (선택 날짜 필터 적용된 filteredBotList 사용) */}
        <div className="px-2">
          {loadingBot ? (
            <div className="text-center py-8">불러오는 중…</div>
          ) : errBot ? (
            <div className="text-center text-red-600 py-8">{errBot}</div>
          ) : (filteredBotList ?? []).length === 0 ? (
            <div className="text-center py-8 mt-[15px]">데이터가 없습니다.</div>
          ) : (
            filteredBotList.map((row: any) => (
    <div
      key={row.reservationId}
      className="grid items-center py-2 hover:bg-[#f9fafb] cursor-pointer"
      style={{ gridTemplateColumns: tab==='HOSPITAL'
        ? '28px 140px 120px 140px 1fr 1fr 160px'
        : '28px 140px 120px 140px 1fr 1fr 160px' }}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest('a,button,input,select,label')) return; // 내부 컨트롤 클릭은 제외
        router.push(`/care/admin/${row.reservationId}?venueId=${venueId}`);
      }}
    >
      <div className="text-center">
        <input
          type="checkbox"
          checked={!!checkedBot[row.reservationId]}
          onChange={(e)=>setCheckedBot((m)=>({...m, [row.reservationId]: e.target.checked}))}
          aria-label={`${row.reservationId} 선택`}
          onClick={(e)=>e.stopPropagation()}
        />
      </div>

      <div>
        <StatusSelect
          value={statusBot[row.reservationId] ?? row.status}
          onChange={(v)=> setStatusBot(prev => ({ ...prev, [row.reservationId]: v }))}
        />
      </div>

      <div>
        <Link
          href={`/care/admin/${row.reservationId}?venueId=${venueId}`}
          className="text-blue-600 underline"
          onClick={(e)=>e.stopPropagation()}
        >
          {row.reservationId}
        </Link>
      </div>

      <div className="truncate">
        {row.memberId ? (
          <Link
            href={`/care/history?memberId=${encodeURIComponent(row.memberId)}&from=admin&venueId=${venueId}`}
            className="underline"
            onClick={(e)=>e.stopPropagation()}
          >
            {row.memberId}
          </Link>


        ) : ('-')}
      </div>

      <div className="truncate">{row.reserverName ?? '-'}</div>
      <div className="truncate">{row.petName ?? '-'}</div>
      <div>{row.primaryPhone ?? '-'}</div>
    </div>
  ))
)}
        </div>

        {/* 페이징 + 버튼 */}
        <div className="admin-sep " />
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mt-[30px] mb-[50px]">
          <div />
          <div className="flex justify-center">
            <Pagination current={page2} size={size} total={botTotal} onPage={(p)=>setPage2(p)} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-3d btn-white" onClick={() => openBulk('BOT')}>일괄변경</button>
            <button className="btn-3d btn-primary" onClick={() => applyBulk('BOT','ROW')}>저장</button>
          </div>
        </div>
      </section>

      {/* ===== 일괄변경 모달 ===== */}
      {bulkOpen && isClient && createPortal(
        <div
          id="__admin_bulk_modal__"
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            left: 0, top: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647
          }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setBulkOpen(false); }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              width: 360,
              maxWidth: '90vw',
              border: '1px solid #e5e7eb',
              boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, marginBottom: 12 }}>상태 일괄변경</div>
            <select
              className="dropdown"
              style={{ width: '100%', marginBottom: 12 }}
              value={bulkStatus}
              onChange={(e)=>setBulkStatus(e.target.value)}
            >
             {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}

            </select>
            <div style={{ display: 'flex', justifyContent: 'end', gap: 8 }}>
              <button className="btn-3d btn-white" onClick={()=>setBulkOpen(false)}>취소</button>
              <button className="btn-3d btn-primary" onClick={() => applyBulk(null,'BULK')}>적용</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===== 스타일 ===== */}
      <style jsx>{`
        /* =========================
        * Admin Title & Separator
        * ========================= */
        .admin-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 28px;
          font-weight: 600;
          color: #000;
        }
        :global(.apn-title-ico) {
          width: 1em;
          height: 1em;
          display: inline-block;
          color: #000 !important;
        }
        :global(.apn-title-ico *) {
          fill: currentColor;
          stroke: currentColor;
        }
        .admin-sep {
          border-top: 1px solid #e5e7eb;
          margin: 12px 0;
        }

        /* ==========
        * Tabs
        * ========== */
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

        /* ==========
        * Buttons
        * ========== */
        .btn {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 14px;
          background: #fff;
        }
        .btn-3d {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 8px 14px;
          background: #fff;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.06);
        }
        .btn-white { /* white 변형(추후 확장용) — 의도적으로 비워둠 */ }
        .btn-primary { /* primary 변형(추후 확장용) — 의도적으로 비워둠 */ }

        /* ==========
        * Cards
        * ========== */
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
        .note {
          color: #6b7280;
        }

        /* =======================
        * Inputs & Dropdowns
        * ======================= */
        .dropdown {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 6px 10px;
          background: #fff;
        }
        .inp {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          width: 100%;
          background: #fff;
        }

        .inp-1{
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 10px;
          width: 200px;
          background: #fff;
        }

        /* ===============
        * Slots Grid
        * =============== */
        .slot-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          
        }
        @media (max-width: 768px) {
          .slot-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
        .slot {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 8px 0;
          background: #fff;
          transition: background 0.15s ease;
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
        .slot.dim {
          background: #fafafa;
        }
      `}</style>

    </main>
  );
}