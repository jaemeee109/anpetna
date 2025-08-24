// features/board/hooks/useBoards.ts
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { fetchBoards } from "@/features/board/data/board.api";
import { boardApi } from "../data/board.api";
import type { CreateBoardReq, UpdateBoardReq, BoardDetail } from "../data/board.types";

/* 기존 주석된 버전은 냅둬도 되고 지워도 됨
export const useBoardList = (page=1, size=10, type?: string, keyword?: string) =>
  useQuery({
    queryKey: ["board","list", page, size, type ?? "", keyword ?? ""],
    queryFn: () => boardApi.list({ page, size, type, keyword }),
  });
*/

export function useBoardList(page: number, size: number, type: string, keyword: string) {
  const boardType = (type || "").toUpperCase();

  return useQuery({
    queryKey: ["boards", boardType, page, size, keyword],
    queryFn: async () => {
      const res = await fetchBoards({ page, size, boardType, keyword });
      if (typeof window !== "undefined") console.log("[useBoardList] response:", res);
      return res;
    },
    placeholderData: keepPreviousData,   // ← v5 방식
    staleTime: 5_000,
  });
}

/** ✅ 상세 훅 */
export const useBoardDetail = (bno: number) =>
  useQuery<BoardDetail>({
    queryKey: ["board", "detail", bno],
    queryFn: () => boardApi.get(bno),
    enabled: Number.isFinite(bno),
  });

export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBoardReq) => boardApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board", "list"] });
    },
  });
};

export const useUpdateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBoardReq) => boardApi.update(payload),
    onSuccess: (_res, vars) => {
      if (typeof vars?.bno === "number") {
        qc.invalidateQueries({ queryKey: ["board", "detail", vars.bno] });
      }
      qc.invalidateQueries({ queryKey: ["board", "list"] });
    },
  });
};

export const useRemoveBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => boardApi.remove(bno),
    onSuccess: (_res, bno) => {
      qc.invalidateQueries({ queryKey: ["board", "list"] });
      qc.invalidateQueries({ queryKey: ["board", "detail", bno] });
    },
  });
};

export const useLikeBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => boardApi.like(bno),
    onSuccess: (_res, bno) => {
      qc.invalidateQueries({ queryKey: ["board", "detail", bno] });
      qc.invalidateQueries({ queryKey: ["board", "list"] });
    },
  });
};
