// src/app/member/info/page.tsx
'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import PawIcon from '@/components/icons/Paw';

type GM = '양력' | '음력';
type YesNo = 'Y' | 'N';

interface MemberForm {
  memberId: string;
  memberPw: string;
  memberName: string;
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: GM;
  memberEmail: string;
  memberPhone: string;
  memberZipCode: string;
  memberRoadAddress: string;
  memberDetailAddress: string;
  memberHasPet: YesNo;
}

export default function MemberInfoPage() {
  const router = useRouter();

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(now - i));
  }, []);
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    []
  );
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
    []
  );

  const [form, setForm] = useState<MemberForm>({
    memberId: '',
    memberPw: '',
    memberName: '',
    memberBirthY: '',
    memberBirthM: '',
    memberBirthD: '',
    memberBirthGM: '양력',
    memberEmail: '',
    memberPhone: '',
    memberZipCode: '',
    memberRoadAddress: '',
    memberDetailAddress: '',
    memberHasPet: 'N',
  });
  function set<K extends keyof MemberForm>(k: K, v: MemberForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

    // -------- API URL --------
    const BASE =
      (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}${
            window.location.port
              ? `:${window.location.port === '3000' ? '8000' : window.location.port}`
              : ''
          }`.replace(/:$/, '')
        : '');
    function api(path: string) {
      const prefix = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';
      const normalized = path.startsWith('/') ? path : `/${path}`;
      return new URL(path, BASE+'/').toString();
    }

  // -------- Auth --------
  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    const ls = localStorage;
    let raw =
      ls.getItem('accessToken') ||
      ls.getItem('access_token') ||
      ls.getItem('token') ||
      ls.getItem('jwt') ||
      ls.getItem('Authorization') ||
      getCookie('Authorization') ||
      getCookie('accessToken') ||
      null;
    if (!raw) return null;
    raw = raw.trim();
    return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw;
  }

  function authHeaders(base: Record<string, string> = {}) {
    const token = getAccessToken();
    const h: Record<string, string> = { ...base };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  function hasAnyAuth(): boolean {
    try {
      return !!(getAccessToken() || getCookie('JSESSIONID'));
    } catch {
      return false;
    }
  }

  function decodeJwtPayload(token?: string | null): any | null {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  const nz = (v: any, dflt = '') => String(v ?? '').trim() || dflt;

  /** 객체/응답에서 memberId 후보를 안전 추출 (문자/숫자만) */
  function pickIdFrom(anyVal: any): string {
    const val = anyVal && typeof anyVal === 'object' ? anyVal : {};
    const candList: any[] = [
      (val as any).memberId,
      (val as any).loginId,
      (val as any).username,
      (val as any).id,
      (val as any).result?.memberId,
      (val as any).result?.loginId,
      (val as any).result?.username,
      (val as any).result?.id,
      (val as any).data?.memberId,
      (val as any).data?.id,
    ];
    const cand = candList.find(
      (x) => typeof x === 'string' || typeof x === 'number'
    );
    return cand !== undefined ? String(cand) : '';
  }

  /** 응답(JSON)에서 회원 프로필 객체를 한 번에 뽑기 */
  function pickProfileFrom(json: any): any | null {
    const j = json ?? {};
    const src =
      j?.result?.readMemberOne ??
      j?.result?.readOneMember ??
      j?.result?.member ??
      j?.result ??
      j?.data ??
      j?.item ??
      j?.member ??
      null;
    // 최소 필드 하나라도 있으면 프로필로 간주
    if (src && typeof src === 'object') {
      const hasAny =
        src.memberId ?? src.id ?? src.memberName ?? src.name ?? src.email ?? src.memberEmail;
      return hasAny ? src : null;
    }
    return null;
  }

  // ---------------- 내 정보 로드(관리자/일반 공통) ----------------
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);

      // 상세 조회 시도(여러 경로 순차 시도)
      const tryDetailById = async (id: string): Promise<boolean> => {
        const paths = [
          `member/my_page/${encodeURIComponent(id)}`, // 일반 사용자 우선 경로
          `member/readOne/${encodeURIComponent(id)}`, // 관리자/권한 차단 시 보조 경로
        ];
        for (const p of paths) {
          try {
            const r = await fetch(api(p), {
              method: 'GET',
              credentials: 'include',
              headers: authHeaders(),
            });
            if (!r.ok) continue;

            const data = await r.json().catch(() => ({} as any));
            const src = pickProfileFrom(data);
            if (!src) continue;

            if (!mounted) return true;
            setForm({
              memberId: nz(src.memberId || src.id),
              memberPw: '',
              memberName: nz(src.memberName || src.name),
              memberBirthY: nz(src.memberBirthY || src.birthY),
              memberBirthM: nz(src.memberBirthM || src.birthM).padStart(2, '0'),
              memberBirthD: nz(src.memberBirthD || src.birthD).padStart(2, '0'),
              memberBirthGM: ((src.memberBirthGM || src.birthGM || src.solarLunar) === '음력'
                ? '음력'
                : '양력') as GM,
              memberEmail: nz(src.memberEmail || src.email),
              memberPhone: nz(src.memberPhone || src.phone || src.tel),
              memberZipCode: nz(src.memberZipCode || src.zipCode),
              memberRoadAddress: nz(src.memberRoadAddress || src.roadAddress),
              memberDetailAddress: nz(src.memberDetailAddress || src.detailAddress),
              memberHasPet: ((src.memberHasPet || src.hasPet) === 'Y' ? 'Y' : 'N') as YesNo,
            });
            return true;
          } catch {
            // 다음 후보 계속
          }
        }
        return false;
      };

      try {
        // 1) 토큰/LS에서 id 추출 → 상세 조회
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        const token = getAccessToken();
        const payload = decodeJwtPayload(token);
        const idFromToken =
          payload?.memberId || payload?.loginId || payload?.username || payload?.sub || '';
        const idFromLs =
          ls?.getItem('memberId') || ls?.getItem('loginId') || ls?.getItem('username') || '';
        let myId = String(idFromToken || idFromLs || '');

        if (myId) {
          const ok = await tryDetailById(myId);
          if (ok) return;
        }

        // 2) 무인자 me 엔드포인트에서 프로필/아이디 확보
        try {
          const meRes = await fetch(api('member/readOne'), {
            method: 'GET',
            credentials: 'include',
            headers: authHeaders(),
          });
          if (meRes.ok) {
            const meJson = await meRes.json().catch(() => ({} as any));

            // (a) 프로필이 통째로 오면 바로 채우고 끝
            const meProfile = pickProfileFrom(meJson);
            if (meProfile) {
              if (mounted) {
                setForm({
                  memberId: nz(meProfile.memberId || meProfile.id),
                  memberPw: '',
                  memberName: nz(meProfile.memberName || meProfile.name),
                  memberBirthY: nz(meProfile.memberBirthY || meProfile.birthY),
                  memberBirthM: nz(meProfile.memberBirthM || meProfile.birthM).padStart(2, '0'),
                  memberBirthD: nz(meProfile.memberBirthD || meProfile.birthD).padStart(2, '0'),
                  memberBirthGM:
                    ((meProfile.memberBirthGM || meProfile.birthGM || meProfile.solarLunar) === '음력'
                      ? '음력'
                      : '양력') as GM,
                  memberEmail: nz(meProfile.memberEmail || meProfile.email),
                  memberPhone: nz(meProfile.memberPhone || meProfile.phone || meProfile.tel),
                  memberZipCode: nz(meProfile.memberZipCode || meProfile.zipCode),
                  memberRoadAddress: nz(meProfile.memberRoadAddress || meProfile.roadAddress),
                  memberDetailAddress: nz(meProfile.memberDetailAddress || meProfile.detailAddress),
                  memberHasPet: ((meProfile.memberHasPet || meProfile.hasPet) === 'Y' ? 'Y' : 'N') as YesNo,
                });
              }
              return;
            }

            // (b) 프로필은 없지만 id만 있으면 상세 재시도
            myId = pickIdFrom(meJson);
            if (myId) {
              const ok = await tryDetailById(myId);
              if (ok) return;
            }
          }
        } catch {
          // 무인자 me가 없거나 실패 → 아래로
        }

        // 3) 최종 실패 처리
        if (!hasAnyAuth()) {
          router.replace('/member/login');
        } else {
          if (mounted) setErr('내 정보 조회에 실패했습니다.');
        }
      } catch (e: any) {
        if (mounted) setErr(e?.message || '내 정보 조회 중 오류');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // ---------------- 저장(비번 공란은 필드 제거) ----------------
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || loading) return;
    setErr(null);
    setOk(null);

    try {
      setSubmitting(true);

      const flat: any = { ...form };
      if (typeof flat.memberPw === 'string') {
        flat.memberPw = flat.memberPw.trim();
        if (!flat.memberPw) delete flat.memberPw; // 공란이면 덮어쓰기 방지
      }

      const resp = await fetch(api('member/modify'), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(flat),
      });

      if (resp.status === 401 || resp.status === 403) {
        router.replace('/member/login');
        return;
      }
      if (!resp.ok) throw new Error(`회원 정보 수정 실패 (HTTP ${resp.status})`);

      setOk('수정이 완료되었습니다.');
      set('memberPw', ''); // 저장 후 입력칸은 다시 공란 유지
    } catch (e: any) {
      setErr(e?.message || '회원 정보 수정 중 오류');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <main className="mx-auto max-w-[720px] px-4 py-12 text-center">
        <p>내 정보를 불러오는 중…</p>
      </main>
    );

  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold mb-6">
        My Information&nbsp;<PawIcon/>
      </h1>
      <hr className="border-gray-200 mb-[40px]" />

      <form onSubmit={onSubmit}>
        <Row label="ID"><input className="input" value={form.memberId} disabled /></Row>
        <Row label="PASSWORD">
          <input
            className="input"
            type="password"
            placeholder="비밀번호 변경"
            value={form.memberPw}
            onChange={(e) => set('memberPw', e.target.value)}
          />
        </Row>

        <Row label="NAME"><input className="input" value={form.memberName} disabled /></Row>

        <Row label="TEL">
          <input
            className="input"
            value={form.memberPhone}
            onChange={(e) => set('memberPhone', e.target.value)}
            placeholder="연락처"
          />
        </Row>

        <Row label="Birthday">
          <select className="input input--xs" value={form.memberBirthY} onChange={(e) => set('memberBirthY', e.target.value)}>
            <option value="">YEAR</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select className="input input--xs" value={form.memberBirthM} onChange={(e) => set('memberBirthM', e.target.value)}>
            <option value="">MONTH</option>
            {months.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className="input input--xs" value={form.memberBirthD} onChange={(e) => set('memberBirthD', e.target.value)}>
            <option value="">DAY</option>
            {days.map((d) => <option key={d}>{d}</option>)}
          </select>
          <label className="ml-3">
            <input type="radio" checked={form.memberBirthGM === '양력'} onChange={() => set('memberBirthGM', '양력')} /> Solar
          </label>
          <label className="ml-2">
            <input type="radio" checked={form.memberBirthGM === '음력'} onChange={() => set('memberBirthGM', '음력')} /> Lunar
          </label>
        </Row>

        <Row label="E-mail">
          <input className="input" value={form.memberEmail} onChange={(e) => set('memberEmail', e.target.value)} />
        </Row>
        <Row label="ZipCode">
          <input className="input input--xs" value={form.memberZipCode} onChange={(e) => set('memberZipCode', e.target.value)} />
        </Row>
        <Row label="RoadAddress">
          <input className="input input--lgw" value={form.memberRoadAddress} onChange={(e) => set('memberRoadAddress', e.target.value)} />
        </Row>
        <Row label="DetailAddress">
          <input className="input input--lgw" value={form.memberDetailAddress} onChange={(e) => set('memberDetailAddress', e.target.value)} />
        </Row>

        <Row label="Have a Pet?">
          <label><input type="radio" checked={form.memberHasPet === 'Y'} onChange={() => set('memberHasPet', 'Y')} /> Yes</label>
          <label className="ml-4"><input type="radio" checked={form.memberHasPet === 'N'} onChange={() => set('memberHasPet', 'N')} /> No</label>
        </Row>

        <br />
        <hr className="border-gray-200 mb-8" />
        <br />

        <div className="mt-8 flex justify-center">
          <button type="submit" disabled={submitting} className="btn-3d btn-white min-w-[140px]">
            {submitting ? '처리 중…' : '수정하기'}
          </button>
        </div>

        {ok && <p className="text-green-600 mt-4">{ok}</p>}
        {err && <p className="text-red-600 mt-4 whitespace-pre-wrap">{err}</p>}
      </form>

      <br />
      <br />
      <br />

      <style jsx global>{`
        .row{display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0;}
        .label{width:120px;text-align:right;font-weight:500;}
        .input{border:1px solid #ccc;border-radius:6px;padding:4px 8px;font-size:14px;}
        .input--xs{width:80px;}
        .input--lgw{width:260px;}
        .btn-3d{padding:8px 14px;border:1px solid #2222;border-radius:10px;background:#fff;}
        .btn-white{background:#fff;}
      `}</style>
    </main>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
