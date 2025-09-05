'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
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
    memberZipCode: '',
    memberRoadAddress: '',
    memberDetailAddress: '',
    memberHasPet: 'N',
  });
  const set = <K extends keyof MemberForm>(k: K, v: MemberForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

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
    return new URL(`${prefix}${normalized}`, BASE).toString();
  }

  // -------- Auth --------
  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  // 토큰을 LS/쿠키 여러 키에서 탐색
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

  // JWT payload 디코딩(멤버 아이디 추출용)
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

  // -------- 내 정보 로드: 토큰/LS에서 id → /member/my_page/{id} 먼저 --------
  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);

      try {
        const ls = typeof window !== 'undefined' ? window.localStorage : null;
        const token = getAccessToken();
        const payload = decodeJwtPayload(token);
        const idFromToken = payload?.memberId || payload?.username || payload?.sub || '';
        const idFromLs =
          ls?.getItem('memberId') || ls?.getItem('loginId') || ls?.getItem('username') || '';

        let myId = idFromToken || idFromLs;

        // 1) 먼저 id가 있으면 바로 상세 조회
        if (myId) {
          const infoRes = await fetch(api(`/member/my_page/${encodeURIComponent(myId)}`), {
            method: 'GET',
            credentials: 'include',
            headers: authHeaders(),
          });

          if (infoRes.ok) {
            const data = await infoRes.json().catch(() => ({} as any));
            const src =
              data?.result?.readMemberOne ||
              data?.result?.readOneMember ||
              data?.result?.member ||
              data?.result ||
              data;

            if (mounted) {
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
                memberZipCode: nz(src.memberZipCode || src.zipCode),
                memberRoadAddress: nz(src.memberRoadAddress || src.roadAddress),
                memberDetailAddress: nz(src.memberDetailAddress || src.detailAddress),
                memberHasPet: ((src.memberHasPet || src.hasPet) === 'Y' ? 'Y' : 'N') as YesNo,
              });
            }
            return; // 상세 조회 성공했으면 끝
          }
        }

        // 2) 토큰/LS에서 못 얻었거나 실패하면'/member/readOne'로 보조 조회
        const meRes = await fetch(api('/member/readOne'), {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });

        if (!meRes.ok) {
          // me가 401/403이어도 my_page로 이미 시도했으니 여기서 최종 로그인 이동
          router.replace('/member/login');
          return;
        }

        const meJson = await meRes.json().catch(() => ({} as any));
        myId = meJson?.result || meJson?.memberId || meJson?.id;
        if (!myId) {
          router.replace('/member/login');
          return;
        }

        // 3) me에서 얻은 id로 상세 조회
        const infoRes2 = await fetch(api(`/member/my_page/${encodeURIComponent(myId)}`), {
          method: 'GET',
          credentials: 'include',
          headers: authHeaders(),
        });

        if (!infoRes2.ok) {
          router.replace('/member/login');
          return;
        }

        const data2 = await infoRes2.json().catch(() => ({} as any));
        const src2 =
          data2?.result?.readMemberOne ||
          data2?.result?.readOneMember ||
          data2?.result?.member ||
          data2?.result ||
          data2;

        if (mounted) {
          setForm({
            memberId: nz(src2.memberId || src2.id),
            memberPw: '',
            memberName: nz(src2.memberName || src2.name),
            memberBirthY: nz(src2.memberBirthY || src2.birthY),
            memberBirthM: nz(src2.memberBirthM || src2.birthM).padStart(2, '0'),
            memberBirthD: nz(src2.memberBirthD || src2.birthD).padStart(2, '0'),
            memberBirthGM: ((src2.memberBirthGM || src2.birthGM || src2.solarLunar) === '음력'
              ? '음력'
              : '양력') as GM,
            memberEmail: nz(src2.memberEmail || src2.email),
            memberZipCode: nz(src2.memberZipCode || src2.zipCode),
            memberRoadAddress: nz(src2.memberRoadAddress || src2.roadAddress),
            memberDetailAddress: nz(src2.memberDetailAddress || src2.detailAddress),
            memberHasPet: ((src2.memberHasPet || src2.hasPet) === 'Y' ? 'Y' : 'N') as YesNo,
          });
        }
      } catch (e: any) {
        setErr(e?.message || '내 정보 조회 중 오류');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  // -------- 저장 --------
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || loading) return;
    setErr(null);
    setOk(null);

    try {
      setSubmitting(true);
      const flat = { ...form, memberPw: (form.memberPw ?? '').trim() };

      const resp = await fetch(api('/member/modify'), {
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
      set('memberPw', '');
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
      <h1 className="text-2xl font-semibold mb-6">My Information&nbsp;<PawIcon/></h1>
      <hr className="border-gray-200 mb-8" />

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
        <br></br>
        <hr className="border-gray-200 mb-8" />
  <br></br>
        <div className="mt-8 flex justify-center">
          <button type="submit" disabled={submitting} className="btn-3d btn-white min-w-[140px]">
            {submitting ? '처리 중…' : '수정하기'}
          </button>
        </div>

        {ok && <p className="text-green-600 mt-4">{ok}</p>}
        {err && <p className="text-red-600 mt-4 whitespace-pre-wrap">{err}</p>}
      </form>
  <br></br>
    <br></br>
      <br></br>
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="row">
      <span className="label">{label}</span>
      {children}
    </div>
  );
}
