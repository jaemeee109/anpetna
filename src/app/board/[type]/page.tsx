"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBoardList } from "@/features/board/hooks/useBoards";
import { BoardViewSwitcher } from "@/features/board/ui/BoardViewSwitcher";

// ...기존 import 동일 (단, Pagination 임포트는 제거!)

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

  /** === 여기 숫자만 바꾸면 한 번에 몇 개 보여줄지 조절 === */
  const groupSize = 5; // ← 5개씩 노출 (원하면 7, 10 등으로 변경)

  // 현재 페이지가 속한 그룹 계산 (1~5 / 6~10 / 11~15 …)
  const currentGroup = Math.floor((cur - 1) / groupSize);
  const startPage = currentGroup * groupSize + 1;
  const endPage = Math.min(startPage + groupSize - 1, totalPages);

  /** 페이지 번호 목록 */
  const pages: number[] = [];
  for (let p = startPage; p <= endPage; p++) pages.push(p);

  /** === 스타일/간격 조절 포인트 === */
  const BTN = "btn-3d btn-white px-3 py-1 text-xs no-underline";
  const DISABLED = "opacity-60 cursor-not-allowed";
  const ACTIVE_NUM = "font-bold text-black"; // 현재 페이지 번호 강조 텍스트

  // 버튼/번호 전체 간격: gap-[n]
  const WRAP_GAP = "gap-[6px]"; // ← 버튼과 번호 그룹 사이 전체 좌우 여백
  // 번호끼리 간격: gap-[n]
  const NUM_GAP = "gap-[6px]";  // ← 페이지 번호들 사이 여백
  // 버튼과 번호 그룹 사이 추가 여백(양옆): mx-[n]
  const NUM_SIDE_MARGIN = "mx-[10px]";

  return (
    <nav className={`flex items-center justify-center ${WRAP_GAP}`}>
      {/* 처음 / 이전 그룹 이동 (그룹 단위로 점프) */}
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

      {/* 페이지 번호 (텍스트) */}
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

      {/* 다음 / 마지막 그룹 이동 */}
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

export default function BoardListPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = use(params);
  const boardType = (type || "").toUpperCase();

  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") ?? "1");
  const keyword = search.get("q") ?? "";

  const { data, isLoading, error } = useBoardList(
    page,
    PAGE_SIZE,
    type,
    keyword
  );

  // ✅ 디버그(그대로 둬도 무방)
  if (typeof window !== "undefined") {
    console.log("[BoardList] type:", boardType);
    console.log("[BoardList] raw data:", data);
    console.log("[BoardList] error:", error);
  }

  // ✅ 안전 매핑
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

  // ✅ 임시 응급패치: 프론트에서 타입 필터
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

      {/* ▼▼▼ 하단 페이징: 원래 자리 유지, 스타일만 btn-3d/btn-white로 통일 ▼▼▼ */}
      <div
        className={`${WRAP} flex justify-center`}
        style={{ marginTop: 16, marginBottom: 64 }}
      >
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
