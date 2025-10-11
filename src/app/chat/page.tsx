// src/app/chat/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import { chatApi, type ChatroomDTO } from '@/features/chat/data/chat.api';
import PawIcon from '@/components/icons/Paw';

function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
         sessionStorage.getItem('memberRole') ??
         (() => {
           try {
             const m = document.cookie.match(/(?:^|;\\s*)memberRole=([^;]+)/);
             return m ? decodeURIComponent(m[1]) : '';
           } catch { return ''; }
         })())) || '';
    const role = raw.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch { return false; }
}

function Pager({
  current, totalPages, onPage,
}: { current: number; totalPages: number; onPage: (p: number) => void; }) {
  const cur = Math.min(Math.max(1, current || 1), Math.max(1, totalPages));
  const goto = (p: number) => onPage(Math.min(Math.max(1, p), Math.max(1, totalPages)));
  const groupSize = 5;
  const start = Math.floor((cur - 1) / groupSize) * groupSize + 1;
  const end = Math.min(start + groupSize - 1, Math.max(1, totalPages));
  const pages: number[] = []; for (let p = start; p <= end; p++) pages.push(p);
  const BTN = 'btn-3d btn-white px-3 py-1 text-xs no-underline';
  const DIS = 'opacity-60 cursor-not-allowed';
  return (
    <nav className="flex items-center justify-center gap-[6px]">
      <button className={`${BTN} ${cur===1?DIS:''}`} onClick={()=>goto(1)} disabled={cur===1}>처음</button>
      <button className={`${BTN} ${cur===1?DIS:''}`} onClick={()=>goto(cur-1)} disabled={cur===1}>이전</button>
      <div className="flex gap-[6px] mx-[10px]">
        {pages.map((p)=>(
          <button key={p} className={`${BTN} ${p===cur?'font-bold text-black':''}`} onClick={()=>goto(p)}>{p}</button>
        ))}
      </div>
      <button className={`${BTN} ${cur===totalPages?DIS:''}`} onClick={()=>goto(cur+1)} disabled={cur===totalPages}>다음</button>
      <button className={`${BTN} ${cur===totalPages?DIS:''}`} onClick={()=>goto(totalPages)} disabled={cur===totalPages}>마지막</button>
    </nav>
  );
}

export default function ChatListPage() {
  const [rooms, setRooms] = useState<ChatroomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const size = 10;

  const admin = isAdminClient();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const list = await chatApi.list(); // GET /chats
        if (!alive) return;
        setRooms(Array.isArray(list) ? list : []);
      } catch (e: any) {
        setErr(e?.message || '채팅방 목록 조회 실패');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((rooms?.length || 0) / size)), [rooms]);
  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return rooms.slice(start, start + size);
  }, [rooms, page]);

  const onNew = async () => {
    const title = window.prompt('새 문의 제목을 입력하세요')?.trim();
    if (!title) return;
    try {
      const created = await chatApi.create(title); // POST /chats?title=
      // 최신이 위로 오도록 앞에 추가
      setRooms(prev => [created, ...prev]);
      setPage(1);
    } catch (e: any) {
      alert(e?.message || '채팅방 생성 실패');
    }
  };

  const onLeave = async (id: number) => {
    if (!window.confirm('이 채팅방에서 퇴장하시겠습니까? (목록에서 제거됩니다)')) return;
    try {
      const ok = await chatApi.leave(id); // DELETE /chats/{id}
      if (ok) setRooms(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      alert(e?.message || '퇴장 처리 실패');
    }
  };

  return (
    <RequireLogin>
      <main className="mx-auto w-[700px] px-4">
        {/* 타이틀: 본문 전체 가운데 정렬 */}
        <h1 className="text-2xl font-semibold my-[24px] flex items-center justify-center gap-2">
          1:1 고객상담 <PawIcon className="w-[1em] h-[1em]" />
        </h1>

        {/* 새 문의하기: 본문 우측 정렬 */}
        <div className="text-right mb-2">
          <button type="button" className="btn-3d btn-white" onClick={onNew}>
            새 문의하기
          </button>
        </div>

        {/* 회색 실선 */}
        <hr className="border-gray-300" />

        {/* 섹션 타이틀 */}
        <div className="mt-3 mb-2 font-semibold text-center">채팅방목록</div>

        {loading ? (
          <div className="py-10 text-center">불러오는 중…</div>
        ) : err ? (
          <div className="py-10 text-center text-red-600">{err}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pageItems.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href={`/cs/${r.id}`} className="no-underline">
                    <span className="font-medium">{r.title}</span>
                  </Link>
                  {r.hasNewMessage ? (
                    <span className="ml-1 inline-block text-xs px-2 py-[2px] rounded-full bg-rose-100 text-rose-600">
                      NEW
                    </span>
                  ) : null}
                </div>
                {!admin && (
                  <button type="button" className="btn-3d btn-white text-xs" onClick={() => onLeave(r.id)}>
                    퇴장
                  </button>
                )}
              </li>
            ))}
            {pageItems.length === 0 && <li className="py-6 text-center text-gray-500">채팅방이 없습니다.</li>}
          </ul>
        )}

        {/* 페이징 버튼 */}
        <div className="mt-4">
          <Pager current={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </main>
    </RequireLogin>
  );
}
