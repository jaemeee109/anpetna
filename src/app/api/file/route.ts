// src/app/api/file/route.ts
import type { NextRequest } from 'next/server';

/**
 * 이미지/파일 프록시
 * - ?u= 원본 파일 절대 URL (필수)
 * - ?t= accessToken (Bearer 없이 원문 토큰 값; 있으면 Authorization으로 붙여 전송)
 * - 쿠키/요청헤더의 Authorization도 자동 사용
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get('u');
  if (!u) return new Response('Missing parameter: u', { status: 400 });

  let target: URL;
  try {
    target = new URL(u+'/');
  } catch {
    return new Response('Invalid URL', { status: 400 });
  }

  // 원서버로 전달할 헤더 구성
  const h = new Headers();
  h.set('Accept', '*/*');

  // 1) Authorization 소스: ?t → 쿠키 → 원요청 헤더
  const tokenQ =
    req.nextUrl.searchParams.get('t') ||
    req.nextUrl.searchParams.get('token') ||
    '';
  const cookieAuth = req.cookies.get('Authorization')?.value || '';
  const headerAuth = req.headers.get('authorization') || '';

  const bearer = tokenQ || cookieAuth || headerAuth;
  if (bearer) {
    h.set('Authorization', bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`);
  }

  // 2) 세션형 백엔드 대응: 클라이언트의 Cookie도 함께 전달
  const incomingCookie = req.headers.get('cookie');
  if (incomingCookie) h.set('Cookie', incomingCookie);

  // 3) 원 서버로 프록시
  const resp = await fetch(target.toString(), {
    headers: h,
    credentials: 'include',
    cache: 'no-store',
  });

  // 4) 컨텐츠 헤더 패스스루
  const pass = new Headers();
  pass.set('Content-Type', resp.headers.get('content-type') || 'application/octet-stream');
  pass.set('Cache-Control', resp.headers.get('cache-control') || 'private, max-age=600');
  const disp = resp.headers.get('content-disposition');
  if (disp) pass.set('Content-Disposition', disp);

  return new Response(resp.body, { status: resp.status, headers: pass });
}
