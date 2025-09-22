// src/app/member/list/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
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

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL 파라미터 ←→ 상태 동기화
  const [q, setQ] = useState<string>(() => searchParams.get('q') ?? '');
  const [page, setPage] = useState<number>(() => Number(searchParams.get('page') || 1));
  const size = 10;

  const [role, setRole] = useState<'ADMIN' | 'USER' | 'BLACKLIST' | 'NONE'>('ADMIN');
  const [roleEnabled, setRoleEnabled] = useState(false); // 사용자가 옵션을 실제로 선택했을 때만 필터 적용

  // 데이터
  const [data, setData] = useState<PageRes<AdminMemberRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null); // (기존 상태 유지: UI 변경 최소화 목적)
  const [err, setErr] = useState<string | null>(null);

  // (1) 선택해둔(미저장) ROLE/TERM 변경 모음
  const [pending, setPending] = useState<Record<string, AdminMemberRow['role']>>({});
  const [pendingTerm, setPendingTerm] = useState<Record<string, Term>>({});

  // (1) 일괄 저장 중 여부
  const [bulkSaving, setBulkSaving] = useState(false);

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
    router.replace(`/member/list?${usp.toString()}`);
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
      setPendingTerm(prev => ({ ...prev, [memberId]: prev[memberId] ?? 'INDEFINITE' }));
    }
  }
  function onChangeTerm(memberId: string, term: Term) {
    setPendingTerm(prev => ({ ...prev, [memberId]: term }));
  }

  function onSearch() {
    setPage(1);
    setQ((q || '').trim());
  }

  // 저장 버튼 클릭 시: 변경된 것만 서버 반영 (ROLE + TERM)
  async function onSaveChanges() {
    const changes = Object.entries(pending);
    if (changes.length === 0) return; // 변경 없음

    try {
      setBulkSaving(true);
      for (const [memberId, nextRole] of changes) {
        const cur = (data?.dtoList || []).find(m => m.memberId === memberId)?.role;
        if (cur && cur !== nextRole) {
          const term = pendingTerm[memberId]; // BLACKLIST일 때만 의미
          // applyRole의 시그니처(2 or 3 인자)와 무관하게 타입 에러 없이 호출
          await (applyRole as unknown as (id: string, role: any, term?: any) => Promise<void>)(memberId, nextRole, term);
        } else if (nextRole === 'BLACKLIST') {
          // 같은 BLACKLIST라도 TERM만 바뀐 경우를 커버
          const term = pendingTerm[memberId] ?? 'INDEFINITE';
          await (applyRole as unknown as (id: string, role: any, term?: any) => Promise<void>)(memberId, nextRole, term);
        }
      }
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

const openBulk = () => {
  setBulkOpen(true);
};
  const applyBulkToListOnly = () => {
  const ids = rows.filter(r => selected[r.memberId]).map(r => r.memberId);
  if (ids.length === 0) {
    alert('선택된 회원이 없습니다.');
    return; // 팝업을 닫지 않고 유지
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
    setBulkOpen(false); // 리스트에만 우선 반영, 저장은 onSaveChanges에서
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
            setRoleEnabled(next !== 'NONE'); // 선택안함이면 필터 미적용
            setPage(1);
          }}
          aria-label="권한 옵션"
        >
          <option value="NONE">선택안함</option>
          <option value="ADMIN">관리자</option>
          <option value="USER">회원</option>
          <option value="BLACKLIST">블랙리스트</option>
        </select>

        {/* 기존 검색창 유지 */}
        <div className="admin-search">
          <input
            className="admin-input"
            placeholder="회원 ID, 이름, 이메일 등으로 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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

      {/* 헤더 라인 (체크박스 + ID/NAME/TEL/E-Mail/ROLE/TERM) */}
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
            const roleValue = pending[m.memberId] ?? m.role;
            const termValue: Term = pendingTerm[m.memberId] ?? 'INDEFINITE';
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

      {/* 페이징 + 저장/일괄변경 버튼 (같은 줄) */}
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

      {/* (4) 일괄변경 모달 */}
    {bulkOpen && (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setBulkOpen(false)} />
          <div className="relative z-10 w-[360px] rounded-lg bg-white p-4 shadow">
            <div className="mb-3 font-semibold">변경할 권한</div>
            <select
              className="dropdown w-full mb-3"
              value={bulkRole}
              onChange={(e) => setBulkRole(e.target.value as Role)}
            >
              <option value="USER">회원</option>
              <option value="ADMIN">관리자</option>
              <option value="BLACKLIST">블랙리스트</option>
            </select>

            {bulkRole === 'BLACKLIST' && (
              <div className="mb-3">
                <div className="mb-1">기간</div>
                <select
                  className="dropdown w-full"
                  value={bulkTerm}
                  onChange={(e) => setBulkTerm(e.target.value as Term)}
                >
                  <option value="D3">3일</option>
                  <option value="D5">5일</option>
                  <option value="D7">7일</option>
                  <option value="INDEFINITE">영구</option>
                </select>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-3d btn-white" onClick={() => setBulkOpen(false)}>취소</button>
              <button className="btn-3d btn-primary" onClick={applyBulkToListOnly}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 페이지 한정 스타일 (원본 그대로 유지) */}
      <style jsx>{`
       /***** =========================================================
 * Admin Member List — CSS 일괄 정의 (종류별 정리 + 주석)
 * - 이 블록을 기존 <style jsx> 내용 전체와 교체해도 동작합니다.
 * - 필요값은 변수로 조절하세요.
 * ===========================================================*/

 /* ────────────────────────────────────────────────────────────
    0) 공통 변수(테마/간격) — 페이지 전역에서 사용하는 토큰
    ────────────────────────────────────────────────────────────*/
 .apn-main {
   /* 폰트/텍스트 */
   --admin-font-family: inherit;
   --admin-text-color: #030303ff;   /* 목록 본문 기본 색 (제목/아이콘은 별도로 고정) */

   /* 헤더(컬럼 타이틀) */
   --header-font-size: 14px;
   --header-font-weight: 600;
   --header-text-color: #111;
   --header-bg: #fafafa;
   --header-vpad: 10px;         /* 상하 패딩 */
   --header-col-gap: 8px;       /* 컬럼 간격 */

   /* 목록 행(Row) */
   --row-font-size: 14px;
   --row-text-color: #222;
   --row-vpad: 8px;             /* 행 상하 패딩 */
   --row-col-gap: 8px;          /* 컬럼 간격 */
   --row-border-color: #e5e7eb; /* 구분선 색 */
   --row-border-width: 1px;
   --row-hover-bg: #f9fafb;     /* 호버 배경 */
   --row-zebra-on: 1;           /* 1=지브라 on, 0=off */
   --row-zebra-bg: #fcfcfc;     /* 지브라 배경 */

   /* 셀(텍스트) */
   --cell-padding-x: 0px;       /* 좌우 패딩 (grid 구성이라 보통 0 유지) */
   --cell-line-height: 1.4;

   /* 비어있음/로딩/에러 문구 */
   --empty-text-color: #6b7280;

   /* 페이징 여백 (페이징과 footer 사이) */
   --pager-margin-bottom: 10px;

   /* 상단 ‘권한 옵션’ 드롭다운(필터) */
   --filter-role-width: 120px;
   --filter-role-height: 40px;
   --filter-role-font-size: 14px;
   --filter-role-radius: 10px;
   --filter-role-padding-x: 8px;
   --filter-role-margin-right: 10px;
   --filter-role-margin-bottom: 15px;

   /* 목록 행 안의 ROLE 변경 드롭다운(셀렉트) — 요청하신 전용 변수 */
   --cell-role-select-width: 120px;   /* ← 가로폭 */
   --cell-role-select-height: 36px;   /* ← 높이  */
   --cell-role-select-font-size: 14px;
   --cell-role-select-radius: 10px;
   --cell-role-select-padding-x: 8px;

   font-family: var(--admin-font-family);
   color: var(--admin-text-color);
 }

 /* ────────────────────────────────────────────────────────────
    1) 타이틀(제목 + Paw 아이콘)
    - 전역 텍스트 색과 무관하게 검정 고정
    ────────────────────────────────────────────────────────────*/
 .admin-title {
   display: inline-flex;
   align-items: center;
   gap: 8px;
   font-size: 30px;   /* 필요 시 24~32px 등으로 조절 */
   font-weight: 600;
   letter-spacing: 0;
   line-height: 1.2;
   white-space: nowrap;
   color: #000;       /* 제목 고정색 */
 }
 :global(.apn-title-ico) {
   width: 1em;
   height: 1em;
   display: inline-block;
   color: #000 !important; /* 아이콘도 검정 고정 */
 }
 :global(.apn-title-ico *) {
   fill: currentColor;
   stroke: currentColor;
 }

 /* ────────────────────────────────────────────────────────────
    2) 구분선(상·하 회색 실선)
    ────────────────────────────────────────────────────────────*/
 .admin-sep {
   border-top: 1px solid var(--row-border-color);
   margin: 16px 0;
 }

 /* ────────────────────────────────────────────────────────────
    3) 상단 [옵션][검색창] 줄 — 검색창 UI
    ────────────────────────────────────────────────────────────*/
 .admin-search {
   display: inline-flex;
   align-items: center;
   gap: 8px;
   border: none;
   background: transparent;
 }
 .admin-input {
   height: 40px;
   width: 250px;
   padding: 0 12px;
   border: 1px solid #e5e7eb;
   border-radius: 10px;
   outline: none;
   text-align: center;
   margin-bottom: 15px;
 }
 .admin-input::placeholder { text-align: center; }
 .admin-input:not(:placeholder-shown) { text-align: left; }
 .admin-ico-search {
   display: inline-flex;
   align-items: center;
   justify-content: center;
   width: 35px;
   height: 35px;
   border-radius: 40%;
   border: 1px solid #e5e7eb;
   background: #fff;
   cursor: pointer;
   color: #6e6e6eff;
   margin-bottom: 15px;
 }
 .admin-ico { width: 16px; height: 16px; display: block  }
 .admin-ico :global(*) { fill: currentColor; stroke: currentColor; }

 /* ────────────────────────────────────────────────────────────
    4) 상단 ‘권한 옵션’ 드롭다운(필터) 
    ────────────────────────────────────────────────────────────*/
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

 /* ────────────────────────────────────────────────────────────
    5) 테이블 헤더(컬럼 타이틀) — 그리드 라인
    ────────────────────────────────────────────────────────────*/
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

 /* ────────────────────────────────────────────────────────────
    6) 페이징 컨테이너 하단 여백(footer 사이)
    ────────────────────────────────────────────────────────────*/
.admin-bottom-row {
  margin-bottom: var(--pager-margin-bottom);
}


 /* ────────────────────────────────────────────────────────────
    7) 목록 행(Grid) — 본문 라인 스타일
    ────────────────────────────────────────────────────────────*/
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
 :global(.px-4 > .grid.border-b:hover) {
   background: var(--row-hover-bg);
 }

 /* 지브라 줄무늬(짝수 행) */
 :global(.px-4 > .grid.border-b:nth-child(even)) {
   background: color-mix(in srgb, var(--row-zebra-bg) 100%, transparent);
 }
 @supports (background: color-mix(in srgb, #fff 100%, transparent)) {
   :global(.px-4 > .grid.border-b:nth-child(even)) {
     background: calc(var(--row-zebra-on)) * 1px solid transparent; /* 변수평가 트리거용 no-op */
     background: color-mix(in srgb, var(--row-zebra-bg) 100%, transparent);
   }
 }

 /* 셀(텍스트) 보정: 줄간격/좌우 패딩 */
 :global(.px-4 > .grid.border-b > div) {
   padding-left: var(--cell-padding-x);
   padding-right: var(--cell-padding-x);
   line-height: var(--cell-line-height);
 }

 /* 비어있음/로딩/에러 문구 */
 :global(.px-4 > .text-center) {
   color: var(--empty-text-color);
 }

 /* ────────────────────────────────────────────────────────────
    8) 목록 행 안의 ROLE/TERM 드롭다운(셀렉트) — 전용 사이즈 변수 적용
    ────────────────────────────────────────────────────────────*/
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
      `}</style>
    </main>
  );
}
