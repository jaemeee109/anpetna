'use client';

import { useMemo, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type GM = '양력' | '음력';
type YesNo = 'Y' | 'N';

interface Form {
  memberId: string;
  memberPw: string;
  memberName: string;
  memberBirthY: string;
  memberBirthM: string;
  memberBirthD: string;
  memberBirthGM: GM;
  memberPhone: string;
  smsStsYn: YesNo;
  memberEmail: string;
  memberRoadAddress: string;
  memberZipCode: string;
  memberDetailAddress: string;
  memberHasPet: YesNo;
}

export default function SignupPage() {
  const router = useRouter();

  // YYYY/MM/DD 옵션
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(now - i));
  }, []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')), []);
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')), []);

  const [form, setForm] = useState<Form>({
    memberId: '',
    memberPw: '',
    memberName: '',
    memberBirthY: '',
    memberBirthM: '',
    memberBirthD: '',
    memberBirthGM: '양력',
    memberPhone: '',
    smsStsYn: 'N',
    memberEmail: '',
    memberRoadAddress: '',
    memberZipCode: '',
    memberDetailAddress: '',
    memberHasPet: 'N',
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof Form,>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGM = (v: GM) => set('memberBirthGM', v);

  // === 백엔드 베이스 ===
  const BASE =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}${
          window.location.port
            ? `:${window.location.port === '3000' ? '8000' : window.location.port}`
            : ''
        }`.replace(/:$/, '')
      : '');

  // 접두어 포함 URL 생성
  function apiWithPrefix(path: string) {
    const prefix = (process.env.NEXT_PUBLIC_API_PREFIX as string | undefined) ?? '/anpetna';
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return new URL(`${prefix}${normalized}`, BASE).toString();
  }
  // 접두어 없이 URL 생성
  function apiNoPrefix(path: string) {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return new URL(normalized, BASE).toString();
  }

  // 안전 트림 + 기본값
  const nz = (v: string, dflt = '-') => (String(v ?? '').trim() || dflt);
  async function readBody(resp: Response) {
    const text = await resp.text().catch(() => '');
    try {
      const j = text ? JSON.parse(text) : null;
      if (j && typeof j === 'object') {
        const msg =
          j.message || j.error || j.detail || j.msg || j.status || j.reason || JSON.stringify(j, null, 2);
        return typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
      }
    } catch {}
    return text;
  }

  // === 가입 제출 ===
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!form.memberId.trim() || !form.memberPw.trim() || !form.memberName.trim()) {
      setErr('ID, PASSWORD, NAME은 필수입니다.');
      return;
    }
    if (!form.memberBirthY || !form.memberBirthM || !form.memberBirthD) {
      setErr('생년월일(YYYY/MM/DD)을 선택해주세요.');
      return;
    }
    if (!form.memberEmail.includes('@')) {
      setErr("이메일에 '@'를 포함해 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      setErr(null);

      // 보수적으로 값 보정
      const flat = {
        memberId: nz(form.memberId),
        memberPw: nz(form.memberPw),
        memberName: nz(form.memberName),

        memberBirthY: nz(form.memberBirthY),
        memberBirthM: nz(form.memberBirthM.padStart(2, '0')),
        memberBirthD: nz(form.memberBirthD.padStart(2, '0')),
        memberBirthGM: (form.memberBirthGM || '양력') as GM,

        memberGender: 'U',
        memberHasPet: (form.memberHasPet || 'N') as YesNo,

        memberPhone: nz(form.memberPhone, '00000000000'),
        smsStsYn: (form.smsStsYn || 'N') as YesNo,

        memberEmail: nz(form.memberEmail, 'user@example.com'),
        emailStsYn: 'N' as YesNo,

        memberRoadAddress: nz(form.memberRoadAddress, '-'),
        memberZipCode: nz(form.memberZipCode, '00000'),
        memberDetailAddress: nz(form.memberDetailAddress, '-'),

        memberRole: 'USER' as any,
        memberSocial: false,
        memberEtc: '',
        social: false,
        etc: '',
      };

      // 래핑 DTO 동시 제공(모르는 키는 서버가 무시)
      const bodyJSON = JSON.stringify({ ...flat, memberDTO: { ...flat } });

      // ▶ 1순위: 접두어 포함 (/anpetna/member/join)
      const url1 = apiWithPrefix('/member/join');
      let resp = await fetch(url1, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json, text/plain, */*',
        },
        body: bodyJSON,
      });

      // ▶ 404면 접두어 없는 경로로 폴백 (/member/join)
      if (resp.status === 404) {
        const url2 = apiNoPrefix('/member/join');
        resp = await fetch(url2, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Accept: 'application/json, text/plain, */*',
          },
          body: bodyJSON,
        });
      }

      if (!resp.ok) {
        const body = await readBody(resp);
        if (/duplicate|unique|exists|duplicated|already/i.test(body)) {
          throw new Error('이미 사용 중인 아이디입니다. 다른 아이디로 시도해주세요.');
        }
        if (/password|encoder|bcrypt|illegal/i.test(body)) {
          throw new Error('비밀번호 처리 중 서버 오류가 발생했습니다. 너무 짧거나 허용되지 않는 문자가 포함됐을 수 있어요.');
        }
        if (/null|nullable|not\s*null|constraint/i.test(body)) {
          throw new Error(`필수 항목 누락으로 가입이 거절되었습니다.\n서버 메시지: ${body}`);
        }
        throw new Error(`회원가입 실패 (HTTP ${resp.status})\n${body || '(본문 없음)'}`);
      }

      alert('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.');
      router.replace('/member/login');
    } catch (e: any) {
      setErr(e?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 text-center">
      <br></br>
      <h1 className="text-2xl font-semibold mb-4 flex items-center justify-center gap-2 ">
        Join Us &nbsp;
        <svg
          className="w-[1em] h-[1em] text-rose-400"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="2.2" />
          <circle cx="12" cy="6" r="2.2" />
          <circle cx="17" cy="7" r="2.2" />
          <path d="M12 12c-3 0-5.5 2-5.5 4.5 0 1.4 1 2.5 2.5 2.5 1.1 0 2.1-.6 3-1 0.9.4 1.9 1 3 1 1.5 0 2.5-1.1 2.5-2.5 0-2.5-2.5-4.5-5.5-4.5z"/>
        </svg>
      </h1>

      <hr className="border-gray-200 mb-6" />
      <br></br>

      <form onSubmit={onSubmit}>
        <Row label="ID">
          <input className="input" value={form.memberId} onChange={e => set('memberId', e.target.value)} />
        </Row>

        <Row label="PASSWORD">
          <input className="input" type="password" value={form.memberPw} onChange={e => set('memberPw', e.target.value)} />
        </Row>

        <Row label="NAME">
          <input className="input" value={form.memberName} onChange={e => set('memberName', e.target.value)} />
        </Row>

        <Row label="Birthday">
          <div className="inline-flex flex-nowrap items-center gap-2">
            <select className="input input--smw" value={form.memberBirthY} onChange={e => set('memberBirthY', e.target.value)}>
              <option value="">YEAR</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <span>&nbsp;</span>
            <select className="input input--xs" value={form.memberBirthM} onChange={e => set('memberBirthM', e.target.value)}>
              <option value="">MONTH</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span>&nbsp;</span>
            <select className="input input--xs" value={form.memberBirthD} onChange={e => set('memberBirthD', e.target.value)}>
              <option value="">DAY</option>
              {days.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span>&nbsp;</span>

            <label className="inline-flex items-center gap-1 ml-3 text-sm">
              &nbsp;Solar
              <input
                type="checkbox"
                className="checkbox"
                checked={form.memberBirthGM === '양력'}
                onChange={() => toggleGM('양력')}
              />
            </label>
            <label className="inline-flex items-center gap-1 text-sm">
              &nbsp;Lunar
              <input
                type="checkbox"
                className="checkbox"
                checked={form.memberBirthGM === '음력'}
                onChange={() => toggleGM('음력')}
              />
            </label>
          </div>
        </Row>

        <Row label="PhoneNumber">
          <div className="inline-flex items-center gap-3">
            <input className="input" value={form.memberPhone} onChange={e => set('memberPhone', e.target.value)} />
            <label className="inline-flex items-center gap-1 text-sm text-gray-400">
              &nbsp;  SMS&nbsp;
              <input
                type="checkbox"
                className="checkbox"
                checked={form.smsStsYn === 'Y'}
                onChange={e => set('smsStsYn', e.target.checked ? 'Y' : 'N')}
              />
            </label>
          </div>
        </Row>

        <Row label="E-mail">
          <input
            className="input"
            placeholder="'@' 포함해서 입력해주세요"
            value={form.memberEmail}
            onChange={e => set('memberEmail', e.target.value)}
          />
        </Row>

        <Row label="ZipCode">
          <input className="input input--xs" value={form.memberZipCode} onChange={e => set('memberZipCode', e.target.value)} />
        </Row>

        <Row label="RoadAddress">
          <input
            className="input input--lgw"
            placeholder="도로명 주소를 입력해주세요"
            value={form.memberRoadAddress}
            onChange={e => set('memberRoadAddress', e.target.value)}
          />
        </Row>

        <Row label="DetailAddress">
          <input
            className="input input--lgw"
            placeholder="상세 주소를 입력해주세요"
            value={form.memberDetailAddress}
            onChange={e => set('memberDetailAddress', e.target.value)}
          />
        </Row>

        <Row label="Have a Pet?">
          <div className="inline-flex items-center gap-4">
            <label className="inline-flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.memberHasPet === 'Y'}
                onChange={() => set('memberHasPet', 'Y')}
              />
              Yes
            </label>
            <label className="inline-flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                className="checkbox"
                checked={form.memberHasPet === 'N'}
                onChange={() => set('memberHasPet', 'N')}
              />
              No
            </label>
          </div>
        </Row>

        <br></br>
        <div className="h-2" />
        <hr className="border-gray-200" />
        <div className="h-4" />
        <br></br>

        <div className="flex justify-center gap-3">
          <button type="submit" className="btn-3d btn-white text-black" disabled={submitting}>
            {submitting ? '처리 중…' : '가입하기'}
          </button>
          <button type="button" className="btn-3d btn-white" onClick={() => router.back()}>
            취소
          </button>
        </div>

        <br></br><br></br><br></br><br></br><br></br>

        {err && (
          <pre className="text-red-600 text-xs text-left mt-2 whitespace-pre-wrap break-words max-w-[720px] mx-auto">
{err}
          </pre>
        )}
      </form>

      <style jsx global>{`
        .row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 14px 0;
          text-align: center;
        }
        .label {
          color: #111;
          font-size: 1.15rem;
          font-weight: 400;
        }
        .input {
          display: inline-block;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          height: 26px;
          padding: 3px 8px;
          font-size: 13.5px;
          color: #111;
          width: 220px;
          vertical-align: middle;
        }
        .input--xs { width: 100px; }
        .input--smw { width: 120px; }
        .input--lgw { width: 260px; }
        .checkbox { width: 12px; height: 12px; }
        .btn-3d {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #2222;
          background: #fff;
        }
        .btn-white { background: #fff; }
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
