"use client";

import { useEffect } from "react";

type Props = {
  current: number;  // 1-base
  total: number;
  size: number;
  onPage: (page: number) => void;
  className?: string;
};

export function Pagination({ current, total, size, onPage, className = "" }: Props) {
  useEffect(() => {
    // 브라우저 콘솔에서 이 로그가 보여야 **정확히 이 파일**이 쓰이는 것
    console.debug("[Pagination] v2 mounted");
  }, []);

  const totalPages = Math.max(1, Math.ceil((total ?? 0) / Math.max(1, size)));
  const cur = Math.min(Math.max(1, current || 1), totalPages);

  const goto = (p: number) => {
    const page = Math.min(Math.max(1, p), totalPages);
    if (page !== cur) onPage(page);
  };

  const pages: number[] = [];
  const start = Math.max(1, cur - 2);
  const end = Math.min(totalPages, cur + 2);
  for (let p = start; p <= end; p++) pages.push(p);

  // ✅ 전역 CSS가 덮어써도 이기도록 ! 사용
  const BTN =
    "inline-flex items-center rounded !border !border-gray-300 !bg-white !text-gray-900 " +
    "px-3 py-1 text-xs shadow-sm " +
    "hover:!bg-gray-50 hover:shadow-md " +
    "active:translate-y-[1px] active:shadow-none " +
    "focus:outline-none focus:ring-0";
  const BTN_DISABLED = "opacity-60 cursor-not-allowed";
  const BTN_ACTIVE = "!border-gray-400 shadow-md"; // 현재 페이지 강조

  return (
    <nav className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        type="button"
        className={`${BTN} ${cur === 1 ? BTN_DISABLED : ""}`}
        onClick={() => goto(1)}
        disabled={cur === 1}
      >
        처음
      </button>
      <button
        type="button"
        className={`${BTN} ${cur === 1 ? BTN_DISABLED : ""}`}
        onClick={() => goto(cur - 1)}
        disabled={cur === 1}
      >
        이전
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => goto(p)}
          className={`${BTN} ${p === cur ? BTN_ACTIVE : ""}`}
          aria-current={p === cur ? "page" : undefined}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        className={`${BTN} ${cur === totalPages ? BTN_DISABLED : ""}`}
        onClick={() => goto(cur + 1)}
        disabled={cur === totalPages}
      >
        다음
      </button>
      <button
        type="button"
        className={`${BTN} ${cur === totalPages ? BTN_DISABLED : ""}`}
        onClick={() => goto(totalPages)}
        disabled={cur === totalPages}
      >
        마지막
      </button>
    </nav>
  );
}
