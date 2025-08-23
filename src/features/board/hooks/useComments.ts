import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "../data/comment.api";

export const useComments = (bno: number, page = 1, size = 10, sortBy = "cno") =>
  useQuery({
    queryKey: ["comment", "list", bno, page, size, sortBy],
    queryFn: () => commentApi.read({ bno, page, size, sortBy }),
    select: (res: any) => res, // { bno, page: { dtoList: [...] } }
    enabled: Number.isFinite(bno),
  });

export const useCreateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { bno: number; cWriter: string; cContent: string }) =>
      commentApi.create(body),
    onSuccess: (_res, vars) => {
      // vars.bno 기준으로 해당 글의 댓글 리스트만 갱신
      qc.invalidateQueries({ queryKey: ["comment", "list", vars.bno] });
    },
  });
};

/** ✅ 수정 훅: bno를 인자로 받아 해당 글의 목록 쿼리만 갱신 */
export const useUpdateComment = (bno: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cno: number; cContent: string; cWriter?: string }) =>
      commentApi.update(args.cno, args), // commentApi.update(cno, body)
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comment", "list", bno] });
    },
  });
};

export const useRemoveComment = (bno: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cno: number) => commentApi.remove(cno),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comment", "list", bno] });
    },
  });
};

export const useLikeComment = (bno: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cno: number) => commentApi.like(cno),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comment", "list", bno] });
    },
  });
};
