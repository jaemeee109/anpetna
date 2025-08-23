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
  switch (props.type) {
    case "NOTICE":
      return <NoticeList {...props} />;
    // 나중에 FREE/QNA/FAQ 전용 컴포넌트 만들면 여기 분기만 추가
    default:
      return <BasicList {...props} />; // 임시 기본 스타일
  }
}
