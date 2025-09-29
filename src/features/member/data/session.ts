// src/features/member/data/session.ts
"use client";

import { http } from "@/shared/data/http";
import { withPrefix } from "@/lib/api";

/** 클라이언트 측 토큰/쿠키/스토리지 전부 제거 + 헤더 갱신 이벤트 */
export function purgeAuthArtifacts() {
  try {
    // 1) localStorage / sessionStorage 비우기
    const lsKeys = [
      "accessToken", "access_token", "refreshToken",
      "memberId", "memberRole", "loginId", "username"
    ];
    lsKeys.forEach(k => { try { localStorage.removeItem(k); } catch {} });

    const ssKeys = ["accessToken", "refreshToken"];
    ssKeys.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });

    // 2) 쿠키 제거 (경로 유무 모두 시도)
    const del = (name: string) => {
      try {
        document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
        document.cookie = `${encodeURIComponent(name)}=; Max-Age=0`; // path 명시 없는 쿠키 대비
      } catch {}
    };
    [
      "Authorization", "accessToken", "refreshToken",
      "JSESSIONID", "memberId", "memberRole", "loginId", "username"
    ].forEach(del);

    // 3) 헤더가 즉시 동기화되도록 알림
    window.dispatchEvent(new Event("auth-changed"));
  } catch {}
}



export async function serverLogout() {
  try {
    // 저장 위치는 localStorage 우선, 없으면 빈 문자열
    const refresh = (typeof window !== 'undefined' && localStorage.getItem('refreshToken')) || '';

    await http.post(
      withPrefix("/jwt/logout"),
      { refreshToken: refresh },                  
      { withCredentials: true }
    );
  } catch {
    // 없어도 무시
  } finally {
    purgeAuthArtifacts();
  }
}


