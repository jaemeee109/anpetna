// src/features/member/data/session.ts
"use client";

import { http } from "@/shared/data/http";
import { withPrefix } from "@/lib/api";

/** 클라이언트 측 토큰/쿠키 제거 */
export function purgeAuthArtifacts() {
  try {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = `Authorization=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `refreshToken=; Path=/; Max-Age=0; SameSite=Lax`;
    window.dispatchEvent(new Event("auth-changed"));
  } catch {}
}

/** 서버 로그아웃(있으면) + 로컬 정리 */
export async function serverLogout() {
  try {
    await http.post(withPrefix("/jwt/logout"), null, { withCredentials: true });
  } catch {
    // 없어도 무시
  } finally {
    purgeAuthArtifacts();
  }
}
