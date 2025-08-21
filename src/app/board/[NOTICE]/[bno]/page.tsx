'use client';

import { useParams, useRouter } from 'next/navigation';
import { useBoardDetail, useBoardMutations } from '@/features/board/app/useBoards';

export default function BoardDetailPage() {
  const { bno } = useParams<{ bno: string }>();
  const id = Number(bno);
  const router = useRouter();

  const { data, isLoading, error } = useBoardDetail(id);
  const { remove, like } = useBoardMutations();

  if (isLoading) return <main style={{padding:24}}>로딩...</main>;
  if (error || !data) return <main style={{padding:24}}>글을 불러오지 못했어요</main>;

  return (
    <main style={{ padding: 24 }}>
      <h1>{data.bTitle}</h1>
      <div>작성자: {data.bWriter}</div>
      <div>작성일: {new Date(data.createDate).toLocaleString()}</div>
      <div style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{data.bContent}</div>

      {data.imageUrls?.length ? (
        <div style={{ marginTop: 12 }}>
          {data.imageUrls.map((url) => (
            <img key={url} src={url} alt="" style={{ maxWidth: 400, display: 'block', marginBottom: 8 }} />
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <button onClick={() => like.mutate(id)} disabled={like.isPending}>
          {like.isPending ? '좋아요 중...' : `좋아요 (${data.bLikeCount})`}
        </button>
        <button
          style={{ marginLeft: 8 }}
          onClick={async () => {
            if (!confirm('삭제할까요?')) return;
            await remove.mutateAsync(id);
            router.push('/board');
          }}
          disabled={remove.isPending}
        >
          삭제
        </button>
        <a style={{ marginLeft: 8 }} href={`/board/${id}/edit`}>수정</a>
      </div>
    </main>
  );
}
