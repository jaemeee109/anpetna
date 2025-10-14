//src/features/board/ui/BoardViewSwitcher.tsx
"use client";

import { NoticeList } from "./NoticeList";
import { BasicList } from "./BasicList";

type Props = {
  type: string;
  page: number;
  size: number;
  total: number;
  items: any[];
  isLoading: boolean;
};

export function BoardViewSwitcher(props: Props) {
  // ✅ 대문자로 정규화해서 분기 누락 방지
  const t = (props.type || "").toUpperCase();


  
  // ✅ 고정글을 최상단으로, 그 다음 bno 내림차순 정렬
  const sortedItems = Array.isArray(props.items)
    ? [...props.items].sort((a: any, b: any) => {
        const an = !!a?.noticeFlag;
        const bn = !!b?.noticeFlag;
        if (an && !bn) return -1;
        if (!an && bn) return 1;
        return (b?.bno ?? 0) - (a?.bno ?? 0);
      })
    : [];

  // ✅ 정렬된 목록만 덮어써서 내려보냄 (UI 컴포넌트는 손대지 않음)
  const pass = { ...props, items: sortedItems };

  switch (t) {
    // ✅ NOTICE와 FREE는 동일한 목록 UI를 사용
    case "NOTICE":
    case "FREE":
      return <NoticeList {...props} />;

    // QNA/FAQ가 아직 별도 컴포넌트 없으면 임시 기본
    case "QNA":
    case "FAQ":
      return <BasicList {...props} />;

    default:
      // 혹시 예상치 못한 타입이 들어와도 기본 UI로 안전 처리
      return <BasicList {...props} />;
  }
}
