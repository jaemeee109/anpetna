// features/member/data/session.ts
export async function serverLogout() {
  try {
    const base =
      (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
      (typeof window !== "undefined"
        ? `${location.protocol}//${location.hostname}${
            location.port ? `:${location.port === "3000" ? "8000" : location.port}` : ""
          }`
        : "");
    const prefix = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? "/anpetna";
    const url = `${base}${prefix}/jwt/logout`;

    await fetch(url, {
      method: "POST",
      credentials: "include", // 서버가 쿠키/리프레시토큰으로 식별 → include 필요
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // 서버 통보 실패해도 클라 정리는 계속 진행
  }
}

function deleteCookieEverywhere(name: string) {
  if (typeof document === "undefined") return;
  const host = location.hostname;
  const domains = [undefined, host, `.${host}`];
  const paths = ["/", "/anpetna"]; // 서버가 Path=/anpetna 로 설정했을 가능성 대비
  for (const d of domains) {
    for (const p of paths) {
      document.cookie =
        `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Path=${p}` +
        (d ? `; Domain=${d}` : "");
    }
  }
}

export function purgeAuthArtifacts() {
  try {
    localStorage.removeItem("accessToken");
  } catch {}
  // 서버/환경에 따라 이름이 다를 수 있으므로 후보 전부 제거
  ["accessToken", "refreshToken", "JSESSIONID", "Authorization", "AUTH"].forEach(deleteCookieEverywhere);
}
