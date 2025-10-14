'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBoards,
  fetchBoardById,
  createBoard,
  createBoardByFormData,
  updateBoard,
  updateBoardByFormData,
  removeBoard,
  likeBoard,
  type FetchBoardsParams,
} from '@/features/board/data/board.api';
import type { UpdateBoardReq } from '@/features/board/data/board.types';
import type { BoardDetail } from '@/features/board/data/board.types';

type UpdateBoardArg = UpdateBoardReq & { images?: File[] };
type UpdateBoardFormArg = { bno: number; formData: FormData };

const qk = {
  list: (params?: FetchBoardsParams) => ['board', 'list', params] as const,
  detail: (bno: number) => ['board', 'detail', bno] as const,
};

/**
 * 게시판 목록
 * - 인자 정규화(type → boardType, q → keyword)까지 내부에서 처리
 */
// src/features/board/hooks/useBoards.ts 내 함수만 교체
export function useBoardList(params?: FetchBoardsParams & { enabled?: boolean }) {
  // ✅ 인자 정규화 (type → boardType, q → keyword)
  const page = Number(params?.page ?? 1) || 1;
  const size = Number(params?.size ?? 10) || 10;
  const boardType = (params?.boardType ?? params?.type ?? '').toUpperCase();
  const keyword = params?.keyword ?? params?.q ?? '';

  // ✅ 실행 제어 플래그 (기본 true)
  const enabled = params?.enabled ?? true;

  const norm: FetchBoardsParams = { page, size, boardType, keyword };

  return useQuery({
    queryKey: qk.list(norm),
    queryFn: () => fetchBoards(norm),
    staleTime: 30_000,
    // ✅ type이 유효하고, 호출자가 넘긴 enabled가 true일 때만 실제 fetch
    enabled: !!boardType && enabled,
  });
}


/**
 * 게시글 상세
 * - string/undefined도 받아서 내부에서 number로 변환
 * - opts.enabled로 첫 렌더 비활성 같은 제어 가능
 */
export function useBoardDetail(
  bno: number | string | undefined,
  opts?: { enabled?: boolean }
) {
  const id = typeof bno === 'string' ? Number(bno) : bno;
  return useQuery<BoardDetail>({
    queryKey: qk.detail((id as number) ?? 0),
    queryFn: () => fetchBoardById(id as number),
    enabled: !!id && (opts?.enabled ?? true),

    /** ===== 여기부터 핵심: '한참 로딩' 제거용 옵션 ===== */
    // 403/404 등 권한/부재 에러는 즉시 실패로 처리(재시도 금지)
    retry: (failureCount, err: any) => {
      const status = err?.status ?? err?.response?.status;
      if (status === 403 || status === 404) return false;
      // 그 외(네트워크 오류 등)도 재시도 0~1회로 최소화
      return failureCount < 1;
    },
    retryDelay: 0,                 // 재시도 대기 제거
    refetchOnWindowFocus: false,   // 포커스 재조회로 인한 깜빡임 방지
    gcTime: 5 * 60 * 1000,         // 기본값 유지(원하시면 조정 가능)
    staleTime: 0,                  // 항상 서버 권한 최신 반영
  });
}

/**
 * 게시글 생성
 * - FormData/JSON 모두 지원
 */
export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
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

/**
 * 게시글 수정
 * - FormData/일반 JSON 동시 지원
 */
export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBoardArg | UpdateBoardFormArg) => {
      if ((payload as any).formData) {
        return updateBoardByFormData(payload as UpdateBoardFormArg);
      }
      return updateBoard(payload as UpdateBoardArg);
    },
    onSuccess: (_data, vars) => {
      const bno = (vars as any).bno ?? (vars as any).id;
      qc.invalidateQueries({ queryKey: ['board', 'list'] });
      if (bno) qc.invalidateQueries({ queryKey: ['board', 'detail', bno] });
    },
  });
}

/**
 * 게시글 삭제
 * - 성공 시 목록 무효화 + 상세 캐시 제거
 */
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

/**
 * 게시글 좋아요
 * - 두 가지 사용 모두 지원:
 *   1) const mut = useLikeBoard(123); mut.mutate();
 *   2) const mut = useLikeBoard();   mut.mutate(123);
 * - 성공 시 상세/목록 쿼리 모두 갱신
 */
export function useLikeBoard(fixedBno?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ['board', 'like', fixedBno ?? 'param'],
    mutationFn: async (bno?: number) => {
      const target = (bno ?? fixedBno)!;
      return likeBoard(target);
    },
    onSuccess: (_res, bnoArg) => {
      const target = (bnoArg ?? fixedBno)!;
      if (!target) return;
      qc.invalidateQueries({ queryKey: ['board', 'detail', target] });
      qc.invalidateQueries({ queryKey: ['board'] });
    },
  });
}

// 선택: 밖으로 타입 노출
export type { FetchBoardsParams } from '@/features/board/data/board.api';
