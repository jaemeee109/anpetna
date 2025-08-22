'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult, // ✅ type으로 import
} from "@tanstack/react-query";
import { boardApi } from "../data/board.api";
import type {
  CreateBoardReq,
  UpdateBoardReq,
  BoardType,
  BoardDetail,
  PageRes,
} from "../data/board.types";

/** 런타임에서 type이 게시판타입인지(=NOTICE/FAQ/FREE/QNA) 판별 */
function isBoardType(v?: string): v is BoardType {
  return v === "NOTICE" || v === "FAQ" || v === "FREE" || v === "QNA";
}

// ✅ 목록 훅
export function useBoardList(
  page: number,
  size: number,
  boardType: string,
  keyword: string
): UseQueryResult<PageRes<BoardDetail>, Error> {
  return useQuery<PageRes<BoardDetail>, Error>({
    queryKey: ["boardList", boardType, page, size, keyword],
    queryFn: () =>
      boardApi.list({
        page,
        size,
        boardType,
        keyword,
      }),
    placeholderData: (prev) => prev,
    staleTime: 10_000,
  });
}

// ✅ 상세 훅 — 원본 { readOneBoard: BoardDetail } → 화면용 BoardDetail 로 변환
export function useBoardDetail(
  bno: number
): UseQueryResult<BoardDetail, Error> {
  return useQuery<{ readOneBoard: BoardDetail }, Error, BoardDetail>({
    queryKey: ["board", bno],
    queryFn: () => boardApi.get(bno), // 원본 그대로 가져옴
    select: (res) => res.readOneBoard, // 여기서 BoardDetail로 변환
  });
}

// ✅ 변형/삭제/좋아요
export function useBoardMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (p: CreateBoardReq) =>
      boardApi.create(p).then((res) => res.createBoard),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });

  const update = useMutation({
    mutationFn: (p: UpdateBoardReq) =>
      boardApi.update(p).then((res) => res.updateBoard),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["board", vars.bno] });
      qc.invalidateQueries({ queryKey: ["boards"] });
    },
  });

  const remove = useMutation({
    mutationFn: (bno: number) => boardApi.remove(bno),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boards"] }),
  });

  const like = useMutation({
    mutationFn: (bno: number) =>
      boardApi.like(bno).then((res) => res.updateBoard),
    onSuccess: (_d, bno) => qc.invalidateQueries({ queryKey: ["board", bno] }),
  });

  return { create, update, remove, like };
}
