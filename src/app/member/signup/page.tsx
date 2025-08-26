// app/member/signup/page.tsx
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
  memberHasPet: YesNo; // ✅ 추가: 반려동물 여부
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
    memberHasPet: 'N', // ✅ 기본값: 없음
  });

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = <K extends keyof Form,>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleGM = (v: GM) => set('memberBirthGM', v);

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

      // 서버에서 필요하지만 UI에 노출하지 않는 필드는 기본값으로 처리
      const payload = {
        ...form,
        memberGender: 'U',
        emailStsYn: 'N',
        memberRole: 'USER',
        memberSocial: false,
        memberEtc: '',
        // ✅ 반려동물 여부는 이제 사용자가 선택한 값 전송
        memberHasPet: form.memberHasPet,
      };

      const resp = await fetch('/member/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const t = await resp.text().catch(() => '');
        throw new Error(`회원가입 실패 (HTTP ${resp.status})\n${t.slice(0, 200)}`);
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
      {/* 타이틀 + 너가 붙인 SVG (크기는 글자 크기에 맞춰 1em) */}
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

      {/* 밝은 회색 실선 (유지) */}
      <hr className="border-gray-200 mb-6" />
<br></br>
      <form onSubmit={onSubmit}>
        {/* 라벨 + 입력칸 한 줄, 전체 가운데 정렬 (유지) */}
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
            {/* SMS 라벨만 연한 회색(유지) */}
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

        {/* ✅ 새로 추가: DetailAddress 바로 아래 — Have a Pet? YES / NO (체크박스) */}
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
        {/* 여백 + 밝은 회색 실선 (유지) */}
        <div className="h-2" />
        <hr className="border-gray-200" />
        <div className="h-4" />
        <br></br>

        {/* 버튼: 가운데 정렬 / 가입하기=흰 바탕 검정 글씨 (유지) */}
        <div className="flex justify-center gap-3">
          <button type="submit" className="btn-3d btn-white text-black" disabled={submitting}>
            {submitting ? '처리 중…' : '가입하기'}
          </button>
          <button type="button" className="btn-3d btn-white" onClick={() => router.back()}>
            취소
          </button>
        </div>
<br></br>
<br></br>
<br></br>
<br></br>
<br></br>
        {err && <p className="text-red-600 text-sm text-center mt-2">{err}</p>}
      </form>

      {/* 스타일 (기존 유지) */}
      <style jsx global>{`
        /* 라벨 + 입력칸 한 줄, 가운데 정렬 */
        .row {
          display: flex;
          align-items: center;
          justify-content: center; /* 가운데 정렬 */
          gap: 12px;
          margin: 14px 0; /* 줄 간격 */
          text-align: center;
        }

        /* 라벨 폰트 크기 (유지: 굵게 X) */
        .label {
          color: #111;
          font-size: 1.15rem;
          font-weight: 400;
        }

        .input {
          display: inline-block;
          border: 1px solid #e5e7eb; /* 밝은 회색 테두리 */
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
