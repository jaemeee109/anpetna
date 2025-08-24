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
