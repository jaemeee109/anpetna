// src/features/board/ui/NoticeList.tsx
"use client";
import Link from "next/link";

type Props = {
  type: string; page: number; size: number; total: number; items: any[]; isLoading: boolean;
};

/* ===== 권한 판별 유틸 (파일 내부 정의) ===== */
function decodeJwt(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return null; }
}
function payloadHasAdmin(p: any): boolean {
  if (!p) return false;
  const bag: string[] = [];
  const push = (v?: string | string[]) => {
    if (!v) return;
    if (Array.isArray(v)) bag.push(...v);
    else bag.push(v);
  };
  push(p.role); push(p.roles); push(p.authorities); push(p.auth); push(p.memberRole);
  return bag.map(s => String(s).toUpperCase()).some(s => s.includes("ROLE_ADMIN") || s === "ADMIN");
}
function isAuthedClient(): boolean {
  try {
    return !!(
      (typeof window !== "undefined" && (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))) ||
      (typeof document !== "undefined" && document.cookie.includes("Authorization="))
    );
  } catch { return false; }
}
function isAdminClient(): boolean {
  try {
    const stored = (typeof window !== "undefined" && localStorage.getItem("memberRole")) || "";
    if (String(stored).toUpperCase().includes("ADMIN")) return true;
    const tok =
      (typeof window !== "undefined" &&
        (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))) || "";
    const p = decodeJwt(tok);
    return payloadHasAdmin(p);
  } catch { return false; }
}

/* ===== 기존 렌더 유틸 (원본 유지) ===== */
function pickBno(b: any): number | null {
  const keys = ["bno", "bNo", "id", "boardId", "boardNo", "no", "seq"];
  for (const k of keys) {
    const v = (b as any)?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
function formatYMD(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(+d)) return String(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}. ${m}. ${da}`;
}

export function NoticeList({ type, page, size, total, items, isLoading }: Props) {
  const upperType = String(type || "").toUpperCase();
  const canWrite =
    upperType === "NOTICE"
      ? isAdminClient()                  // NOTICE: 관리자만
      : upperType === "FREE"
      ? isAuthedClient()                 // FREE: 로그인 사용자
      : isAdminClient();                 // 그 외: 기본 관리자만 (기존 정책과 충돌 없게)

  return (
    <section className="mx-auto w-full max-w-[960px] px-4 space-y-6">
      <div className="overflow-x-auto board-box">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            {[<col key="no" style={{ width: 64 }} />,
              <col key="title" />,
              <col key="writer" style={{ width: 200 }} />,
              <col key="date" style={{ width: 140 }} />]}
          </colgroup>

          <thead
            className="text-xs text-black"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #ffffff 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 #E5E7EB",
            }}
          >
            <tr>
              {[
                <th key="no"     className="px-4 py-[10px] text-center font-normal">#</th>,
                <th key="title"  className="px-4 py-[10px] text-left   font-normal">제목</th>,
                <th key="writer" className="px-4 py-[10px] text-center font-normal">작성자</th>,
                <th key="date"   className="px-4 py-[10px] text-center font-normal">등록일</th>,
              ]}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b" style={{ borderColor: "#E5E7EB" }}>
                  <td className="px-4 py-[12px] text-center">
                    <span className="block h-4 w-10 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px]">
                    <span className="block h-4 w-3/5 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px] text-center">
                    <span className="inline-block h-4 w-24 animate-pulse rounded bg-gray-200" />
                  </td>
                  <td className="px-4 py-[12px] text-center">
                    <span className="inline-block h-4 w-28 animate-pulse rounded bg-gray-200" />
                  </td>
                </tr>
              ))
            ) : (
              (() => {
                const normalized = (Array.isArray(items) ? items : []).map((b: any) => {
                  const pinned = !!(b.noticeFlag || b.topFix || b.isPinned || b.pinYn === "Y");
                  return {
                    raw: b,
                    bno: pickBno(b),
                    title: b.bTitle ?? b.title ?? b.btitle ?? "",
                    writer: b.bWriter ?? b.writer ?? b.bwriter ?? "익명",
                    date: b.createDate ?? b.createdAt ?? b.regDate ?? b.create_date ?? "",
                    pinned,
                  };
                });

                const pinnedList = normalized.filter((n) => n.pinned);
                const normalList = normalized.filter((n) => !n.pinned);
                const ordered = [...pinnedList, ...normalList];

                let nonPinnedSeq = 0;
                const base = (page - 1) * size;

                return ordered.map((n, idx) => {
                  let no: string | number = "*";
                  if (!n.pinned) {
                    const num = total - (base + nonPinnedSeq);
                    no = num > 0 ? num : "";
                    nonPinnedSeq += 1;
                  }

                  const canLink = Number.isFinite(n.bno as any);

                  return (
                    <tr key={(n.bno ?? idx) as number} className="text-sm border-b" style={{ borderColor: "#E5E7EB" }}>
                      <td className="px-4 py-[12px] text-center tabular-nums">
                        {no}
                      </td>
                      <td className="px-4 py-[12px]">
                        {canLink ? (
                          <Link
                            href={`/board/${type}/${n.bno}`}
                            title={n.title}
                            className={`block truncate board-link ${n.pinned ? "font-bold" : ""}`}
                          >
                            {n.title}
                          </Link>
                        ) : (
                          <span className={`block truncate ${n.pinned ? "font-bold" : ""}`}>
                            {n.title}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-[12px] text-center whitespace-nowrap text-gray-900">
                        {n.writer}
                      </td>
                      <td className="px-4 py-[12px] text-center tabular-nums whitespace-nowrap text-gray-900">
                        {formatYMD(n.date)}
                      </td>
                    </tr>
                  );
                });
              })()
            )}
          </tbody>
        </table>
      </div>

      {/* 글쓰기: NOTICE(ADMIN만) / FREE(로그인 사용자) */}
      {canWrite && (
        <div className="flex justify-end" style={{ marginTop: 24 }}>
          <a href={`/board/${type}/new`} className="btn-3d btn-white no-underline">글쓰기</a>
        </div>
      )}
    </section>
  );
}
