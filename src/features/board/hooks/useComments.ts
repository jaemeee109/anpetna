import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchComments,
  createComment as apiCreate,
  updateComment as apiUpdate,
  removeComment as apiRemove,
  likeComment as apiLike,
} from "@/features/board/data/comment.api";

export function useComments(
  bno: number,
  page = 1,
  size = 20,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["comments", bno, page, size],
    queryFn: () => fetchComments(bno, page, size),
    enabled, // ← 403 등일 때 상세가 막히면 댓글 요청 자체를 안 보냄
  });
}



export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiCreate,
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["comments", vars.bno] });
    },
  });
}

export function useUpdateComment(bno: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiUpdate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", bno] }),
  });
}

export function useRemoveComment(bno: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiRemove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", bno] }),
  });
}

export function useLikeComment(bno: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apiLike,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", bno] }),
  });
}
