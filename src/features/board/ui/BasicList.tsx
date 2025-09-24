// src/features/board/ui/BasicList.tsx
'use client';

import { useEffect, useState } from 'react';

type Props = {
  type: string;
  page: number;
  size: number;
  total: number;
  items: any[];
  isLoading: boolean;
};

function isLoggedIn() {
  if (typeof window === 'undefined') return false;
  try {
    const t =
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      '';
    return !!t && t.length > 0;
  } catch {
    return false;
  }
}

export function BasicList({ type, page, size, total, items, isLoading }: Props) {
  /** ✅ Hook은 컴포넌트 최상단(조기 return보다 위)에서 호출 */
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    setAuthed(isLoggedIn());
  }, []);

  /** 조기 반환은 Hook 이후에 */
  if (isLoading) return <div>로딩중…</div>;
  if (!items?.length) return <div className="text-gray-500">게시글이 없습니다</div>;

  // ✅ 고정글 우선 정렬 + 제목 굵게 + 번호는 "*" (번호 칸 없으므로 제목 앞에 표시)
  const normalized = items.map((b: any) => {
    const pinned = !!(b.noticeFlag || b.topFix || b.isPinned || b.pinYn === 'Y');
    return {
      raw: b,
      bno: b.bno ?? b.id,
      title: b.bTitle ?? b.title ?? b.btitle ?? '',
      writer: b.bWriter ?? b.writer ?? b.bwriter ?? '익명',
      date: b.createDate ?? b.createdAt ?? b.regDate ?? '',
      pinned,
    };
  });

  const pinnedList = normalized.filter((n) => n.pinned);
  const normalList = normalized.filter((n) => !n.pinned);
  const ordered = [...pinnedList, ...normalList];

  // ✅ 비회원의 NOTICE/FREE 상세 진입을 프론트에서 1차 차단
  const boardTypeUpper = String(type ?? '').toUpperCase();
  const loginRequired = boardTypeUpper === 'NOTICE' || boardTypeUpper === 'FREE';

  return (
    <ul className="divide-y">
      {ordered.map((n) => (
        <li key={n.bno} className="py-3">
          {loginRequired && !authed ? (
            <button
              type="button"
              className={`hover:underline ${n.pinned ? 'font-bold' : ''}`}
              onClick={() => alert('로그인 후 이용해주세요')}
            >
              {n.pinned ? '＊ ' : ''}
              {n.title}
            </button>
          ) : (
            <a
              href={`/board/${type}/${n.bno}`}
              className={`relative hover:underline ${n.pinned ? 'font-bold' : ''}`}
            >
              {n.pinned ? '＊ ' : ''}
              {n.title}
            </a>
          )}
          <div className="text-sm text-gray-500">
            {n.writer} · {new Date(n.date).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
