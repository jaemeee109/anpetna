import { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/file?u=<absolute_backend_url>
 * - 클라이언트 이미지는 이 프록시를 통해 요청
 * - 요청 쿠키의 Authorization 값을 Authorization 헤더로 변환해 백엔드로 전달
 * - 기타 쿠키도 그대로 전달(필요시 세션용)
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u");
  if (!u) return new Response("Missing `u`", { status: 400 });

  // 원 요청의 Cookie 전체와 Authorization 쿠키 추출
  const cookieHeader = req.headers.get("cookie") ?? "";
  const jar = cookies();
  const authCookie = jar.get("Authorization")?.value ?? "";
  // 백엔드로 전달할 헤더 구성
  const headers: Record<string, string> = {
    // 세션성 쿠키도 그대로 전달
    cookie: cookieHeader,
  };

  // Authorization 쿠키가 있으면 Authorization 헤더로 변환
  if (authCookie) {
    // 쿠키 값이 "Bearer xxx" 형태가 아닐 수도 있어 안전하게 보정
    const token = decodeURIComponent(authCookie);
    headers["Authorization"] = token.startsWith("Bearer ")
      ? token
      : `Bearer ${token}`;
  }

  // 백엔드로 프록시
  const r = await fetch(u, {
    // Next의 fetch는 Node 환경이므로 credentials 옵션은 무시됨 -> cookie 헤더로 전달
    headers,
    cache: "no-store",
  });

  // 응답 스트림을 그대로 전달 (콘텐츠 타입 보존)
  const resHeaders = new Headers();
  const ct = r.headers.get("content-type");
  if (ct) resHeaders.set("content-type", ct);
  // 이미지는 캐시 안 하도록
  resHeaders.set("cache-control", "no-store");

  return new Response(r.body, {
    status: r.status,
    statusText: r.statusText,
    headers: resHeaders,
  });
}
