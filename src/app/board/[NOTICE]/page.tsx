'use client';

import Link from 'next/link';
import { useBoardList } from '@/features/board/app/useBoards';

export default function BoardListPage() {
  const { data, isLoading, error } = useBoardList({ page: 1, size: 10 }); // 서버가 1부터 시작이라면 1

  if (isLoading) return <main style={{padding:24}}>로딩...</main>;
  if (error) return <main style={{padding:24}}>목록 로딩 실패</main>;

  const list = data?.dtoList ?? [];

  return (
    <main style={{ padding: 24 }}>
      <h1>게시판</h1>
      <div style={{ marginBottom: 12 }}>
        <Link href="/board/new">글쓰기</Link>
      </div>
      <ul>
        {list.map((b) => (
          <li key={b.bno}>
            <Link href={`/board/${b.bno}`}>{b.bTitle}</Link>
            <small style={{ marginLeft: 8 }}>
              by {b.bWriter} / 조회 {b.bViewCount} / 좋아요 {b.bLikeCount}
            </small>
          </li>
        ))}
      </ul>
    </main>
  );
}
