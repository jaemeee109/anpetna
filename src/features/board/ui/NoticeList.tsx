"use client";
import Link from "next/link";

type Props = {
  type: string; page: number; size: number; total: number; items: any[]; isLoading: boolean;
};

export function NoticeList({ type, page, size, total, items, isLoading }: Props) {
  // 테마색(헤더 3D에 사용)
  const THEME = "#FFE2E8";

  return (
   // 섹션 시작 줄만 바꾸기: board-box 클래스 추가(전역 스타일 스코프용)
<section className="mx-auto w-full max-w-[960px] px-4 space-y-6">
<div className="overflow-x-auto board-box">
    <table className="w-full table-fixed border-collapse">
      <colgroup>
        {[
          <col key="no" style={{ width: 64 }} />,
          <col key="title" />,
          <col key="writer" style={{ width: 200 }} />,
          <col key="date" style={{ width: 140 }} />,
        ]}
      </colgroup>

      {/* 헤더: 검정/일반 굵기 + 3D + 여백 조절 */}
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
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
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
          : items.map((b: any, idx: number) => {
              const rowNo = total - ((page - 1) * size + idx);
              const pinned = !!(b.noticeFlag || b.topFix || b.isPinned || b.pinYn === "Y");
              return (
                <tr key={b.bno} className="text-sm border-b" style={{ borderColor: "#E5E7EB" }}>
                  <td className="px-4 py-[12px] text-center tabular-nums">
                    {pinned ? (
                      <span className="inline-flex h-5 items-center justify-center rounded border px-2 text-[11px] font-semibold">P</span>
                    ) : rowNo}
                  </td>
                  <td className="px-4 py-[12px]">
                    {/* 2,3) 제목: 검정/밑줄 없음 — 전역이 덮어써도 이김(아래 globals.css 참조) */}
                    <Link href={`/board/${type}/${b.bno}`} title={b.btitle} className="block truncate board-link">
                      {b.btitle}
                    </Link>
                  </td>
                  <td className="px-4 py-[12px] text-center whitespace-nowrap text-gray-900">{b.bwriter ?? "익명"}</td>
                  <td className="px-4 py-[12px] text-center tabular-nums whitespace-nowrap text-gray-900">{formatYMD(b.createDate)}</td>
                </tr>
              );
            })}
      </tbody>
    </table>
  </div>

  {/* 5) 글쓰기 위·아래 여백: mt 값으로 조절 (여기선 20px) */}
  <div className="flex justify-end" style={{ marginTop: 24 }}>
     <a href={`/board/${type}/new`} className="btn-3d btn-white no-underline">글쓰기</a>
  </div>
</section>

  );
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
