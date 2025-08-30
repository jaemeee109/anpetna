// src/features/board/hooks/useBoards.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBoards,
  fetchBoardById,
  createBoard,
  createBoardByFormData, // ✅ 추가
  updateBoard,
  removeBoard,
  likeBoard,
  updateBoardByFormData,
  type FetchBoardsParams,
} from '@/features/board/data/board.api';
import type { UpdateBoardReq } from '@/features/board/data/board.types';

type UpdateBoardArg = UpdateBoardReq & { images?: File[] };
type UpdateBoardFormArg = { bno: number; formData: FormData };

const qk = {
  list: (params?: FetchBoardsParams) => ['board', 'list', params] as const,
  detail: (bno: number) => ['board', 'detail', bno] as const,
};

export function useBoardList(params?: FetchBoardsParams) {
  return useQuery({
    queryKey: qk.list(params),
    queryFn: () => fetchBoards(params ?? {}),
    staleTime: 30_000,
  });
}

export function useBoardDetail(bno: number | string | undefined) {
  const id = typeof bno === 'string' ? Number(bno) : bno;
  return useQuery({
    enabled: !!id,
    queryKey: qk.detail(id as number),
    queryFn: () => fetchBoardById(id as number),
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    // ✅ FormData가 오면 그대로 전송, 아니면 기존 JSON + files 방식
    mutationFn: (payload: any) => {
      if (typeof FormData !== 'undefined' && payload instanceof FormData) {
        return createBoardByFormData(payload);
      }
      return createBoard(payload?.json ?? payload, payload?.files);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', 'list'] });
    },
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBoardArg | UpdateBoardFormArg) => {
      if ((payload as any).formData) return updateBoardByFormData(payload as UpdateBoardFormArg);
      return updateBoard(payload as UpdateBoardArg);
    },
    onSuccess: (_data, vars) => {
      const bno = (vars as any).bno ?? (vars as any).id;
      qc.invalidateQueries({ queryKey: ['board', 'list'] });
      if (bno) qc.invalidateQueries({ queryKey: ['board', 'detail', bno] });
    },
  });
}

export function useRemoveBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => removeBoard(bno),
    onSuccess: (_data, bno) => {
      qc.invalidateQueries({ queryKey: ['board', 'list'] });
      if (bno) qc.removeQueries({ queryKey: qk.detail(bno) });
    },
  });
}

export function useLikeBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bno: number) => likeBoard(bno),
    onSuccess: (_data, bno) => {
      if (bno) qc.invalidateQueries({ queryKey: qk.detail(bno) });
    },
  });
}

// 선택: 밖으로 타입 노출
export type { FetchBoardsParams } from '@/features/board/data/board.api';
