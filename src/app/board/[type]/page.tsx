"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useBoardList } from "@/features/board/hooks/useBoards";
import { BoardViewSwitcher } from "@/features/board/ui/BoardViewSwitcher";

const PAGE_SIZE = 10;
const WRAP = "mx-auto w-full max-w-[960px] px-4";

export default function BoardListPage({
  params,
}: { params: Promise<{ type: string }> }) {
  const { type } = use(params);

  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") ?? "1");
  const keyword = search.get("q") ?? "";

  const { data, isLoading, error } = useBoardList(page, PAGE_SIZE, type, keyword);

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") || "");
    router.push(`/board/${type}?page=1&q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      {/* 검색바 */}
      <div className={`${WRAP} search-bar`}>
        <form
          onSubmit={onSearchSubmit}
          className="flex justify-end gap-3"
          style={{ marginTop: 30,marginBottom: 14, gap: 5 }} // 헤더와 간격
        >
          <input
            name="q"
            defaultValue={keyword}
            placeholder=" 입력해주세요 (ㅇㅅㅇ) "
            className="search-input h-9 w-64 rounded-md px-3 text-sm placeholder:text-gray-400 bg-white"
          />
          <button type="submit" className="btn-3d btn-white">검색</button>
        </form>
      </div>

      {/* 리스트 */}
      {isLoading && <div className={WRAP}>로딩중…</div>}
      {error && <div className={WRAP}>에러가 발생했습니다.</div>}
      <BoardViewSwitcher
        type={type}
        page={page}
        size={PAGE_SIZE}
        total={data?.total ?? 0}
        items={data?.dtoList ?? []}
        isLoading={isLoading}
      />

      {/* 페이징 */}
      <div className={`${WRAP} flex justify-center`} style={{ marginTop: 16, marginBottom: 64 }}>
        <Pagination
          current={page}
          total={data?.total ?? 0}
          size={PAGE_SIZE}
          onPage={(p) => {
            const qs = new URLSearchParams();
            qs.set("page", String(p));
            if (keyword) qs.set("q", keyword);
            router.push(`/board/${type}?${qs.toString()}`);
          }}
        />
      </div>
    </>
  );
}

function Pagination({
  current, total, size, onPage,
}: { current:number; total:number; size:number; onPage:(p:number)=>void }) {
  const last  = Math.max(1, Math.ceil(total / size));
  const start = Math.max(1, Math.min(current - 5, Math.max(1, last - 9)));
  const pages = Array.from({ length: Math.min(10, last - start + 1) }, (_, i) => start + i);

  return (
    <nav aria-label="pagination" className="flex items-center justify-center my-4" style={{ columnGap: 10 }}>
      <button type="button" onClick={() => onPage(Math.max(1, current - 1))} className="btn-3d btn-white" style={{ marginRight: 10 }}>
        이전
      </button>

      <ul className="list-none p-0 m-0 flex items-center" style={{ columnGap: 8 }}>
        {pages.map((p) => (
          <li key={p}>
            <button
              type="button"
              onClick={() => onPage(p)}
              className="bg-transparent text-sm"
              style={{ padding: "2px 4px", margin: "0 2px", border: "none", cursor: "pointer" }}
            >
              <span className={p === current ? "font-semibold text-black" : "text-gray-700"}>{p}</span>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => onPage(Math.min(last, current + 1))} className="btn-3d btn-white" style={{ marginLeft: 10 }}>
        다음
      </button>
    </nav>
  );
}
