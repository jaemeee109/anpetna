"use client";

type Props = {
  type: string;
  page: number;
  size: number;
  total: number;
  items: any[];
  isLoading: boolean;
};

export function BasicList({ type, items, isLoading }: Props) {
  if (isLoading) return <div>로딩중…</div>;
  if (!items.length) return <div className="text-gray-500">게시글이 없습니다</div>;

  return (
    <ul className="divide-y">
      {items.map((b: any) => (
        <li key={b.bno} className="py-3">
          <a href={`/board/${type}/${b.bno}`} className="hover:underline">
            {b.btitle}
          </a>
          <div className="text-sm text-gray-500">
            {b.bwriter} · {new Date(b.createDate).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
