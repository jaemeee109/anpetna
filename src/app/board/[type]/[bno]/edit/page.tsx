"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { useBoardDetail, useUpdateBoard } from "@/features/board/hooks/useBoards";

type Img = { uuid?: number; url?: string; sortOrder?: number; fileName?: string };

export default function BoardEditPage() {
  const router = useRouter();
  const { type, bno } = useParams<{ type: string; bno: string }>(); // ✅
  const id = Number(bno);

  const { data: board, isLoading, error } = useBoardDetail(id);
  const updateMut = useUpdateBoard();

  const [writer, setWriter] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [secret, setSecret] = React.useState(false);

  const [origImages, setOrigImages] = React.useState<Img[]>([]);
  const [addFiles, setAddFiles] = React.useState<File[]>([]);
  const [addPreviews, setAddPreviews] = React.useState<string[]>([]);
  const [deleteSet, setDeleteSet] = React.useState<Set<number>>(new Set());
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!board) return;
    setWriter((board as any).bWriter ?? (board as any).writer ?? "");
    setTitle((board as any).bTitle ?? (board as any).title ?? "");
    setContent((board as any).bContent ?? (board as any).content ?? "");
    setPinned((board as any).noticeFlag ?? false);
    setSecret((board as any).isSecret ?? false);
    setOrigImages((board as any).images ?? []);
  }, [board]);

  React.useEffect(() => {
    const urls = addFiles.map((f) => URL.createObjectURL(f));
    setAddPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [addFiles]);

  if (isLoading) return <div className="mx-auto max-w-[700px] px-4">로딩중…</div>;
  if (error || !board) return <div className="mx-auto max-w-[700px] px-4">불러오기 실패</div>;

  const move = (i: number, dir: -1 | 1) =>
    setOrigImages((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });

  const onPickNew = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])]);
    e.currentTarget.value = "";
  };
  const removeNew = (idx: number) => setAddFiles((prev) => prev.filter((_, i) => i !== idx));
  const toggleDelete = (uuid?: number) => {
    if (uuid == null) return;
    setDeleteSet((prev) => {
      const n = new Set(prev);
      if (n.has(uuid)) n.delete(uuid);
      else n.add(uuid);
      return n;
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const json = {
      bno: id,
      bTitle: title,
      bContent: content,
      noticeFlag: pinned,
      isSecret: secret,
    };

    const orders = origImages
      .map((img, i) => (img?.uuid != null ? { uuid: img.uuid!, sortOrder: i } : null))
      .filter(Boolean);

    const deleteUuids = Array.from(deleteSet.values());

    const fd = new FormData();
    fd.append("json", new Blob([JSON.stringify(json)], { type: "application/json" }));
    addFiles.forEach((f) => fd.append("addFiles", f));
    if (deleteUuids.length > 0) fd.append("deleteUuids", new Blob([JSON.stringify(deleteUuids)], { type: "application/json" }));
    if ((orders as any).length > 0) fd.append("orders", new Blob([JSON.stringify(orders)], { type: "application/json" }));

    updateMut.mutate(
      { bno: id, formData: fd }, 
      {
        onSuccess: () => {
          alert("수정되었습니다.");
          router.push(`/board/${type}/${bno}`);
        },
        onError: () => alert("수정 실패"),
      }
    );
  };

  return (
    <section className="mx-auto w-full max-w-[700px] px-4">
      {/* 기존 UI 그대로 */}
      {/* ...나머지 동일... */}
      <form onSubmit={onSubmit} className="mb-12 flex justify-center gap-3">
        <button className="btn-3d btn-white px-4 py-2 text-sm" disabled={updateMut.isPending}>
          {updateMut.isPending ? "저장 중..." : "저장"}
        </button>
        <button type="button" onClick={() => router.push(`/board/${type}/${bno}`)} className="btn-3d btn-white px-4 py-2 text-sm">
          취소
        </button>
      </form>
    </section>
  );
}
