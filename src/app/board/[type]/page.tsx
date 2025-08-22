"use client";

import { use } from "react";                     // ✅ React.use 가 아니라 `use`를 import
import { useSearchParams, useRouter } from "next/navigation";
import { useBoardList } from "@/features/board/hooks/useBoards";

const PAGE_SIZE = 10;

export default function BoardListPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);                  // ✅ Promise 언랩 (Next 15.5 경고 해결)

  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") ?? "1");
  const keyword = search.get("q") ?? "";

  // boardType 으로 라우트의 type(NOTICE/FAQ/...)을 넘김
  const { data, isLoading, error } = useBoardList(page, PAGE_SIZE, type, keyword);

  const onSearch = (formData: FormData) => {
    const q = String(formData.get("q") || "");
    router.push(`/board/${type}?page=1&q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{labelOf(type)} 게시판</h1>

      <form action={onSearch} className="flex gap-2">
        <input name="q" defaultValue={keyword} placeholder="검색어" className="border px-3 py-2 rounded w-64" />
        <button className="px-3 py-2 rounded bg-black text-white">검색</button>
        <a className="ml-auto px-3 py-2 rounded bg-blue-600 text-white" href={`/board/${type}/new`}>
          새 글 쓰기
        </a>
      </form>

      {isLoading && <div>로딩중…</div>}
      {error && <div>에러가 발생했습니다.</div>}

      {data?.dtoList?.length ? (
        <ul className="divide-y">
          {data.dtoList.map((b: any) => (
            <li key={b.bno} className="py-3">
              <a href={`/board/${type}/${b.bno}`} className="hover:underline">
                {b.btitle}
              </a>
              <div className="text-sm text-gray-500">
                {b.bwriter} ·  {new Date(b.createDate).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !isLoading && <div className="text-gray-500">게시글이 없습니다</div>
      )}

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
  );
}

function labelOf(type: string) {
  switch (type) {
    case "NOTICE": return "공지사항";
    case "FAQ":    return "FAQ";
    case "VOICE":  return "고객소리함";
    case "FREE":   return "자유게시판";
    default:       return type;
  }
}

function Pagination({ current, total, size, onPage }:{
  current:number; total:number; size:number; onPage:(p:number)=>void
}) {
  const last  = Math.max(1, Math.ceil(total / size));
  const start = Math.max(1, Math.min(current - 5, Math.max(1, last - 9)));
  const pages = Array.from({ length: Math.min(10, last - start + 1) }, (_, i) => start + i);
  return (
    <div className="flex gap-2 items-center">
      <button onClick={()=>onPage(Math.max(1,current-1))} className="px-3 py-1 border rounded">이전</button>
      {pages.map(p => (
        <button key={p} onClick={()=>onPage(p)} className={`px-3 py-1 border rounded ${p===current?"bg-black text-white":""}`}>{p}</button>
      ))}
      <button onClick={()=>onPage(Math.min(last,current+1))} className="px-3 py-1 border rounded">다음</button>
      <span className="ml-2 text-sm text-gray-500">총 {total}건</span>
    </div>
  );
}
