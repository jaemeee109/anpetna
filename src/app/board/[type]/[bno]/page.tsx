// src/app/board/[type]/page.tsx
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useBoardList } from "@/features/board/hooks/useBoards";
import { BoardViewSwitcher } from "@/features/board/ui/BoardViewSwitcher";

const PAGE_SIZE = 10;
const WRAP = "mx-auto w-full max-w-[960px] px-4";

/** ★ 로컬 페이징 (번호 5개씩, 번호는 텍스트 / 앞뒤는 버튼) */
function Pager({
  current,
  total,
  size,
  onPage,
}: {
  current: number;
  total: number;
  size: number;
  onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / Math.max(1, size)));
  const cur = Math.min(Math.max(1, current || 1), totalPages);

  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), totalPages);
    if (page !== cur) onPage(page);
  };

  const groupSize = 5;
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, totalPages);

  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  const BTN = "btn-3d btn-white px-3 py-1 text-xs no-underline";
  const DISABLED = "opacity-60 cursor-not-allowed";
  const ACTIVE_NUM = "font-bold text-black";

  const WRAP_GAP = "gap-[6px]";
  const NUM_GAP = "gap-[6px]";
  const NUM_SIDE_MARGIN = "mx-[10px]";

  return (
    <nav className={`flex items-center justify-center ${WRAP_GAP}`}>
      <button
        type="button"
        className={`${BTN} ${startPage === 1 ? DISABLED : ""}`}
        onClick={() => goto(1)}
        disabled={startPage === 1}
      >
        처음
      </button>
      <button
        type="button"
        className={`${BTN} ${startPage === 1 ? DISABLED : ""}`}
        onClick={() => goto(startPage - 1)}
        disabled={startPage === 1}
      >
        이전
      </button>

      <div className={`flex ${NUM_GAP} ${NUM_SIDE_MARGIN}`}>
        {pages.map((p) =>
          p === cur ? (
            <span key={p} className={ACTIVE_NUM} aria-current="page">
              {p}
            </span>
          ) : (
            <span
              key={p}
              onClick={() => goto(p)}
              className="cursor-pointer text-gray-600 hover:text-black"
            >
              {p}
            </span>
          )
        )}
      </div>

      <button
        type="button"
        className={`${BTN} ${endPage === totalPages ? DISABLED : ""}`}
        onClick={() => goto(endPage + 1)}
        disabled={endPage === totalPages}
      >
        다음
      </button>
      <button
        type="button"
        className={`${BTN} ${endPage === totalPages ? DISABLED : ""}`}
        onClick={() => goto(totalPages)}
        disabled={endPage === totalPages}
      >
        마지막
      </button>
    </nav>
  );
}

export default function BoardListPage({ params }: { params: { type: string } }) {
  const { type } = params; // 클라 컴포넌트에서는 Promise 아님
  const boardType = (type || "").toUpperCase();

  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") ?? "1");
  const keyword = search.get("q") ?? "";

  // ✅ 훅이 객체 인자를 받도록 호출(시그니처 불일치로 뜨던 빨간줄 제거)
  const { data, isLoading, error } = (useBoardList as any)({
    page,
    size: PAGE_SIZE,
    boardType,      // 서버에 NOTICE/FREE/QNA/FAQ로 보낼 값
    keyword,
  });

  if (typeof window !== "undefined") {
    console.log("[BoardList] type:", boardType);
    console.log("[BoardList] raw data:", data);
    console.log("[BoardList] error:", error);
  }

  const rawItems =
    (data as any)?.dtoList ??
    (data as any)?.page?.dtoList ??
    (data as any)?.result?.dtoList ??
    [];

  const safeTotal =
    (data as any)?.total ??
    (data as any)?.page?.total ??
    (data as any)?.result?.total ??
    0;

  // 임시 필터(백엔드 boardType 잘 들어오면 제거 가능)
  const safeItems = Array.isArray(rawItems)
    ? rawItems.filter((it: any) => {
        const t = (it.boardType ?? it.type ?? "").toUpperCase();
        return !boardType || t === boardType;
      })
    : [];

  if (error) return <div className={WRAP}>에러가 발생했어요</div>;

  return (
    <section className={WRAP}>
      <BoardViewSwitcher
        type={boardType}
        page={page}
        size={PAGE_SIZE}
        total={safeTotal}
        items={safeItems}
        isLoading={isLoading}
      />

      <div className={`${WRAP} flex justify-center`} style={{ marginTop: 16, marginBottom: 64 }}>
        <Pager
          current={page}
          total={safeTotal}
          size={PAGE_SIZE}
          onPage={(p) => {
            const qs = new URLSearchParams();
            qs.set("page", String(p));
            if (keyword) qs.set("q", keyword);
            router.push(`/board/${type}?${qs.toString()}`);
          }}
        />
      </div>
    </section>
  );
}
