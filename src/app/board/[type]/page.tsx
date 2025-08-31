// src/app/board/[type]/page.tsx
"use client";

import { use } from "react";
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

  const groupSize = 5; // 한 번에 보여줄 번호 개수
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

export default function BoardListPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  // ✅ Next.js 15: params Promise 언래핑
  const { type } = use(params);
  const boardType = (type || "").toUpperCase();

  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") ?? "1");
  const keyword = search.get("q") ?? "";

  // ✅ useBoardList는 객체 인자 하나로 호출
  const { data, isLoading, error } = useBoardList({
    page,
    size: PAGE_SIZE,
    type: boardType, // 훅에서 boardType으로 매핑됨
    keyword: keyword || undefined, // 빈 문자열이면 전달하지 않도록 방어
  });

  // 디버그
  if (typeof window !== "undefined") {
    console.log("[BoardList] type:", boardType);
    console.log("[BoardList] raw data:", data);
    console.log("[BoardList] error:", error);
  }

  // ====== 응답 포맷 편차 흡수 유틸 ======
  const pickArray = (v: any): any[] => (Array.isArray(v) ? v : v === null ? [] : []);
  const pickNumber = (v: any): number =>
    typeof v === "number" && Number.isFinite(v) ? v : 0;

  // ✅ 안전 매핑 (백엔드 응답 케이스 총망라: null → [] 처리)
  const rawItems =
    pickArray((data as any)?.dtoList) ||
    pickArray((data as any)?.page?.dtoList) ||
    pickArray((data as any)?.result?.dtoList) ||
    pickArray((data as any)?.result?.page?.dtoList) ||
    pickArray((data as any)?.list) ||
    pickArray((data as any)?.content);

  // ✅ 프런트에서 타입 필터 (혹시 다른 타입이 섞여 들어올 경우 대비)
  const safeItems = rawItems.filter((it: any) => {
    const t = (it?.boardType ?? it?.type ?? "").toUpperCase();
    return !boardType || t === boardType;
  });

  // ✅ total 값도 관대하게 해석 (없거나 0이면 아이템 길이로 대체)
  const reportedTotal =
    pickNumber((data as any)?.total) ||
    pickNumber((data as any)?.page?.total) ||
    pickNumber((data as any)?.result?.total) ||
    pickNumber((data as any)?.page?.totalElements) ||
    pickNumber((data as any)?.result?.page?.total) ||
    pickNumber((data as any)?.result?.page?.totalElements);

  const safeTotal = reportedTotal > 0 ? reportedTotal : safeItems.length;

  // ✅ 공지(noticeFlag) 우선 정렬 + 공지는 번호를 '*' 로 가공 (UI 구조 변경 없음)
  const itemsSorted = [...safeItems]
    .sort((a: any, b: any) => {
      const an = a?.noticeFlag ? 1 : 0;
      const bn = b?.noticeFlag ? 1 : 0;
      if (an !== bn) return bn - an; // 공지 먼저
      // 나머지는 bno 내림차순(최신 추정)
      return (b?.bno ?? 0) - (a?.bno ?? 0);
    })
    .map((it: any) => ({
      ...it,
      bno: it?.noticeFlag ? "*" : it?.bno,
    }));

  if (error) return <div className={WRAP}>에러가 발생했어요</div>;

  return (
    <section className={WRAP}>
      <BoardViewSwitcher
        type={boardType}
        page={page}
        size={PAGE_SIZE}
        total={safeTotal}
        items={itemsSorted}
        isLoading={isLoading}
      />

      {/* 하단 페이징 (UI 유지) */}
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
            router.push(`/board/${boardType}?${qs.toString()}`);
          }}
        />
      </div>
    </section>
  );
}
