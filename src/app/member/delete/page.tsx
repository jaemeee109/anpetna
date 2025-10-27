// src/app/member/delete/page.tsx
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { purgeAuthArtifacts } from '@/features/member/data/session';


// ===== 공용 유틸 (Login/Info 페이지 톤에 맞춤) =====
async function parseJsonSafe(resp: Response): Promise<any> {
  const text = await resp.text().catch(() => '');
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function authHeaders(base: Record<string, string> = {}) {
  const token = getAccessToken();
  const h: Record<string, string> = { ...base };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

const BASE =
  (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}${
        window.location.port ? `:${window.location.port === '3000' ? '8000' : window.location.port}` : ''
      }`.replace(/:$/, '')
    : '');
const API_PREFIX = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '';
function apiURL(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return new URL(path, BASE+'/').toString();
}

// ===== memberId 해석 (쿼리 → localStorage → cookie → JWT) =====
function decodeJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch { return null; }
}
function resolveMemberId(): string | null {
  const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const qId = search?.get('memberId') || '';
  const ls = typeof window !== 'undefined' ? window.localStorage : null;
  const payload = decodeJwtPayload(getAccessToken());
  return (
    qId || ls?.getItem('memberId') || ls?.getItem('loginId') || ls?.getItem('username') ||
    getCookie('memberId') || payload?.memberId || payload?.username || payload?.sub || null
  );
}

// ===== 본문 컴포넌트 =====
export default function DeleteAccountPage() {
  const router = useRouter();

  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const id = resolveMemberId();
    if (id) setMemberId(id);
  }, []);

  const canSubmit = useMemo(() => !!memberId && !!password && agree && !submitting, [memberId, password, agree, submitting]);

async function onSubmit(e: FormEvent) {
  e.preventDefault();
  if (!canSubmit) return;

  setSubmitting(true);
  setErr(null);
  setOk(null);

  try {
    const url = apiURL(`member/delete`);
    const resp = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ memberId, currentPw: password  }),
    });

    // 401: 토큰만료 로그인 요구
    if (resp.status === 401) {
      const t = await parseJsonSafe(resp);
      alert(t?.resMessage || t?.message || '로그인이 필요합니다. 다시 로그인해 주세요.');
      return;
    }

    // 403: 본인아님
    if (resp.status === 403) {
      const t = await parseJsonSafe(resp);
      alert(t?.resMessage || t?.message || '본인 계정으로만 탈퇴할 수 있습니다.');
      return;
    }

    // 400: 비밀번호 불일치 
    if (resp.status === 400) {
      const t = await parseJsonSafe(resp);
      alert(t?.resMessage || t?.message || '비밀번호가 일치하지 않습니다.');
      return;
    }
    //  409: 연결 데이터(FK) 등으로 처리 불가 (방어 목적)
      if (resp.status === 409) {
        const t = await parseJsonSafe(resp);
        alert(t?.resMessage || t?.message || '연결된 데이터로 인해 탈퇴 처리에 실패했습니다.');
        return;
      }


      // 500: 서버 내부 오류 — 화면에 RAW 에러를 찍지 않고 얼럿뜨게함
        if (resp.status >= 500) {
          const t = await parseJsonSafe(resp);
          alert(t?.resMessage || t?.message || '서버 오류로 탈퇴 처리에 실패했습니다.');
          return;
        }


    if (!resp.ok) {
      // 그 외 서버 오류
      const t = await parseJsonSafe(resp);
      throw new Error(
        `회원 탈퇴 실패\nHTTP ${resp.status} ` +
        (typeof t?.raw === 'string' ? t.raw : JSON.stringify(t))
      );
    }

    //  성공 처리: 인증 흔적 제거 후 홈으로
    purgeAuthArtifacts();
    setOk('회원 탈퇴가 완료되었습니다.');
    alert('계정이 삭제되었습니다. 이용해 주셔서 감사합니다.');
    router.replace('/');
  } catch (e: any) {
    setErr(e?.message || '회원 탈퇴 처리 중 오류가 발생했습니다.잠시 후 다시 시도해 주세요.');
  } finally {
    setSubmitting(false);
  }
}



  return (
    <main className="mx-auto max-w-[570px] px-4 py-8 text-center">
      {/* 타이틀: 로그인 페이지와 동일한 발바닥 아이콘 */}
      <h1 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2">
        End My Membership
        <svg className="w-[1em] h-[1em] text-rose-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="12" cy="6" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <path d="M12 12c-3 0-5.5 2-5.5 4.5 0 1.4 1 2.5 2.5 2.5 1.1 0 2.1-.6 3-1 0.9.4 1.9 1 3 1 1.5 0 2.5-1.1 2.5-2.5 0-2.5-2.5-4.5-5.5-4.5z"/>
        </svg>
      </h1>

      {/* 안내 문구 */}
      <p className="text-sm text-gray-600 leading-6">
        <b>안내사항</b><br />
        <br></br>
        · 회원 탈퇴는 영구적이며 되돌릴 수 없습니다.<br />
        · 고객 정보 및 개인형 서비스 이용 기록은 개인정보처리방침 기준에 따라 삭제됩니다.
      </p>
      <div className="row">
        <label className="flex items-center gap-2 justify-center">
          <input type="checkbox" className="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
          <span className="text-xs text-gray-500">안내 사항을 모두 확인하였으며, 이에 동의합니다.</span>
        </label>
      </div>
      <br></br>
      <div className="h-3" />
      <hr className="border-gray-200" />
      <div className="h-4" />

      {/* 폼: 로그인 페이지와 동일한 레이아웃 */}
      <form onSubmit={onSubmit}>
        <Row label="ID">
          <input className="input" value={memberId} disabled aria-readonly />
        </Row>
        <Row label="PW">
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </Row>

        <div className="h-2" />
        <hr className="border-gray-100" />
        <div className="h-4" />
        <br></br>
        <div className="flex items-center justify-center gap-3">
          <button className="btn-3d btn-white text-black min-w-[120px]" disabled={!canSubmit}>
            {submitting ? '처리 중…' : '회원탈퇴'}
          </button>
          <button type="button" className="btn-3d btn-white text-black min-w-[120px]" onClick={()=>history.back()}>
            취소
          </button>
        </div>

        {err && <p className="text-red-600 text-xs text-center mt-10 whitespace-pre-wrap break-words">{err}</p>}
        {ok && <p className="text-green-600 text-xs text-center mt-10">{ok}</p>}
        <br></br>
        <br></br>
        <br></br>
        <br></br>
      </form>

      {/* 로그인 페이지와 동일한 스타일 클래스 */}
      <style jsx global>{`
        .row { display:flex; align-items:center; justify-content:center; gap:12px; margin:14px 0; text-align:center; }
        .label { color:#111; font-size:1.1rem; font-weight:500; }
        .input { display:inline-block; border:1px solid #e5e7eb; border-radius:6px; height:26px; padding:3px 8px; font-size:13.5px; color:#111; width:130px; vertical-align:middle; }
        .checkbox { width:14px; height:14px; }
        .btn-3d { padding:8px 14px; border-radius:10px; border:1px solid #2222; background:#fff; box-shadow:0 1px 0 #fff inset, 0 6px 0 rgba(0,0,0,0.); }
        .btn-white { background:#fff; }
      `}</style>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
