// features/board/hooks/useBoards.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "../data/board.api";
import type { CreateBoardReq, UpdateBoardReq, BoardDetail } from "../data/board.types";

export const useBoardList = (page=1, size=10, type?: string, keyword?: string) =>
  useQuery({
    queryKey: ["board","list", page, size, type ?? "", keyword ?? ""],
    queryFn: () => boardApi.list({ page, size, type, keyword }),
  });

/** ✅ 상세 훅: BoardDetail 그대로 반환 (select 없음) */
export const useBoardDetail = (bno: number) =>
  useQuery<BoardDetail>({
    queryKey: ["board","detail", bno],
    queryFn: () => boardApi.get(bno),
    enabled: Number.isFinite(bno),
  });

export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBoardReq) => boardApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board","list"] });
    },
  });
};

export const useUpdateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBoardReq) => boardApi.update(payload),
    onSuccess: (_res, vars) => {
      if (typeof vars?.bno === "number") {
        qc.invalidateQueries({ queryKey: ["board","detail", vars.bno] });
      }
      qc.invalidateQueries({ queryKey: ["board","list"] });
    },
  });
};

export const useRemoveBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => boardApi.remove(bno),
    onSuccess: (_res, bno) => {
      qc.invalidateQueries({ queryKey: ["board","list"] });
      qc.invalidateQueries({ queryKey: ["board","detail", bno] });
    },
  });
};

export const useLikeBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => boardApi.like(bno),
    onSuccess: (_res, bno) => {
      qc.invalidateQueries({ queryKey: ["board","detail", bno] });
      qc.invalidateQueries({ queryKey: ["board","list"] });
    },
  });
};
