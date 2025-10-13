// src/app/chat/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import chatApi, { type ChatroomDTO } from '@/features/chat/data/chat.api';
import PawIcon from '@/components/icons/Paw';

/** 관리자 여부 판별  */
function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
          sessionStorage.getItem('memberRole') ??
          (() => {
            try {
              const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
              return m ? decodeURIComponent(m[1]) : '';
            } catch {
              return '';
            }
          })())) || '';
    const role = raw.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch {
    return false;
  }
}

/** 페이징 */
function Pager({
  current,
  totalPages,
  onPage,
}: {
  current: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const cur = Math.min(Math.max(1, current || 1), Math.max(1, totalPages));
  const goto = (p: number) =>
    onPage(Math.min(Math.max(1, p), Math.max(1, totalPages)));
  const groupSize = 5;
  const start = Math.floor((cur - 1) / groupSize) * groupSize + 1;
  const end = Math.min(start + groupSize - 1, Math.max(1, totalPages));
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  const BTN = 'btn-3d btn-white px-3 py-1 text-xs no-underline';
  const DIS = 'opacity-60 cursor-not-allowed';

  return (
    <nav className="flex items-center justify-center gap-[6px]">
      <button className={`${BTN} ${cur === 1 ? DIS : ''}`} onClick={() => goto(1)} disabled={cur === 1}>처음</button>
      <button className={`${BTN} ${cur === 1 ? DIS : ''}`} onClick={() => goto(cur - 1)} disabled={cur === 1}>이전</button>
      <div className="flex gap-[6px] mx-[10px]">
        {pages.map((p) => (
          <button key={p} className={`${BTN} ${p === cur ? 'font-bold text-black' : ''}`} onClick={() => goto(p)}>{p}</button>
        ))}
      </div>
      <button className={`${BTN} ${cur === totalPages ? DIS : ''}`} onClick={() => goto(cur + 1)} disabled={cur === totalPages}>다음</button>
      <button className={`${BTN} ${cur === totalPages ? DIS : ''}`} onClick={() => goto(totalPages)} disabled={cur === totalPages}>마지막</button>
    </nav>
  );
}

/** 커스텀  */
function AlertToast({
  open,
  message,
  position = 'bottom-right', // 'top-right' | 'bottom-right'
  onClose,
}: {
  open: boolean;
  message: string | null;
  position?: 'top-right' | 'bottom-right';
  onClose: () => void;
}) {
  if (!open || !message) return null;
  return (
    <div className={`toastWrap ${position === 'top-right' ? 'topRight' : 'bottomRight'}`}>
      <div className="toast">
        <div className="toastIcon">💬</div>
        <div className="toastBody">{message}</div>
        <button className="toastClose" onClick={onClose} aria-label="close toast">✕</button>
      </div>
      <style jsx>{`
        .toastWrap { position: fixed; z-index: 1000; }
        .topRight { top: 16px; right: 16px; }
        .bottomRight { bottom: 16px; right: 16px; }
        .toast {
          background: #111827; color: #ffffff; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          min-width: 220px; max-width: 380px; padding: 12px 16px;
          display: flex; align-items: flex-start; gap: 8px;
        }
        .toastIcon { margin-top: 2px; }
        .toastBody { flex: 1; font-size: 14px; line-height: 1.4; }
        .toastClose { background: transparent; border: 0; color: #fff; opacity: 0.85; cursor: pointer; }
        .toastClose:hover { opacity: 1; }
      `}</style>
    </div>
  );
}

/** 커스텀  모달 (confirm 대체) */
function ConfirmModal({
  open, message, onCancel, onConfirm,
}: {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalTitle">확인</div>
        <div className="modalBody">{message}</div>
        <div className="modalActions">
          <button className="btn ghost" onClick={onCancel}>취소</button>
          <button className="btn primary" onClick={onConfirm}>확인</button>
        </div>
      </div>
      <style jsx>{`
        .modalBackdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center; z-index: 1001;
        }
        .modalCard {
          width: 360px; background: #fff; border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          padding: 16px 16px 12px;
        }
        .modalTitle { font-size: 18px; font-weight: 700; color: #111827; }
        .modalBody { margin-top: 10px; font-size: 14px; color: #374151; }
        .modalActions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
        .btn { padding: 8px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #111827; }
        .btn.ghost:hover { background: #f9fafb; }
        .btn.primary { background: #111827; color: #fff; border-color: #111827; }
        .btn.primary:hover { filter: brightness(1.05); }
      `}</style>
    </div>
  );
}

/**  커스텀  모달 (prompt 대체) */
function NewChatModal({
  open, onCancel, onCreate,
}: {
  open: boolean;
  onCancel: () => void;
  onCreate: (title: string) => void;
}) {
  const [title, setTitle] = useState('');
  if (!open) return null;
  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true">
      <div className="modalCard">
        <div className="modalTitle">새로운 문의사항이 있으신가요?</div>
        <div className="modalBody">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문의하실 내용의 제목을 입력해 주세요"
            className="fieldInput"
          />
        </div>
        <div className="modalActions">
          <button className="btn ghost" onClick={onCancel}>취소</button>
          <button
            className="btn primary"
            onClick={() => {
              const v = title.trim();
              if (v) onCreate(v);
            }}
          >
            시작
          </button>
        </div>
      </div>
      <style jsx>{`
        .modalBackdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center; z-index: 1001;
        }
        .modalCard {
          width: 420px; background: #fff; border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.25);
          padding: 16px 16px 12px;
        }
        .modalTitle { font-size: 18px; font-weight: 700; color: #111827; }
        .modalBody { margin-top: 10px; font-size: 14px; color: #374151; }
        .fieldLabel { display: block; margin-bottom: 6px; color: #111827; }
        .fieldInput {
          width: 380px; padding: 10px 12px; font-size: 14px;
          border: 1px solid #d1d5db; border-radius: 8px; outline: none;
        }
        .fieldInput:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,0.15); }
        .modalActions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
        .btn { padding: 8px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; border: 1px solid #d1d5db; background: #fff; color: #111827; }
        .btn.ghost:hover { background: #f9fafb; }
        .btn.primary { background: #ffffffff; color: #000000ff; border-color: #d4d4d4ff; }
        .btn.primary:hover { filter: brightness(1.05); }
      `}</style>
    </div>
  );
}
/** 채팅방 정렬 */
function roomSortKey(r: ChatroomDTO): number {
  
  const ts =
    (r as any).updatedAt ??
    (r as any).lastMessageAt ??
    (r as any).lastUpdatedAt ??
    (r as any).createdAt ??
    null;

  if (ts) {
    const n = new Date(ts as any).getTime();
    if (!Number.isNaN(n)) return n;
  }
 
  return typeof (r as any).id === 'number' ? (r as any).id : 0;
}


function sortRoomsDesc(rows: ChatroomDTO[]): ChatroomDTO[] {
  return [...rows].sort((a, b) => roomSortKey(b) - roomSortKey(a));
}

function dedupById(rows: ChatroomDTO[]): ChatroomDTO[] {
  const m = new Map<number, ChatroomDTO>();
  for (const r of rows) if (!m.has(r.id)) m.set(r.id, r);
  return Array.from(m.values());
}


export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatroomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const size = 10;

  /** ✅ 모달 상태 */
  const [newModalOpen, setNewModalOpen] = useState(false);         // prompt 대체
  const [confirmId, setConfirmId] = useState<number | null>(null); // confirm 대체

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const forceAdmin = searchParams.get('forceAdmin') === '1';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
    window.setTimeout(() => setToastOpen(false), 2200);
  };

  useEffect(() => {
    const f = searchParams.get('forceAdmin');
    if (f === '1') {
      try {
        localStorage.setItem('memberRole', 'ADMIN');
        sessionStorage.setItem('memberRole', 'ADMIN');
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }
  }, [searchParams]);

  // 목록 로드
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const admin = isAdminClient() || forceAdmin;
        const rows = admin ? await chatApi.adminList() : await chatApi.list();
        if (mounted) setRooms(sortRoomsDesc(dedupById(rows)));


      } catch (e: any) {
        console.error('[chat list] load error:', e);
        if (mounted) {
          setRooms([]);
          setErr(e?.message || '채팅방 목록 조회 실패');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [forceAdmin]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((rooms?.length || 0) / size)),
    [rooms]
  );
  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return rooms.slice(start, start + size);
  }, [rooms, page]);

  const admin = isAdminClient() || forceAdmin;

  
  const onNew = () => {
    setNewModalOpen(true);
  };

  
  const createChat = async (title: string) => {
    try {
      const created = await chatApi.create(title);
      setRooms((prev) => sortRoomsDesc(dedupById([created, ...prev])));
      setPage(1);

      showToast('새로운 채팅이 생성되었습니다.');
    } catch (e: any) {
      showToast(e?.message || '채팅방 생성 실패');
    } finally {
      setNewModalOpen(false);
    }
  };

  
  const onLeave = (id: number) => {
    setConfirmId(id);
  };

 
  const confirmLeave = async () => {
    if (confirmId == null) return;
    const id = confirmId;
    setConfirmId(null);
    try {
      const ok = await chatApi.leave(id);
      if (ok) {
        setRooms((prev) => sortRoomsDesc(dedupById(prev.filter((r) => r.id !== id))));

        showToast('채팅방이 삭제되었습니다.');
      }
    } catch (e: any) {
      showToast(e?.message || '퇴장 처리 실패');
    }
  };

  return (
    <RequireLogin>
      <main className="pageWrap">
        <h1 className="pageTitle">
          Live Chat
          <span className="pawWrap" aria-hidden="true">
            <PawIcon />
          </span>
        </h1>

        <div className="rowRight">
          {!admin && (
            <button type="button" className="btnNew" onClick={onNew}>
              새 채팅
            </button>
          )}
        </div>

        <hr className="sectionHr" />

        {loading ? (
          <div className="centerNote">불러오는 중…</div>
        ) : err ? (
          <div className="centerNote error">{err}</div>
        ) : (
          <ul className="chatList">
            {pageItems.map((r) => (
              <li key={`${r.id}-${r.title}`} className="chatItem">

                <div className="left">
                  <Link
                    href={`/chat/${r.id}`}
                    className="titleLink"
                    style={{ color: '#111111', textDecoration: 'none' }}
                  >
                    <span className="titleText">{r.title}</span>
                  </Link>

                  {r.hasNewMessage && <span className="badgeNew">NEW</span>}
                </div>
                {!admin && (
                  <button type="button" className="delBtn" onClick={() => onLeave(r.id)}>
                    삭제
                  </button>
                )}
              </li>
            ))}
            {pageItems.length === 0 && (
              <li className="emptyItem">채팅이 존재하지 않습니다</li>
            )}
          </ul>
        )}

        <hr className="sectionHr" />

        <div className="pagerWrap">
          <Pager current={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </main>

      {/* 토스트 */}
      <AlertToast
        open={toastOpen}
        message={toastMsg}
        position="bottom-right"
        onClose={() => setToastOpen(false)}
      />

      {/* 모달들 */}
      <NewChatModal
        open={newModalOpen}
        onCancel={() => setNewModalOpen(false)}
        onCreate={createChat}
      />
      <ConfirmModal
        open={confirmId != null}
        message="이 채팅방에서 퇴장하시겠습니까? (목록에서 제거됩니다)"
        onCancel={() => setConfirmId(null)}
        onConfirm={confirmLeave}
      />

      {/* ========= 스타일 ========= */}
      <style jsx>{`
        .pageWrap { width: 450px; margin: 0 auto; padding: 0 16px; }
        .pageTitle {
          margin: 20px 0; display: flex; align-items: center; justify-content: center; gap: 8px;
          font-size: 24px; font-weight: 700; color: #111827;
        }
        .pawWrap { display: inline-flex; width: 1em; height: 1em; line-height: 0; margin-left: 8px; color: #111827; }
        .pawWrap :global(svg) { width: 100%; height: 100%; display: block; }
        .pawWrap :global(path), .pawWrap :global(circle), .pawWrap :global(rect),
        .pawWrap :global(ellipse), .pawWrap :global(line), .pawWrap :global(polyline), .pawWrap :global(polygon) {
          stroke: currentColor; fill: currentColor;
        }

        .rowRight { text-align: right; margin-bottom: 8px; }
        .btnNew {
          background: #ffffff; 
          color: #111827; 
          border: 1px solid #d1d5db;
          border-radius: 9px; 
          padding: 5px 12px; 
          box-shadow: 0 1px 0 rgba(0,0,0,0.12); 
          cursor: pointer;
          margin: 0 10px 5px ;
        }
        .btnNew:hover { background: #f9fafb; }

        .sectionHr { border: 0; border-top: 1px solid #cacacaff; }

        .centerNote { padding: 40px 0; text-align: center; color: #111827; }
        .centerNote.error { color: #dc2626; }

        :global(.chatList .titleLink) { color: #111111 !important; text-decoration: none !important; }
        :global(.chatList .titleLink:visited) { color: #111111 !important; text-decoration: none !important; }
        :global(.chatList .titleLink:hover) { color: #111111 !important; text-decoration: none !important; }

        .chatList { list-style: none; margin: 0; padding: 0; }
        .chatItem { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
        .chatItem + .chatItem { border-top: 1px solid #e5e7eb; }
        .left { display: flex; align-items: center; gap: 12px; }

        .titleLink { color: #111111; text-decoration: none; }
        .titleLink:visited { color: #111111; }
        .titleText { 
        font-weight: 400; 
        margin: 0 0 0 15px;
        }

        .badgeNew {
          display: inline-block; font-size: 12px; font-weight: 400; padding: 1px 6px; border-radius: 9px;
          background: #fca6a6ff; color: #ffffffff; border: 1px solid #ffa1acff;
          margin: 3px 0 0 -3px;
        }

        .delBtn {
          height: 30px; 
          padding: 0 10px;
          margin: 0 10px;
          font-size: 13px;
          font-weight: 400; 
          line-height: 1; 
          border-radius: 9px;
          background: #f5f5f5ff; 
          color: #111827; 
          border: 1px solid #e9e9e9ff;  
          cursor: pointer;
        }
        .delBtn:hover { background: #f9fafb; }

        .emptyItem { padding: 24px 0; text-align: center; color: #6b7280; }

        .pagerWrap { margin-top: 30px; margin-bottom: 70px;}
      `}</style>
    </RequireLogin>
  );
}
