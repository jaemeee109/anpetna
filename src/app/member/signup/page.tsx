// src/app/member/signup/page.tsx
'use client';

import { useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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

  // YYYY/MM/DD 옵션 (만 14세 이상 상한 적용)
  const years = useMemo(() => {
    const now = new Date();
    const maxYear = now.getFullYear() - 14; // 만 14세 기준
    const minYear = Math.max(1900, maxYear - 100);
    const arr: number[] = [];
    for (let y = maxYear; y >= minYear; y--) arr.push(y);
    return arr;
  }, []);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    []
  );
  const days = useMemo(
    () => Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
    []
  );

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


function apiWithPrefix(path: string) {
  const raw = process.env.NEXT_PUBLIC_API_PREFIX;
  const prefix = typeof raw === 'string' ? raw.trim() : '';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const finalPath = prefix ? `${prefix}${normalized}` : normalized;
  return new URL(path, BASE+'/').toString();
}

  // 접두어 없이 URL 생성
  function apiNoPrefix(path: string) {
    return new URL(path, BASE+'/').toString();
  }

  // 안전 트림 + 기본값
  const nz = (v: string, dflt = '-') => (String(v ?? '').trim() || dflt);

  async function readBody(resp: Response) {
    const text = await resp.text().catch(() => '');
    try {
      const j = text ? JSON.parse(text) : null;
      if (j && typeof j === 'object') {
        const msg =
          (j as any).message ||
          (j as any).error ||
          (j as any).detail ||
          (j as any).msg ||
          (j as any).status ||
          (j as any).reason ||
          JSON.stringify(j, null, 2);
        return typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2);
      }
    } catch {}
    return text;
  }

  // 간단 이메일 유효성
  function validateEmail(s: string): boolean {
    const v = String(s || '').trim();
    if (!v.includes('@')) return false;
    // 필요시 정교화 가능: /.+@.+\..+/
    return true;
  }

// === 가입 제출 ===
const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setErr('');

  // 이메일 검증
  if (!validateEmail(form.memberEmail)) {
    setErr("이메일 형식이 올바르지 않습니다. '@'를 포함해 입력해주세요.");
    return;
  }

  // 만 14세 검증
  const now = new Date();
  const by = parseInt(form.memberBirthY || '0', 10);
  const bm = parseInt(form.memberBirthM || '0', 10);
  const bd = parseInt(form.memberBirthD || '0', 10);
  if (!by || !bm || !bd) {
    setErr('생년월일을 모두 선택해주세요.');
    return;
  }
  const birth = new Date(by, bm - 1, bd);
  const minAllowed = new Date(now.getFullYear() - 14, now.getMonth(), now.getDate());
  if (birth > minAllowed) {
    alert('만 14세 미만은 가입할 수 없습니다.');
    return;
  }

  setSubmitting(true);
  try {
    // 백엔드 DTO 키에 맞춰 전송 (기존 그대로)
    const body = {
      ...form,
      memberGender: 'U',
      emailStsYn: 'N',
      memberRole: 'USER',
      memberSocial: false,
      memberEtc: '',
    };

    const resp = await fetch(apiWithPrefix('member/join'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      // ▼ 서버 응답 본문에서 resMessage/메시지 우선 추출
      const raw = await resp.text().catch(() => '');
      let json: any = null;
      try { json = raw ? JSON.parse(raw) : null; } catch {}
      const serverMsg =
        json?.resMessage ||
        json?.message ||
        json?.error ||
        json?.detail ||
        json?.reason ||
        raw;

      // ▼ 중복 아이디 판단: 상태 409 또는 메시지 키워드
      const lower = String(serverMsg || '').toLowerCase();
      const isDupStatus = resp.status === 409; // (전역 핸들러 적용 시)
      const isDupText =
        lower.includes('duplicate') ||
        lower.includes('already') ||
        lower.includes('중복') ||
        lower.includes('이미');

      if (isDupStatus || isDupText) {
        alert('이미 가입한 ID 입니다');
        // 화면에 JSON/원문을 출력하지 않도록 err 상태는 건드리지 않고 종료
        return;
      }

      // 그 외 실패는 깔끔한 알럿만
      alert(serverMsg || `회원가입 실패 (HTTP ${resp.status})`);
      return; // 화면에 JSON 노출 방지
    }

    alert('가입되었습니다.');
    router.replace('/member/login');
  } catch (e: any) {
    // 네트워크/예외 등은 알럿만 보여주고 화면에는 노출하지 않음
    alert(e?.message || '가입 실패');
    setErr(null);
  } finally {
    setSubmitting(false);
  }
};


  return (
    <main className="mx-auto max-w-[720px] px-4 py-8 text-center">
      <br />
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
          <path d="M12 12c-3 0-5.5 2-5.5 4.5 0 1.4 1 2.5 2.5 2.5 1.1 0 2.1-.6 3-1 0.9.4 1.9 1 3 1 1.5 0 2.5-1.1 2.5-2.5 0-2.5-2.5-4.5-5.5-4.5z" />
        </svg>
      </h1>

      <hr className="border-gray-200 mb-6" />
      <br />

      <form onSubmit={onSubmit}>
        <Row label="ID">
          <input
            className="input"
            value={form.memberId}
            onChange={(e) => set('memberId', e.target.value)}
          />
        </Row>

        <Row label="PASSWORD">
          <input
            className="input"
            type="password"
            value={form.memberPw}
            onChange={(e) => set('memberPw', e.target.value)}
          />
        </Row>

        <Row label="NAME">
          <input
            className="input"
            value={form.memberName}
            onChange={(e) => set('memberName', e.target.value)}
          />
        </Row>

        <Row label="Birthday">
          <div className="inline-flex flex-nowrap items-center gap-2">
            <select
              className="input input--smw"
              value={form.memberBirthY}
              onChange={(e) => set('memberBirthY', e.target.value)}
            >
              <option value="">YEAR</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <span>&nbsp;</span>
            <select
              className="input input--xs"
              value={form.memberBirthM}
              onChange={(e) => set('memberBirthM', e.target.value)}
            >
              <option value="">MONTH</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span>&nbsp;</span>
            <select
              className="input input--xs"
              value={form.memberBirthD}
              onChange={(e) => set('memberBirthD', e.target.value)}
            >
              <option value="">DAY</option>
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
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
            <input
              className="input"
              value={form.memberPhone}
              onChange={(e) => set('memberPhone', e.target.value)}
            />
            <label className="inline-flex items-center gap-1 text-sm text-gray-400">
              &nbsp; SMS&nbsp;
              <input
                type="checkbox"
                className="checkbox"
                checked={form.smsStsYn === 'Y'}
                onChange={(e) => set('smsStsYn', e.target.checked ? 'Y' : 'N')}
              />
            </label>
          </div>
        </Row>

        <Row label="E-mail">
          <input
            className="input"
            placeholder="'@' 포함해서 입력해주세요"
            value={form.memberEmail}
            onChange={(e) => set('memberEmail', e.target.value)}
          />
        </Row>

        <Row label="ZipCode">
          <input
            className="input input--xs"
            value={form.memberZipCode}
            onChange={(e) => set('memberZipCode', e.target.value)}
          />
        </Row>

        <Row label="RoadAddress">
          <input
            className="input input--lgw"
            placeholder="도로명 주소를 입력해주세요"
            value={form.memberRoadAddress}
            onChange={(e) => set('memberRoadAddress', e.target.value)}
          />
        </Row>

        <Row label="DetailAddress">
          <input
            className="input input--lgw"
            placeholder="상세 주소를 입력해주세요"
            value={form.memberDetailAddress}
            onChange={(e) => set('memberDetailAddress', e.target.value)}
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

        <br />
        <div className="h-2" />
        <hr className="border-gray-200" />
        <div className="h-4" />
        <br />

        <div className="flex justify-center gap-3">
          <button type="submit" className="btn-3d btn-white text-black" disabled={true}>
            {/*{submitting ? '처리 중…' : '가입하기'}*/ '가입하기'}
          </button>
          <button type="button" className="btn-3d btn-white" onClick={() => router.back()}>
            취소
          </button>
        </div>

        <br />
        <br />
        <br />
        <br />
        <br />

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
        .input--xs {
          width: 100px;
        }
        .input--smw {
          width: 120px;
        }
        .input--lgw {
          width: 260px;
        }
        .checkbox {
          width: 12px;
          height: 12px;
        }
        .btn-3d {
          padding: 8px 14px;
          border-radius: 10px;
          border: 1px solid #2222;
          background: #fff;
        }
        .btn-white {
          background: #fff;
        }
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
