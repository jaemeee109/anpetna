"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useBoardDetail, useUpdateBoard } from "@/features/board/hooks/useBoards";

export default function BoardEditPage({
  params,
}: {
  params: Promise<{ type: string; bno: string }>;
}) {
  const { type, bno } = React.use(params);
  const id = Number(bno);
  const router = useRouter();

  // 기존 글 불러오기
  const { data: board, isLoading, error } = useBoardDetail(id);

  // 수정 뮤테이션
  const updateMut = useUpdateBoard();

  // 폼 state (기본값은 서버 데이터로 채움)
  const [writer, setWriter] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");

  // 서버 데이터 들어오면 1회 반영
  React.useEffect(() => {
    if (!board) return;
    setWriter(
      (board as any).bWriter ??
      (board as any).writer ??
      (board as any).bwriter ??
      ""
    );
    setTitle(
      (board as any).bTitle ??
      (board as any).title ??
      (board as any).btitle ??
      ""
    );
    setContent(
      (board as any).bContent ??
      (board as any).content ??
      (board as any).bcontent ??
      ""
    );
  }, [board]);

  if (isLoading) return <div>로딩중…</div>;
  if (error || !board) return <div>글을 불러오지 못했어요.</div>;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 백엔드 UpdateBoardReq에 맞춘 페이로드
    updateMut.mutate(
      {
        bno: id,
        // 키 호환(대/소문자 혼용 대비)
        bWriter: writer,
        bTitle: title,
        bContent: content,
        // 필요 시 boardType도 같이 보낼 수 있음:
        // boardType: (type || "").toUpperCase(),
      } as any,
      {
        onSuccess: () => {
          alert("수정되었습니다.");
          router.push(`/board/${type}/${bno}`);
        },
        onError: () => {
          alert("수정 실패… 입력값을 확인해주세요.");
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">글 수정</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* 작성자: 읽기 전용 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">작성자</label>
          <input
            className="border px-3 py-2 rounded w-full bg-gray-100"
            value={writer}
            readOnly
          />
        </div>

        {/* 제목 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">제목</label>
          <input
            className="border px-3 py-2 rounded w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력하세요"
            required
          />
        </div>

        {/* 내용 */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">내용</label>
          <textarea
            className="border px-3 py-2 rounded w-full h-60"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            required
          />
        </div>

        <div className="flex gap-2">
          <button
            className="px-4 py-2 rounded bg-black text-white"
            disabled={updateMut.isPending}
          >
            {updateMut.isPending ? "저장 중..." : "저장"}
          </button>
          <Link href={`/board/${type}/${bno}`} className="px-4 py-2 rounded border">
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
