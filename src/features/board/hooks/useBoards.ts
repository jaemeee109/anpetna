import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { boardApi } from "../data/board.api";
import type { CreateBoardReq, UpdateBoardReq } from "../data/board.types";

/** 목록 훅 (검색/페이징 포함)
 *  - type: 검색 필드 조합 ("t","c","w","tc","tw","tcw")
 *  - keyword: 검색어
 */
export const useBoardList = (page=1, size=10, type?: string, keyword?: string) =>
  useQuery({
    queryKey: ["board","list", page, size, type ?? "", keyword ?? ""],
    queryFn: () => boardApi.list({ page, size, type, keyword }),
  });

/** 상세 훅
 *  - like=true면 조회와 동시에 좋아요 +1
 */
export const useBoardDetail = (bno: number, like = false) =>
  useQuery({
    queryKey: ["board","detail", bno, like ? "like" : ""],
    queryFn: () => boardApi.get(bno, like),
    enabled: typeof bno === "number",
  });

/** 생성 훅 */
export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBoardReq) => boardApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["board","list"] });
    },
  });
};

/** 수정 훅 */
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

/** 삭제 훅 */
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

/** 좋아요 훅 */
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
