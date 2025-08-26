// app/member/list/page.tsx
'use client';

import { useMemberList } from '../../../features/member/hooks/useMember';
import Link from 'next/link';

export default function MemberListPage() {
  const { data, loading, error } = useMemberList();

  if (loading) return <main className="mx-auto max-w-[1000px] px-4 py-8">불러오는 중…</main>;
  if (error) return <main className="mx-auto max-w-[1000px] px-4 py-8">오류: {String(error.message)}</main>;

  return (
    <main className="mx-auto max-w-[1000px] px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">회원 목록</h1>
      <div className="overflow-x-auto border rounded-xl">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="[&>th]:px-3 [&>th]:py-2 bg-gray-50 text-left">
              <th>ID</th><th>이름</th><th>이메일</th><th>전화</th><th>권한</th><th>가입일</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((m) => (
              <tr key={m.memberId} className="[&>td]:px-3 [&>td]:py-2 border-t">
                <td>{m.memberId}</td>
                <td>{m.memberName}</td>
                <td>{m.memberEmail}</td>
                <td>{m.memberPhone}</td>
                <td>{String(m.memberRole)}</td>
                <td>{m.createDate?.toString?.() || ''}</td>
                <td>
                  <Link href={`/member/profile?memberId=${encodeURIComponent(m.memberId)}`} className="underline">보기</Link>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
