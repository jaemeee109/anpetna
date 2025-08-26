// app/member/profile/page.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMyProfile } from '../../../features/member/hooks/useMember';
import type { ModifyMemberReq } from '../../../features/member/data/member.types';

export default function ProfilePage() {
  const sp = useSearchParams();
  const paramId = (sp.get('memberId') || '').trim();
  const { member, loading, error, update, remove, memberId } = useMyProfile(paramId || undefined);

  const [patch, setPatch] = useState<ModifyMemberReq>({ memberId: memberId || '' });

  function set<K extends keyof ModifyMemberReq>(k: K, v: ModifyMemberReq[K]) {
    setPatch((p) => ({ ...p, [k]: v, memberId: memberId || p.memberId }));
  }

  if (!memberId) {
    return <main className="mx-auto max-w-[800px] px-4 py-8">로그인이 필요하거나 memberId가 없습니다. (URL에 ?memberId=아이디)</main>;
  }
  if (loading) return <main className="mx-auto max-w-[800px] px-4 py-8">불러오는 중…</main>;
  if (error) return <main className="mx-auto max-w-[800px] px-4 py-8">오류: {String(error.message)}</main>;
  if (!member) return <main className="mx-auto max-w-[800px] px-4 py-8">회원 정보를 찾을 수 없습니다.</main>;

  return (
    <main className="mx-auto max-w-[800px] px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">마이페이지</h1>
      <p className="text-gray-500 mb-6">ID: <b>{member.memberId}</b></p>

      <section className="space-y-4">
        <Row label="이름">{member.memberName}</Row>
        <Row label="생년월일">{`${member.memberBirthY}-${member.memberBirthM}-${member.memberBirthD} (${member.memberBirthGM})`}</Row>
        <Row label="성별">{member.memberGender}</Row>
        <Row label="주소">{`${member.memberRoadAddress} ${member.memberDetailAddress} (${member.memberZipCode})`}</Row>
        <Row label="연락처">{member.memberPhone}</Row>
        <Row label="이메일">{member.memberEmail}</Row>
        <Row label="권한">{String(member.memberRole)}</Row>
      </section>

      <h2 className="text-xl font-semibold mt-8 mb-4">정보 수정</h2>
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="비밀번호 (변경)">
          <input className="input" type="password" onChange={e => set('memberPw', e.target.value)} />
        </Field>
        <Field label="전화번호">
          <input className="input" defaultValue={member.memberPhone} onChange={e => set('memberPhone', e.target.value)} />
        </Field>
        <Field label="이메일">
          <input className="input" defaultValue={member.memberEmail} onChange={e => set('memberEmail', e.target.value)} />
        </Field>
        <Field label="문자수신">
          <select className="input" defaultValue={member.smsStsYn} onChange={e => set('smsStsYn', e.target.value)}>
            <option value="Y">수신</option><option value="N">거부</option>
          </select>
        </Field>
        <Field label="이메일수신">
          <select className="input" defaultValue={member.emailStsYn} onChange={e => set('emailStsYn', e.target.value)}>
            <option value="Y">수신</option><option value="N">거부</option>
          </select>
        </Field>
        <Field label="반려동물">
          <select className="input" defaultValue={member.memberHasPet} onChange={e => set('memberHasPet', e.target.value)}>
            <option value="Y">있음</option><option value="N">없음</option>
          </select>
        </Field>
        <Field label="도로명주소">
          <input className="input" defaultValue={member.memberRoadAddress} onChange={e => set('memberRoadAddress', e.target.value)} />
        </Field>
        <Field label="상세주소">
          <input className="input" defaultValue={member.memberDetailAddress} onChange={e => set('memberDetailAddress', e.target.value)} />
        </Field>
        <Field label="우편번호">
          <input className="input" defaultValue={member.memberZipCode} onChange={e => set('memberZipCode', e.target.value)} />
        </Field>
      </div>

      <div className="flex gap-2 justify-end mt-4">
        <button
          className="btn-3d btn-white"
          onClick={async () => {
            const res = await update(patch);
            alert('수정되었습니다.');
          }}
        >
          저장
        </button>
        <button
          className="btn-3d"
          style={{ background: '#fee2e2', borderColor: '#fecaca' }}
          onClick={async () => {
            if (!confirm('정말 탈퇴하시겠어요?')) return;
            await remove();
            alert('삭제되었습니다.');
            location.href = '/';
          }}
        >
          회원탈퇴
        </button>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px 12px; }
        .btn-3d { padding: 10px 16px; border-radius: 10px; border: 1px solid #2222; }
        .btn-white { background: #fff; }
      `}</style>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-1">
      <div className="w-28 text-gray-500">{label}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
