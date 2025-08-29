// src/features/comment/data/comment.api.ts
import { http } from "@/shared/data/http";
import { withPrefix } from "@/lib/api";

export async function fetchComments(boardId: number | string) {
  const res = await http.get(withPrefix(`/comment`), { params: { boardId } });
  return res.data;
}

export async function createComment(payload: { boardId: number | string; content: string }) {
  const res = await http.post(withPrefix(`/comment`), payload);
  return res.data;
}

export async function deleteComment(commentId: number | string) {
  const res = await http.delete(withPrefix(`/comment/${commentId}`));
  return res.data;
}
