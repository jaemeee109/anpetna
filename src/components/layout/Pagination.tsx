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

  const BTN =
    "btn-3d btn-white text-xs";
  const BTN_DISABLED = "opacity-60 cursor-not-allowed";

  return (
    <nav className={`flex items-center justify-center gap-3 ${className}`}>
      {/* 처음 / 이전 */}
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

      {/* 숫자 페이지 (텍스트 전용) */}
      <div className="flex items-center gap-4">
        {pages.map((p) => (
          <span
            key={p}
            onClick={() => goto(p)}
            className={`cursor-pointer select-none transition mr-[10px] ml-[10px] mx-[3px] ${
              p === cur
                ? "font-bold text-black text-base"
                : "text-gray-500 text-sm hover:text-black"
            }`}
          >
            {p}
          </span>
        ))}
      </div>

      {/* 다음 / 마지막 */}
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
