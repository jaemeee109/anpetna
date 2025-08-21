'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardApi } from '../data/board.api';
import type { CreateBoardReq, UpdateBoardReq } from '../data/board.types';

export function useBoardList(params: { page?: number; size?: number; type?: string; keyword?: string }) {
  return useQuery({
    queryKey: ['boards', params],
    queryFn: () => boardApi.list(params),
  });
}

export function useBoardDetail(bno: number) {
  return useQuery({
    queryKey: ['board', bno],
    queryFn: () => boardApi.get(bno).then(res => res.readOneBoard), // unwrap 구조에 맞춤
  });
}

export function useBoardMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (p: CreateBoardReq) => boardApi.create(p).then(res => res.createBoard),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  const update = useMutation({
    mutationFn: (p: UpdateBoardReq) => boardApi.update(p).then(res => res.updateBoard),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['board', vars.bno] });
      qc.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  const remove = useMutation({
    mutationFn: (bno: number) => boardApi.remove(bno),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  });

  const like = useMutation({
    mutationFn: (bno: number) => boardApi.like(bno).then(res => res.updateBoard),
    onSuccess: (_d, bno) => qc.invalidateQueries({ queryKey: ['board', bno] }),
  });

  return { create, update, remove, like };
}
