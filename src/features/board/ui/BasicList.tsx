// src/features/board/ui/BasicList.tsx
"use client";

type Props = {
  type: string;
  page: number;
  size: number;
  total: number;
  items: any[];
  isLoading: boolean;
};

export function BasicList({ type, page, size, total, items, isLoading }: Props) {
  if (isLoading) return <div>로딩중…</div>;
  if (!items?.length) return <div className="text-gray-500">게시글이 없습니다</div>;

  // ✅ 고정글 우선 정렬 + 제목 굵게 + 번호는 "*" (여기선 번호 칸 없으므로 제목 앞에 표시 선택)
  const normalized = items.map((b: any) => {
    const pinned = !!(b.noticeFlag || b.topFix || b.isPinned || b.pinYn === "Y");
    return {
      raw: b,
      bno: b.bno ?? b.id,
      title: b.bTitle ?? b.title ?? b.btitle ?? "",
      writer: b.bWriter ?? b.writer ?? b.bwriter ?? "익명",
      date: b.createDate ?? b.createdAt ?? b.regDate ?? "",
      pinned,
    };
  });

  const pinnedList = normalized.filter((n) => n.pinned);
  const normalList = normalized.filter((n) => !n.pinned);
  const ordered = [...pinnedList, ...normalList];

  return (
    <ul className="divide-y">
      {ordered.map((n) => (
        <li key={n.bno} className="py-3">
          <a
            href={`/board/${type}/${n.bno}`}
            className={`hover:underline ${n.pinned ? "font-bold" : ""}`}
          >
            {/* 번호 칸이 없는 단순 리스트이므로, 고정글 표시를 앞에 붙일지 말지는 선택사항 */}
            {n.pinned ? "＊ " : ""}
            {n.title}
          </a>
          <div className="text-sm text-gray-500">
            {n.writer} · {new Date(n.date).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
