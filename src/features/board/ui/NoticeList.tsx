// src/features/board/ui/NoticeList.tsx
"use client";
import Link from "next/link";

type Props = {
  type: string; page: number; size: number; total: number; items: any[]; isLoading: boolean;
};

// 다양한 응답에서 글 ID 후보를 안전하게 추출
function pickBno(b: any): number | null {
  const keys = ["bno", "bNo", "id", "boardId", "boardNo", "no", "seq"];
  for (const k of keys) {
    const v = (b as any)?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function formatYMD(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(+d)) return String(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${da}`;
}

export function NoticeList({ type, page, size, total, items, isLoading }: Props) {
  return (
    <section className="mx-auto w-full max-w-[960px] px-4 space-y-6">
      <div className="overflow-x-auto board-box">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {[<col key="no" style={{ width: 64 }} />,
              <col key="title" />,
              <col key="writer" style={{ width: 200 }} />,
              <col key="date" style={{ width: 140 }} />]}
          </colgroup>

          <thead
            className="text-xs text-black"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ffffff 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 #E5E7EB",
            }}
          >
            <tr>
              {[
                <th key="no"     className="px-4 py-[10px] text-center font-normal">#</th>,
                <th key="title"  className="px-4 py-[10px] text-left   font-normal">제목</th>,
                <th key="writer" className="px-4 py-[10px] text-center font-normal">작성자</th>,
                <th key="date"   className="px-4 py-[10px] text-center font-normal">등록일</th>,
              ]}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "#E5E7EB" }}>
                  <td className="px-4 py-[12px] text-center">
                    <span className="block h-4 w-10 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px]">
                    <span className="block h-4 w-3/5 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px] text-center">
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px] text-center">
                    <span className="inline-block h-4 w-28 animate-pulse rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            ) : (
              (() => {
                // 안전 정규화
                const normalized = (Array.isArray(items) ? items : []).map((b: any) => {
                  const pinned = !!(b.noticeFlag || b.topFix || b.isPinned || b.pinYn === "Y");
                  return {
                    raw: b,
                    bno: pickBno(b), // ← 핵심
                    title: b.bTitle ?? b.title ?? b.btitle ?? "",
                    writer: b.bWriter ?? b.writer ?? b.bwriter ?? "익명",
                    date: b.createDate ?? b.createdAt ?? b.regDate ?? b.create_date ?? "",
                    pinned,
                  };
                });

                // 고정글 먼저
                const pinnedList = normalized.filter((n) => n.pinned);
                const normalList = normalized.filter((n) => !n.pinned);
                const ordered = [...pinnedList, ...normalList];

                // 일반글 역순 번호 계산
                let nonPinnedSeq = 0;
                const base = (page - 1) * size;

                return ordered.map((n, idx) => {
                  // 번호: 고정글은 "*"
                  let no: string | number = "*";
                  if (!n.pinned) {
                    const num = total - (base + nonPinnedSeq);
                    no = num > 0 ? num : "";
                    nonPinnedSeq += 1;
                  }

                  const canLink = Number.isFinite(n.bno as any);

                  return (
                    <tr key={(n.bno ?? idx) as number} className="text-sm border-b" style={{ borderColor: "#E5E7EB" }}>
                      <td className="px-4 py-[12px] text-center tabular-nums">
                        {no}
                      </td>
                      <td className="px-4 py-[12px]">
                        {canLink ? (
                          <Link
                            href={`/board/${type}/${n.bno}`}
                            title={n.title}
                            className={`block truncate board-link ${n.pinned ? "font-bold" : ""}`}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          // ID를 못찾은 예외 레코드: 링크 비활성(형태만 유지)
                          <span className={`block truncate ${n.pinned ? "font-bold" : ""}`}>
                            {n.title}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-[12px] text-center whitespace-nowrap text-gray-900">
                        {n.writer}
                      </td>
                      <td className="px-4 py-[12px] text-center tabular-nums whitespace-nowrap text-gray-900">
                        {formatYMD(n.date)}
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end" style={{ marginTop: 24 }}>
        <a href={`/board/${type}/new`} className="btn-3d btn-white no-underline">글쓰기</a>
      </div>
    </section>
  );
}
