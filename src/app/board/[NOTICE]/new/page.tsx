'use client';

import { useState } from 'react';
import { useBoardMutations } from '@/features/board/app/useBoards';

export default function NewBoardPage() {
  const { create } = useBoardMutations();

  const [bWriter, setWriter] = useState('user1'); // 인증 붙이면 서버에서 채우도록 변경
  const [bTitle, setTitle] = useState('');
  const [bContent, setContent] = useState('');
  const [boardType, setType] = useState<'NOTICE'|'FAQ'|'FREE'|'QNA'|'REVIEW'|'EVENT'>('FREE');

  return (
    <main style={{ padding: 24 }}>
      <h1>글쓰기</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await create.mutateAsync({
            bWriter, bTitle, bContent, boardType,
            noticeFlag: false, isSecret: false, imageUrls: [],
          });
          history.back();
        }}
      >
        <input placeholder="작성자" value={bWriter} onChange={(e) => setWriter(e.target.value)} /><br/>
        <input placeholder="제목" value={bTitle} onChange={(e) => setTitle(e.target.value)} /><br/>
        <select value={boardType} onChange={(e) => setType(e.target.value as any)}>
          <option value="NOTICE">공지</option>
          <option value="FAQ">FAQ</option>
          <option value="FREE">자유</option>
          <option value="QNA">고객소리함</option>
          <option value="REVIEW">리뷰</option>
          <option value="EVENT">이벤트</option>
        </select><br/>
        <textarea rows={8} placeholder="내용" value={bContent} onChange={(e) => setContent(e.target.value)} />
        <br/>
        <button type="submit" disabled={create.isPending}>
          {create.isPending ? '저장 중...' : '저장'}
        </button>
      </form>
    </main>
  );
}
