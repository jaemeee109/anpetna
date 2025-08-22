import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentApi } from "../data/comment.api";

export const useComments = (bno: number, page=1, size=10, sortBy="cno") =>
  useQuery({
    queryKey: ["comment","list", bno, page, size, sortBy],
    queryFn: () => commentApi.read({ bno, page, size, sortBy }),
    enabled: typeof bno === "number",
  });

export const useCreateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { bno: number; cWriter: string; cContent: string }) =>
      commentApi.create(body),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ["comment","list", vars.bno] });
    },
  });
};

export const useUpdateComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { cno: number; cContent?: string; cLikeCount?: number; cWriter?: string }) =>
      commentApi.update(args.cno, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comment"] }),
  });
};

export const useRemoveComment = (bno: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cno: number) => commentApi.remove(cno),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comment","list", bno] }),
  });
};

export const useLikeComment = (bno: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cno: number) => commentApi.like(cno),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comment","list", bno] }),
  });
};
