// /shared/ui/BoardTitle.tsx (새 파일)
export const boardTitleMap: Record<string, string> = {
  NOTICE: "공지사항",
  FREE: "자유게시판",
};
export function BoardTitle({ type }: { type?: string }) {
  return (
    <h1 className="text-xl font-semibold text-center">
      {boardTitleMap[type?.toUpperCase() ?? ""] ?? type}
    </h1>
  );
}
