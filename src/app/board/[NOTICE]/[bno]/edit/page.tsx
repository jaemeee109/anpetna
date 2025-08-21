'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBoardDetail, useBoardMutations } from '@/features/board/app/useBoards';
import type { BoardType } from '@/features/board/data/board.types';

export default function EditBoardPage() {
  const { bno } = useParams<{ bno: string }>();
  const id = Number(bno);
  const router = useRouter();
  const { data } = useBoardDetail(id);
  const { update } = useBoardMutations();

  const [bTitle, setTitle] = useState('');
  const [bContent, setContent] = useState('');
  const [boardType, setType] = useState<BoardType>('FREE');

  useEffect(() => {
    if (data) {
      setTitle(data.bTitle);
      setContent(data.bContent);
      setType(data.boardType);
    }
  }, [data]);

  if (!data) return <main style={{padding:24}}>로딩...</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>수정</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await update.mutateAsync({ bno: id, bTitle, bContent, boardType });
          router.push(`/board/${id}`);
        }}
      >
        <input value={bTitle} onChange={(e) => setTitle(e.target.value)} /><br/>
        <select value={boardType} onChange={(e) => setType(e.target.value as BoardType)}>
          <option value="NOTICE">공지</option>
          <option value="FAQ">FAQ</option>
          <option value="FREE">자유</option>
          <option value="QNA">고객소리함</option>
          <option value="REVIEW">리뷰</option>
          <option value="EVENT">이벤트</option>
        </select><br/>
        <textarea rows={8} value={bContent} onChange={(e) => setContent(e.target.value)} /><br/>
        <button type="submit" disabled={update.isPending}>
          {update.isPending ? '수정 중...' : '저장'}
        </button>
      </form>
    </main>
  );
}
