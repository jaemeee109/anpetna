"use client";

import * as React from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useBoardDetail, useLikeBoard, useRemoveBoard } from "@/features/board/hooks/useBoards";

export default function BoardDetailPage() {
  const router = useRouter();

  // ✅ Next 버전에 따라 제네릭 사용 시 타입에러가 나므로, 캐스팅으로 처리
  const raw = (typeof useParams === "function" ? useParams() : {}) as {
    type?: string;
    bno?: string;
  };

  let type = raw?.type ?? "";
  let bno = raw?.bno ?? "";

  // 🔁 드물게 useParams가 못 잡히는 환경 대비: pathname 분해 백업
  if (!type || !bno) {
    try {
      const pathname = usePathname?.();
      if (pathname) {
        const parts = pathname.split("/").filter(Boolean); // ["board", "{type}", "{bno}"]
        if (parts[0] === "board") {
          type = type || (parts[1] as string);
          bno = bno || (parts[2] as string);
        }
      }
    } catch {}
  }

  const id = Number(bno);

  const { data: board, isLoading, error } = useBoardDetail(id);
  const likeMut = useLikeBoard();
  const removeMut = useRemoveBoard();

  if (!type || !bno || Number.isNaN(id)) {
    return <div className="mx-auto max-w-[960px] px-4">잘못된 경로입니다.</div>;
  }

  if (isLoading) return <div className="mx-auto max-w-[960px] px-4">로딩중…</div>;
  if (error || !board) return <div className="mx-auto max-w-[960px] px-4">글을 불러오지 못했어요.</div>;

  const title = (board as any).bTitle ?? (board as any).title ?? "(제목 없음)";
  const writer = (board as any).bWriter ?? (board as any).writer ?? "-";
  const content = (board as any).bContent ?? (board as any).content ?? "";
  const likeCount = (board as any).bLikeCount ?? (board as any).likeCount ?? 0;
  const images: Array<{ uuid?: number; url?: string; fileName?: string }> = (board as any).images ?? [];

  return (
    <section className="mx-auto w-full max-w-[960px] px-4">
      <h1 className="mt-8 text-2xl font-semibold text-center">{title}</h1>
      <div className="mt-4 mb-4 border-t border-gray-200 px-12" />
      <div className="flex items-center justify-end gap-3 px-12 py-3 text-sm text-gray-600 mb-10">
        <span className="whitespace-nowrap">{writer}</span>
        <button className="btn-3d btn-white" onClick={() => router.push(`/board/${type}/${bno}/edit`)}>
          수정
        </button>
        <button
          className="btn-3d btn-white"
          disabled={removeMut.isPending}
          onClick={() => {
            if (!confirm("정말 삭제하시겠습니까?")) return;
            removeMut.mutate(id, {
              onSuccess: () => {
                alert("삭제되었습니다.");
                router.push(`/board/${type}`);
              },
              onError: () => alert("삭제 실패"),
            });
          }}
        >
          {removeMut.isPending ? "삭제 중..." : "삭제"}
        </button>
      </div>

      <div className="my-16 flex justify-center">
        <article className="w-full max-w-[720px] whitespace-pre-wrap leading-7 text-gray-900 text-center">
          {content}
          {images?.length > 0 && (
            <div className="mt-6 space-y-4">
              {images.map((img, i) =>
                img?.url ? (
                  <img
                    key={img.uuid ?? i}
                    src={img.url}
                    alt={img.fileName ?? `image-${i}`}
                    className="w-full rounded border border-gray-200"
                  />
                ) : null
              )}
            </div>
          )}
        </article>
      </div>

      <div className="flex justify-center mt-10 mb-16">
        <button className="btn-3d btn-white" onClick={() => likeMut.mutate(id)}>
          좋아요 {likeCount}
        </button>
      </div>

      <div className="flex justify-center py-12">
        <button className="btn-3d btn-white mb-16" onClick={() => router.push(`/board/${type}`)}>
          목록으로
        </button>
      </div>
    </section>
  );
}
