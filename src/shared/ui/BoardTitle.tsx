// /shared/ui/BoardTitle.tsx 

/**  게시판 유형 (BoardType)에 따라 자동 표시
* BoardType : NOTICE / FREE  */

// 게시판 종류별 한글 제목 매핑 객체
export const boardTitleMap: Record<string, string> = {
  NOTICE: "공지사항",
  FREE: "자유게시판",
};

// 게시판 제목
export function BoardTitle({ type }: { type?: string }) {
  return (
    <h1 className="text-xl font-semibold text-center">
      {boardTitleMap[type?.toUpperCase() ?? ""] ?? type}
    </h1>
  );
}
