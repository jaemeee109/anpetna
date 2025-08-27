'use client';

import { useEffect, useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);

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
  const set = <K extends keyof MemberForm,>(k: K, v: MemberForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const BASE = (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}${window.location.port ? `:${window.location.port === '3000' ? '8000' : window.location.port}` : ''}`.replace(/:$/, '')
      : '');

  function api(path: string) {
    const prefix = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${prefix}${normalized}`, BASE).toString();
  }

  const nz = (v: any, dflt = '') => (String(v ?? '').trim() || dflt);

  function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function hasToken(): boolean {
    if (typeof window === 'undefined') return false;
    const ls = localStorage.getItem('accessToken');
    const ck = getCookie('accessToken') || getCookie('JSESSIONID');
    return !!(ls || ck);
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

  useEffect(() => {
    let mounted = true;
    if (!hasToken()) {
      router.replace('/member/login');
      return;
    }
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      try {
        setLoading(true);
        setErr(null);
        setOk(null);

        // 1) memberId 추론 로직 강화 (쿼리 → LS → 쿠키 → JWT)
        const search = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const qId = search?.get('memberId') || '';
        const ls = typeof window !== 'undefined' ? window.localStorage : null;

        function decodeJwtPayload(token?: string | null): any | null {
          if (!token) return null;
          const parts = token.split('.');
          if (parts.length !== 3) return null;
          try {
            const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
            return JSON.parse(json);
          } catch { return null; }
        }
        const jwtPayload = decodeJwtPayload(getAccessToken());

        const memberId = qId
          || ls?.getItem('memberId')
          || ls?.getItem('loginId')
          || ls?.getItem('username')
          || getCookie('memberId')
          || jwtPayload?.memberId || jwtPayload?.username || jwtPayload?.sub || '';

        if (!memberId) throw new Error('로그인 ID를 찾을 수 없습니다. (URL ?memberId=, localStorage.memberId/loginId/username, cookie.memberId 또는 JWT 클레임 필요)');

        const url = api(`/member/my_page/${encodeURIComponent(memberId)}`);
        const resp = await fetch(url, { credentials: 'include', headers: authHeaders() });
        if (!resp.ok) {
          const body = await resp.text().catch(()=>'');
          throw new Error(`내 정보 조회 실패 (HTTP ${resp.status})
${body}`);
        }
        const data = await resp.json().catch(() => ({} as any));
        // ApiResult 래핑 및 다양한 키 대응
        const src = data?.result?.readMemberOne
          || data?.result?.readOneMember
          || data?.result?.member
          || data?.result
          || data;

        if (mounted) {
          setForm({
            memberId: nz(src.memberId || src.id),
            memberPw: '',
            memberName: nz(src.memberName || src.name),
            memberBirthY: nz(src.memberBirthY || src.birthY),
            memberBirthM: nz(src.memberBirthM || src.birthM).padStart(2, '0'),
            memberBirthD: nz(src.memberBirthD || src.birthD).padStart(2, '0'),
            memberBirthGM: ((src.memberBirthGM || src.birthGM || src.solarLunar) === '음력' ? '음력' : '양력') as GM,
            memberEmail: nz(src.memberEmail || src.email),
            memberZipCode: nz(src.memberZipCode || src.zipCode),
            memberRoadAddress: nz(src.memberRoadAddress || src.roadAddress),
            memberDetailAddress: nz(src.memberDetailAddress || src.detailAddress),
            memberHasPet: ((src.memberHasPet || src.hasPet) === 'Y' ? 'Y' : 'N') as YesNo,
          });
        }
      } catch (e: any) {
        setErr(e?.message || '내 정보 조회 중 오류');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || loading) return;
    setErr(null);
    setOk(null);
    try {
      setSubmitting(true);
      const flat = { ...form, memberPw: nz(form.memberPw) };
      const bodyJSON = JSON.stringify(flat);
      const url = api('/member/update');
      const resp = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: bodyJSON,
      });
      if (!resp.ok) throw new Error(`회원 정보 수정 실패 (HTTP ${resp.status})`);
      setOk('수정이 완료되었습니다.');
      set('memberPw', '');
    } catch (e: any) {
      setErr(e?.message || '회원 정보 수정 중 오류');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-[720px] px-4 py-12 text-center"><p>내 정보를 불러오는 중…</p></main>;

  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 text-center">
      <h1 className="text-2xl font-semibold mb-6">My Information</h1>
      <hr className="border-gray-200 mb-8" />

      <form onSubmit={onSubmit}>
        <Row label="ID"><input className="input" value={form.memberId} disabled /></Row>
        <Row label="PASSWORD"><input className="input" type="password" placeholder="변경 시 입력" value={form.memberPw} onChange={(e) => set('memberPw', e.target.value)} /></Row>
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
          <label className="ml-3"><input type="radio" checked={form.memberBirthGM==='양력'} onChange={() => set('memberBirthGM','양력')} /> Solar</label>
          <label className="ml-2"><input type="radio" checked={form.memberBirthGM==='음력'} onChange={() => set('memberBirthGM','음력')} /> Lunar</label>
        </Row>

        <Row label="E-mail"><input className="input" value={form.memberEmail} onChange={(e) => set('memberEmail', e.target.value)} /></Row>
        <Row label="ZipCode"><input className="input input--xs" value={form.memberZipCode} onChange={(e) => set('memberZipCode', e.target.value)} /></Row>
        <Row label="RoadAddress"><input className="input input--lgw" value={form.memberRoadAddress} onChange={(e) => set('memberRoadAddress', e.target.value)} /></Row>
        <Row label="DetailAddress"><input className="input input--lgw" value={form.memberDetailAddress} onChange={(e) => set('memberDetailAddress', e.target.value)} /></Row>

        <Row label="Have a Pet?">
          <label><input type="radio" checked={form.memberHasPet==='Y'} onChange={() => set('memberHasPet','Y')} /> Yes</label>
          <label className="ml-4"><input type="radio" checked={form.memberHasPet==='N'} onChange={() => set('memberHasPet','N')} /> No</label>
        </Row>

        <div className="mt-8 flex justify-center">
          <button type="submit" disabled={submitting} className="btn-3d btn-white min-w-[140px]">
            {submitting ? '처리 중…' : '수정하기'}
          </button>
        </div>

        {ok && <p className="text-green-600 mt-4">{ok}</p>}
        {err && <p className="text-red-600 mt-4">{err}</p>}
      </form>

      <style jsx global>{`
        .row { display:flex; align-items:center; justify-content:center; gap:12px; margin:14px 0; }
        .label { width:120px; text-align:right; font-weight:500; }
        .input { border:1px solid #ccc; border-radius:6px; padding:4px 8px; font-size:14px; }
        .input--xs { width:80px; }
        .input--lgw { width:260px; }
        .btn-3d { padding:8px 14px; border-radius:10px; border:1px solid #2222; background:#fff; }
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
