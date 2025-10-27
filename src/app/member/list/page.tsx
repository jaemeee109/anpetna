// src/app/member/list/page.tsx
'use client';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Paw from '@/components/icons/Paw';
import {
  listAdminMembers,
  applyRole,
  type AdminMemberRow,
  type PageRes,
} from '@/features/member/data/admin.api';

/** items/page.tsx와 동일한 Pager (디자인/클래스 유지) */
function Pager({
  current, totalPages, onPage,
}: { current: number; totalPages: number; onPage: (p: number) => void; }) {
  const cur = Math.min(Math.max(1, current || 1), Math.max(1, totalPages));
  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), Math.max(1, totalPages));
    if (page !== cur) onPage(page);
  };

  const groupSize = 5;
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, Math.max(1, totalPages));

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const BTN = 'btn-3d btn-white px-3 py-1 text-xs no-underline';
  const DISABLED = 'opacity-60 cursor-not-allowed';
  const ACTIVE_NUM = 'font-bold text-black';
  const WRAP_GAP = 'gap-[6px]';
  const NUM_GAP = 'gap-[6px]';
  const NUM_SIDE_MARGIN = 'mx-[10px]';

  return (
    <nav className={`flex items-center justify-center ${WRAP_GAP}`}>
      <button type="button" className={`${BTN} ${startPage === 1 ? DISABLED : ''}`} onClick={() => goto(1)} disabled={startPage === 1}>처음</button>
      <button type="button" className={`${BTN} ${startPage === 1 ? DISABLED : ''}`} onClick={() => goto(startPage - 1)} disabled={startPage === 1}>이전</button>
      <div className={`flex ${NUM_GAP} ${NUM_SIDE_MARGIN}`}>
        {pages.map((p) =>
          p === cur ? (
            <span key={p} className={ACTIVE_NUM} aria-current="page">{p}</span>
          ) : (
            <span key={p} onClick={() => goto(p)} className="cursor-pointer text-gray-600 hover:text-black">{p}</span>
          )
        )}
      </div>
      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(endPage + 1)} disabled={endPage === totalPages}>다음</button>
      <button type="button" className={`${BTN} ${endPage === totalPages ? DISABLED : ''}`} onClick={() => goto(totalPages)} disabled={endPage === totalPages}>마지막</button>
    </nav>
  );
}

type Role = 'USER' | 'ADMIN' | 'BLACKLIST';
type Term = 'D3' | 'D5' | 'D7' | 'INDEFINITE';

/* ────────────────────────────────────────────────────────────
   TERM 추론 + 캐시 유틸
   ────────────────────────────────────────────────────────────*/
function normalizeTermString(v: any): Term | null {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  if (['D3','3D','3','THREE','3DAY','3DAYS'].includes(s)) return 'D3';
  if (['D5','5D','5','FIVE','5DAY','5DAYS'].includes(s)) return 'D5';
  if (['D7','7D','7','SEVEN','7DAY','7DAYS','WEEK','1W','1WK'].includes(s)) return 'D7';
  if (['INDEFINITE','PERMANENT','PERM','FOREVER'].includes(s)) return 'INDEFINITE';
  if (!Number.isNaN(Number(s))) {
    const n = Number(s);
    if (n <= 3) return 'D3';
    if (n <= 5) return 'D5';
    if (n <= 7) return 'D7';
    return 'INDEFINITE';
  }
  return null;
}
function daysToTerm(days: number | null | undefined): Term | null {
  if (days == null) return null;
  if (days <= 3) return 'D3';
  if (days <= 5) return 'D5';
  if (days <= 7) return 'D7';
  return 'INDEFINITE';
}
function untilToTerm(until: string | number | Date | null | undefined): Term | null {
  if (!until) return null;
  const t = new Date(until as any).getTime();
  if (Number.isNaN(t)) return null;
  const diffMs = t - Date.now();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return daysToTerm(days);
}
function getServerTerm(row: AdminMemberRow): Term | null {
  const anyRow = row as any;
  const directCandidates = [
    anyRow.term, anyRow.blacklistTerm, anyRow.banTerm, anyRow.blockTerm,
    anyRow.period, anyRow.periodCode, anyRow.durationCode, anyRow.durationText,
  ];
  for (const v of directCandidates) {
    const t = normalizeTermString(v);
    if (t) return t;
  }
  const dayCandidates = [
    anyRow.days, anyRow.day, anyRow.duration, anyRow.durationDays,
    anyRow.termDays, anyRow.periodDays, anyRow.limitDays, anyRow.remainDays,
    anyRow.blacklistDays, anyRow.banDays,
  ];
  for (const v of dayCandidates) {
    const t = daysToTerm(typeof v === 'string' ? Number(v) : v);
    if (t) return t;
  }
  const untilCandidates = [
    anyRow.until, anyRow.expireAt, anyRow.expiredAt, anyRow.expireDate,
    anyRow.endAt, anyRow.endDate, anyRow.blacklistUntil, anyRow.banUntil, anyRow.blockedUntil,
  ];
  for (const v of untilCandidates) {
    const t = untilToTerm(v);
    if (t) return t;
  }
  return null;
}

/** sessionStorage 캐시 (회원별 마지막 지정 TERM 보존) */
const TERM_CACHE_KEY = 'memberTermCache';
type TermCache = Record<string, Term>;
function readTermCache(): TermCache {
  try {
    const s = sessionStorage.getItem(TERM_CACHE_KEY);
    return s ? (JSON.parse(s) as TermCache) : {};
  } catch { return {}; }
}
function writeTermCache(cache: TermCache) {
  try { sessionStorage.setItem(TERM_CACHE_KEY, JSON.stringify(cache)); } catch {}
}

/* ────────────────────────────────────────────────────────────
   모달 내용 (디자인/클래스 그대로) — ★ 커스터마이즈 변수 지원 ★
   ────────────────────────────────────────────────────────────*/
function BulkModalContent(props: {
  onClose: () => void;
  bulkRole: Role;
  setBulkRole: (r: Role) => void;
  bulkTerm: Term;
  setBulkTerm: (t: Term) => void;
  applyBulkToListOnly: () => void;
}) {
  const { onClose, bulkRole, setBulkRole, bulkTerm, setBulkTerm, applyBulkToListOnly } = props;
  return (
    <div
      className="fixed flex items-center justify-center"
      style={{
        position: 'fixed',
        zIndex: 2147483647,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0, left: 0,
          width: '100vw',
          height: '100vh',
          background: 'transparent',
          zIndex: 2147483646,
          pointerEvents: 'auto',
        }}
      />
      <div
        className="admin-modal-box w-[360px] rounded-lg bg-white p-4 shadow border border-gray-200"
        style={{
          position: 'relative',
          zIndex: 2147483647,
          backgroundColor: '#ffffff',
          borderRadius: 'var(--modal-radius, 12px)',
          padding: 'var(--modal-padding, 16px)',
          boxShadow: 'var(--modal-shadow, 0 12px 32px rgba(0,0,0,0.15))',
          border: '1px solid rgba(0,0,0,0.08)',
          isolation: 'isolate',
          width: 'var(--modal-width, 420px)',       // ← 너비 조절
          fontSize: 'var(--modal-font-size, 14px)', // ← 전체 폰트 크기
          lineHeight: 'var(--modal-line-height, 1.45)',
        }}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      >
        <div className="mt-[10px] mb-[10px] font-semibold" style={{ fontSize: 'var(--modal-title-size, 16px)' }}>
          권한을 선택해주세요
        </div>

        {/* 셀렉트 공통 클래스를 추가: admin-modal-select (기존 dropdown 유지) */}
        <select
          className="dropdown admin-modal-select w-full mb-3"
          value={bulkRole}
          onChange={(e) => setBulkRole(e.target.value as Role)}
          style={{
            height: 'var(--modal-select-height, 40px)',        // ← 옵션창(셀렉트) 높이
            fontSize: 'var(--modal-select-font-size, 14px)',   // ← 옵션 글씨크기
            borderRadius: 'var(--modal-select-radius, 10px)',
            padding: '0 var(--modal-select-padding-x, 10px)',
          }}
        >
          <option value="USER">회원</option>
          <option value="ADMIN">관리자</option>
          <option value="BLACKLIST">블랙리스트</option>
        </select>

        {bulkRole === 'BLACKLIST' && (
          <div className="mb-3">
            <div className="mt-[10px] mb-[10px]" style={{ fontSize: 'var(--modal-label-size, 16px)', opacity: 0.9 }}>기간을 설정해주세요</div>
            <select
              className="dropdown admin-modal-select w-full"
              value={bulkTerm}
              onChange={(e) => setBulkTerm(e.target.value as Term)}
              style={{
                height: 'var(--modal-select-height, 40px)',
                fontSize: 'var(--modal-select-font-size, 14px)',
                borderRadius: 'var(--modal-select-radius, 10px)',
                padding: '0 var(--modal-select-padding-x, 10px)',
              }}
            >
              <option value="D3">3일</option>
              <option value="D5">5일</option>
              <option value="D7">7일</option>
              <option value="INDEFINITE">영구</option>
            </select>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2 mt-[20px]">
          <button
            className="btn-3d btn-white"
            onClick={onClose}
            style={{ height: 'var(--modal-button-height, 36px)', fontSize: 'var(--modal-button-font, 14px)', padding: '0 12px' }}
          >
            취소
          </button>
          <button
            className="btn-3d btn-primary"
            onClick={applyBulkToListOnly}
            style={{ height: 'var(--modal-button-height, 36px)', fontSize: 'var(--modal-button-font, 14px)', padding: '0 14px' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 파라미터 ←→ 상태 동기화
  const [q, setQ] = useState<string>(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState<number>(() => Number(searchParams.get('page') || 1));
  const size = 10;

  // ✅ 검색 인풋 전용 상태(디자인 변경 없음): URL q와 분리
  const [keyword, setKeyword] = useState('');
  useEffect(() => { setKeyword(q); }, [q]);

  const [role, setRole] = useState<'ADMIN' | 'USER' | 'BLACKLIST' | 'NONE'>('ADMIN');
  const [roleEnabled, setRoleEnabled] = useState(false);

  // 데이터
  const [data, setData] = useState<PageRes<AdminMemberRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // (1) 선택해둔(미저장) ROLE/TERM 변경 모음
  const [pending, setPending] = useState<Record<string, AdminMemberRow['role']>>({});
  const [pendingTerm, setPendingTerm] = useState<Record<string, Term>>({});

  // (1) 일괄 저장 중 여부
  const [bulkSaving, setBulkSaving] = useState(false);

  // (캐시: 새로고침 후에도 최근 지정 TERM 유지)
  const [termCache, setTermCache] = useState<TermCache>({});
  useEffect(() => { setTermCache(readTermCache()); }, []);
  const cacheDirtyRef = useRef(false);
  useEffect(() => {
    if (cacheDirtyRef.current) { writeTermCache(termCache); cacheDirtyRef.current = false; }
  }, [termCache]);

  // (선택 체크박스)
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const rows = useMemo(() => {
    const list = (data?.dtoList ?? []) as AdminMemberRow[];
    const filtered = roleEnabled ? list.filter(m => (m.role || '').toUpperCase() === role) : list;
    return filtered;
  }, [data, role, roleEnabled]);

  const allSelected = useMemo(
    () => rows.length > 0 && rows.every(r => !!selected[r.memberId]),
    [rows, selected]
  );
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) rows.forEach(r => { next[r.memberId] = true; });
    setSelected(next);
  };
  const toggleOne = (memberId: string, checked: boolean) => {
    setSelected(prev => ({ ...prev, [memberId]: checked }));
  };

  // 조회
  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res = await listAdminMembers({ q, page, size });
      setData(res);

      // 페이지 바뀌면 선택/보류키 정리(현재 페이지에 없는 id 제거)
      const ids = new Set((res?.dtoList ?? []).map(d => d.memberId));
      setSelected(prev => {
        const nxt: Record<string, boolean> = {};
        Object.entries(prev).forEach(([k, v]) => { if (ids.has(k)) nxt[k] = v; });
        return nxt;
      });
      setPending(prev => {
        const nxt: Record<string, AdminMemberRow['role']> = {};
        Object.entries(prev).forEach(([k, v]) => { if (ids.has(k)) nxt[k] = v; });
        return nxt;
      });
      setPendingTerm(prev => {
        const nxt: Record<string, Term> = {};
        Object.entries(prev).forEach(([k, v]) => { if (ids.has(k)) nxt[k] = v; });
        return nxt;
      });
    } catch (e: any) {
      setErr(e?.message || '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // URL 업데이트
  useEffect(() => {
    const usp = new URLSearchParams();
    if (q) usp.set('q', q);
    usp.set('page', String(page));
    router.replace(`list?${usp.toString()}`);
  }, [q, page, router]);

  const totalPages = useMemo(
    () => Math.max(1, Number(
      (data as any)?.total ||
      (data as any)?.totalPages ||
      (data as any)?.page?.totalPages ||
      (data as any)?.result?.totalPages ||
      1
    )),
    [data]
  );

  /* ────────────────────────────────────────────────────────────
     서버 TERM 매핑 (id -> Term) + 캐시 보정
     ────────────────────────────────────────────────────────────*/
  const serverTermMap = useMemo(() => {
    const list = (data?.dtoList ?? []) as AdminMemberRow[];
    const m: Record<string, Term> = {};
    list.forEach(r => {
      if ((r.role || '').toUpperCase() === 'BLACKLIST') {
        const t = getServerTerm(r);
        if (t) m[r.memberId] = t;
      }
    });
    return m;
  }, [data]);

  // (2) 기존 행의 ROLE/TERM 셀렉트 변경 시: 즉시 저장하지 않고 pending/pendingTerm 에만 반영
  function onChangeRole(memberId: string, nextRole: AdminMemberRow['role']) {
    setPending(prev => ({ ...prev, [memberId]: nextRole }));
    if (nextRole !== 'BLACKLIST') {
      setPendingTerm(prev => {
        const nxt = { ...prev };
        delete nxt[memberId];
        return nxt;
      });
    } else {
      setPendingTerm(prev => ({
        ...prev,
        [memberId]: prev[memberId] ?? serverTermMap[memberId] ?? termCache[memberId] ?? 'INDEFINITE',
      }));
    }
  }
  function onChangeTerm(memberId: string, term: Term) {
    setPendingTerm(prev => ({ ...prev, [memberId]: term }));
  }

  // ✅ 검색 실행: 입력 상태 사용(디자인 변경 없음)
  function onSearch() {
    setPage(1);
    setQ((keyword || '').trim());
  }

  // 저장 버튼 클릭 시: 변경된 것만 서버 반영 (ROLE + TERM)
  async function onSaveChanges() {
    const changes = Object.entries(pending);
    if (changes.length === 0) return;

    try {
      setBulkSaving(true);
      const nextCache: TermCache = { ...termCache };

      for (const [memberId, nextRole] of changes) {
        const cur = (data?.dtoList || []).find(m => m.memberId === memberId)?.role;
        if (cur && cur !== nextRole) {
          const term = pendingTerm[memberId];
          await (applyRole as unknown as (id: string, role: any, term?: any) => Promise<void>)(memberId, nextRole, term);
          if (nextRole === 'BLACKLIST' && term) { nextCache[memberId] = term; }
          if (nextRole !== 'BLACKLIST') { delete nextCache[memberId]; }
        } else if (nextRole === 'BLACKLIST') {
          const term = pendingTerm[memberId] ?? serverTermMap[memberId] ?? 'INDEFINITE';
          await (applyRole as unknown as (id: string, role: any, term?: any) => Promise<void>)(memberId, nextRole, term);
          nextCache[memberId] = term;
        }
      }

      // 캐시 저장 (새로고침해도 유지)
      cacheDirtyRef.current = true;
      setTermCache(nextCache);

      // 저장 후 재조회 + 보류 목록 초기화
      const res = await listAdminMembers({ q, page, size });
      setData(res);
      setPending({});
      setPendingTerm({});
      alert('저장되었습니다.');
    } catch (e: any) {
      alert(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setBulkSaving(false);
    }
  }

  // ---------------- 일괄변경 모달 ----------------
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<Role>('USER');
  const [bulkTerm, setBulkTerm] = useState<Term>('INDEFINITE');

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const openBulk = () => {
    console.log('[Bulk] openBulk() clicked');
    setBulkOpen(true);
  };

  useEffect(() => {
    if (!bulkOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [bulkOpen]);

  // 모달 확인 시: 리스트에만 먼저 반영(저장은 onSaveChanges에서)
  const applyBulkToListOnly = () => {
    const ids = rows.filter(r => selected[r.memberId]).map(r => r.memberId);
    if (ids.length === 0) {
      alert('선택된 회원이 없습니다.');
      return;
    }
    setPending(prev => {
      const nxt = { ...prev };
      ids.forEach(id => { nxt[id] = bulkRole; });
      return nxt;
    });
    setPendingTerm(prev => {
      const nxt = { ...prev };
      ids.forEach(id => {
        if (bulkRole === 'BLACKLIST') nxt[id] = bulkTerm;
        else delete nxt[id];
      });
      return nxt;
    });

    setBulkOpen(false);
  };

  return (
    <main className="apn-main mx-auto px-4 max-w-[800px]" style={{ paddingBottom: 40 }}>
      {/* 타이틀: 한 줄 고정 + 아이콘 정렬/크기(1em) */}
      <div className="admin-head text-center">
        <h1 className="admin-title">
          <span>Member Management</span>
          <Paw className="apn-title-ico" />
        </h1>
      </div>

      {/* 옵션 + 검색 (한 줄: [옵션][검색창]) */}
      <div className="admin-actions flex items-center justify-center gap-2 mt-[25px]">
        {/* 권한 옵션: 관리자/회원/블랙리스트 */}
        <select
            className="dropdown role-select"
            value={role}
            onChange={(e) => {
              const next = e.target.value as 'ADMIN' | 'USER' | 'BLACKLIST' | 'NONE';
              setRole(next);
              setRoleEnabled(next !== 'NONE');
              setPage(1);

              // 역할 선택 시 서버 역할검색을 바로 트리거: q/keyword를 역할 키워드로 맞춤
              if (next === 'ADMIN') {
                setQ('관리자');     // 서버 parseRoleKeyword에서 인식됨
                setKeyword('관리자');
              } else if (next === 'USER') {
                setQ('회원');
                setKeyword('회원');
              } else if (next === 'BLACKLIST') {
                setQ('블랙리스트');
                setKeyword('블랙리스트');
              } else {
                // 선택안함
                setQ('');
                setKeyword('');
              }
            }}
            aria-label="권한 옵션"
          >
            <option value="NONE">선택안함</option>
            <option value="ADMIN">관리자</option>
            <option value="USER">회원</option>
            <option value="BLACKLIST">블랙리스트</option>
          </select>


        {/* 기존 검색창 유지 (디자인 변경 없음) */}
        <div className="admin-search">
          <input
            className="admin-input"
            placeholder="회원 ID, 이름, 이메일 등으로 검색"
            value={keyword}                            
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }}
            aria-label="검색어"
          />
          <button className="admin-ico-search" onClick={onSearch} aria-label="검색" type="button">
            <Paw className="admin-ico" />
          </button>
        </div>
      </div>

      {/* 회색 실선 */}
      <div className="admin-sep" />

      {/* 헤더 라인 */}
      <div className="grid grid-cols-[28px_160px_1fr_160px_1fr_160px_120px] gap-2 px-4 text-sm font-semibold ">
        <div className="text-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleAll(e.target.checked)}
            aria-label="전체 선택"
          />
        </div>
        <div>ID</div>
        <div>NAME</div>
        <div>TEL</div>
        <div>E-Mail</div>
        <div>ROLE</div>
        <div>TERM</div>
      </div>

      {/* 회색 실선 */}
      <div className="admin-sep" />

      {/* 목록 */}
      <div className="px-4">
        {loading ? (
          <div className="text-center py-8">불러오는 중…</div>
        ) : err ? (
          <div className="text-center text-red-600 py-8">{err}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8">검색 결과가 없습니다.</div>
        ) : (
          rows.map((m) => {
            const roleValue = (pending[m.memberId] ?? m.role) as Role;
            const termValue: Term =
              pendingTerm[m.memberId] ??
              serverTermMap[m.memberId] ??
              termCache[m.memberId] ??
              'INDEFINITE';

            return (
              <div
                key={m.memberId}
                className="grid grid-cols-[28px_160px_1fr_160px_1fr_160px_120px] gap-2 py-2 border-b border-gray-100 items-center"
              >
                {/* (1) 행 체크박스 */}
                <div className="text-center">
                  <input
                    type="checkbox"
                    checked={!!selected[m.memberId]}
                    onChange={(e) => toggleOne(m.memberId, e.target.checked)}
                    aria-label={`${m.memberId} 선택`}
                  />
                </div>

                <div className="truncate">{m.memberId}</div>
                <div className="truncate">{m.name}</div>
                <div className="truncate">{m.phone ?? '-'}</div>
                <div className="truncate">{m.email}</div>

                {/* ROLE */}
                <div>
                  <select
                    className="dropdown"
                    value={roleValue}
                    onChange={(e) => onChangeRole(m.memberId, e.target.value as AdminMemberRow['role'])}
                    disabled={bulkSaving}
                  >
                    <option value="USER">회원</option>
                    <option value="ADMIN">관리자</option>
                    <option value="BLACKLIST">블랙리스트</option>
                  </select>
                </div>

                {/* TERM (ROLE=BLACKLIST만 활성) */}
                <div>
                  <select
                    className="dropdown"
                    value={termValue}
                    onChange={(e) => onChangeTerm(m.memberId, e.target.value as Term)}
                    disabled={roleValue !== 'BLACKLIST' || bulkSaving}
                    title={roleValue !== 'BLACKLIST' ? '블랙리스트에서만 설정 가능' : undefined}
                  >
                    <option value="D3">3일</option>
                    <option value="D5">5일</option>
                    <option value="D7">7일</option>
                    <option value="INDEFINITE">영원히</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 페이징 + 저장/일괄변경 버튼 */}
      <div className="admin-sep mb-[20px]" />
      <div className="admin-bottom-row grid grid-cols-[1fr_auto_1fr] items-center">
        <div />
        <div className="flex justify-center">
          <Pager current={page} totalPages={totalPages} onPage={(p) => setPage(p)} />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-3d btn-white"
            onClick={openBulk}
            disabled={bulkSaving}
            title={bulkSaving ? '저장 중입니다' : '선택 없이도 설정할 수 있습니다'}
          >
            일괄변경
          </button>
          <button
            type="button"
            className="btn-3d btn-primary "
            onClick={onSaveChanges}
            disabled={bulkSaving || (Object.keys(pending).length === 0 && Object.keys(pendingTerm).length === 0)}
            title={Object.keys(pending).length === 0 && Object.keys(pendingTerm).length === 0 ? '변경된 항목이 없습니다' : '변경사항 저장'}
          >
            저장
          </button>
        </div>
      </div>

      {/* (4) 일괄변경 모달 — 포털 고정 */}
      {bulkOpen && createPortal(
        <BulkModalContent
          onClose={() => setBulkOpen(false)}
          bulkRole={bulkRole}
          setBulkRole={setBulkRole}
          bulkTerm={bulkTerm}
          setBulkTerm={setBulkTerm}
          applyBulkToListOnly={applyBulkToListOnly}
        />,
        document.body
      )}

      {/* 페이지 한정 스타일 */}
      <style jsx>{`
       /***** =========================================================
 * Admin Member List — CSS 일괄 정의
 * ===========================================================*/

 /* ────────────────────────────────────────────────────────────
    0) 공통 변수(테마/간격)
    ────────────────────────────────────────────────────────────*/
 .apn-main {
   /* 본문 */
   --admin-font-family: inherit;
   --admin-text-color: #030303ff;

   /* 헤더 */
   --header-font-size: 14px;
   --header-font-weight: 600;
   --header-text-color: #111;
   --header-bg: #fafafa;
   --header-vpad: 10px;
   --header-col-gap: 8px;

   /* 행 */
   --row-font-size: 14px;
   --row-text-color: #222;
   --row-vpad: 8px;
   --row-col-gap: 8px;
   --row-border-color: #e5e7eb;
   --row-border-width: 1px;
   --row-hover-bg: #f9fafb;
   --row-zebra-on: 1;
   --row-zebra-bg: #fcfcfc;

   /* 셀 */
   --cell-padding-x: 0px;
   --cell-line-height: 1.4;

   /* 상태 텍스트 */
   --empty-text-color: #6b7280;

   /* 페이징 여백 */
   --pager-margin-bottom: 10px;

   /* 상단 필터 셀렉트 */
   --filter-role-width: 120px;
   --filter-role-height: 40px;
   --filter-role-font-size: 14px;
   --filter-role-radius: 10px;
   --filter-role-padding-x: 8px;
   --filter-role-margin-right: 10px;
   --filter-role-margin-bottom: 15px;

   /* 행 내부 셀렉트 */
   --cell-role-select-width: 120px;
   --cell-role-select-height: 36px;
   --cell-role-select-font-size: 14px;
   --cell-role-select-radius: 10px;
   --cell-role-select-padding-x: 8px;

   /* ★ 모달 커스터마이즈 변수 (원하는 값으로 덮어써서 사용) */
   --modal-width: 400px;             /* ← 모달 너비 */
   --modal-font-size: 15px;          /* ← 모달 기본 폰트 크기 */
   --modal-title-size: 18px;         /* ← 모달 제목 폰트 크기 */
   --modal-line-height: 1.5;
   --modal-radius: 14px;
   --modal-padding: 18px;
   --modal-shadow: 0 16px 40px rgba(0,0,0,0.18);
   --modal-select-height: 44px;      /* ← 모달 셀렉트 높이 */
   --modal-select-font-size: 15px;   /* ← 모달 셀렉트 글씨 크기 */
   --modal-select-radius: 12px;
   --modal-select-padding-x: 12px;
   --modal-label-size: 14px;         /* ← "기간" 라벨 크기 */
   --modal-button-height: 40px;      /* ← 버튼 높이 */
   --modal-button-font: 15px;        /* ← 버튼 글씨 크기 */

   font-family: var(--admin-font-family);
   color: var(--admin-text-color);
 }

 /* 제목 */
 .admin-title {
   display: inline-flex;
   align-items: center;
   gap: 8px;
   font-size: 30px;
   font-weight: 600;
   letter-spacing: 0;
   line-height: 1.2;
   white-space: nowrap;
   color: #000;
 }
 :global(.apn-title-ico) {
   width: 1em; height: 1em; display: inline-block; color: #000 !important;
 }
 :global(.apn-title-ico *) {
   fill: currentColor; stroke: currentColor;
 }

 /* 구분선 */
 .admin-sep { border-top: 1px solid var(--row-border-color); margin: 16px 0; }

 /* 검색 */
 .admin-search { display: inline-flex; align-items: center; gap: 8px; border: none; background: transparent; }
 .admin-input {
   height: 40px; width: 250px; padding: 0 12px; border: 1px solid #e5e7eb; border-radius: 10px; outline: none;
   text-align: center; margin-bottom: 15px;
 }
 .admin-input::placeholder { text-align: center; }
 .admin-input:not(:placeholder-shown) { text-align: left; }
 .admin-ico-search {
   display: inline-flex; align-items: center; justify-content: center; width: 35px; height: 35px;
   border-radius: 40%; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; color: #6e6e6eff; margin-bottom: 15px;
 }
 .admin-ico { width: 16px; height: 16px; display: block }
 .admin-ico :global(*) { fill: currentColor; stroke: currentColor; }

 /* 상단 필터 */
 .role-select {
   width: var(--filter-role-width) !important;
   height: var(--filter-role-height) !important;
   font-size: var(--filter-role-font-size) !important;
   padding: 0 var(--filter-role-padding-x) !important;
   line-height: 28px;
   border: 1px solid #e5e7eb;
   border-radius: var(--filter-role-radius) !important;
   outline: none;
   text-align: center;
   margin-right: var(--filter-role-margin-right);
   margin-bottom: var(--filter-role-margin-bottom);
 }

 /* 헤더 라인 */
 :global(.grid.font-semibold.text-sm) {
   background: var(--header-bg);
   color: var(--header-text-color);
   font-size: var(--header-font-size) !important;
   font-weight: var(--header-font-weight) !important;
   gap: var(--header-col-gap) !important;
   padding-top: var(--header-vpad);
   padding-bottom: var(--header-vpad);
   text-align: center;
 }

 /* 페이징 아래 여백 */
 .admin-bottom-row { margin-bottom: var(--pager-margin-bottom); }

 /* 목록 행 */
 :global(.px-4 > .grid.border-b) {
   font-size: var(--row-font-size);
   color: var(--row-text-color);
   gap: var(--row-col-gap) !important;
   padding-top: var(--row-vpad);
   padding-bottom: var(--row-vpad);
   border-bottom-width: var(--row-border-width) !important;
   border-bottom-color: var(--row-border-color) !important;
   text-align: center;
 }
 :global(.px-4 > .grid.border-b:hover) { background: var(--row-hover-bg); }
 :global(.px-4 > .grid.border-b:nth-child(even)) { background: color-mix(in srgb, var(--row-zebra-bg) 100%, transparent); }
 @supports (background: color-mix(in srgb, #fff 100%, transparent)) {
   :global(.px-4 > .grid.border-b:nth-child(even)) {
     background: calc(var(--row-zebra-on)) * 1px solid transparent;
     background: color-mix(in srgb, var(--row-zebra-bg) 100%, transparent);
   }
 }
 :global(.px-4 > .grid.border-b > div) {
   padding-left: var(--cell-padding-x);
   padding-right: var(--cell-padding-x);
   line-height: var(--cell-line-height);
 }
 :global(.px-4 > .text-center) { color: var(--empty-text-color); }

 /* 행 내부 셀렉트 */
 :global(.px-4 > .grid.border-b select.dropdown) {
   width: var(--cell-role-select-width) !important;
   height: var(--cell-role-select-height) !important;
   font-size: var(--cell-role-select-font-size) !important;
   border-radius: var(--cell-role-select-radius) !important;
   padding: 0 var(--cell-role-select-padding-x) !important;
   line-height: calc(var(--cell-role-select-height) - 8px);
   border: 1px solid var(--row-border-color) !important;
   text-align: center;
 }

 /* ★ 모달 전용 셀렉트 보정 (디자인 그대로, 변수만 적용) */
 .admin-modal-box :global(.admin-modal-select) {
   text-align: left;  /* 옵션 글자 가독성 */
 }
      `}</style>

    </main>
  );
}
