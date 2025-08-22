import { http } from '@/shared/data/http';
import type { BoardDetail as BoardDTO, CreateBoardReq, UpdateBoardReq, PageRes, BoardDetail } from './board.types';

const BASE_PATH = '/anpetna/board';

function unwrap<T>(r: any): T {
  return (r?.data?.result ?? r?.data) as T;
}

export const boardApi = {
  list: (opts: { page?: number | string; size?: number | string; keyword?: string; boardType?: string; type?: string; }) => {
    const page1 = Number(opts.page ?? 1);
    const sizeN = Number(opts.size ?? 10);
    const boardKind = (opts.boardType ?? opts.type ?? "").toString().trim().toUpperCase() || "NOTICE";

    return http
      .get(`${BASE_PATH}/readAll`, {
        params: { page: page1, size: sizeN, type: boardKind, keyword: opts.keyword ?? "" },
      })
      .then((r) => unwrap<PageRes<BoardDTO>>(r));
  },

  // ✅ get은 "원본" 그대로: { readOneBoard: BoardDetail }
  get: (bno: number, like = false): Promise<{ readOneBoard: BoardDetail }> =>
    http
      .get(`${BASE_PATH}/readOne/${bno}${like ? '?like=true' : ''}`)
      .then((r) => unwrap<{ readOneBoard: BoardDetail }>(r)),

  create: (payload: CreateBoardReq) =>
    http.post(`${BASE_PATH}/create`, payload)
       .then((r) => unwrap<{ createBoard: BoardDTO }>(r)),

  update: (payload: UpdateBoardReq) =>
    http.post(`${BASE_PATH}/update/${payload.bno}`, payload)
       .then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),

  remove: (bno: number) =>
    http.post(`${BASE_PATH}/delete/${bno}`)
       .then((r) => unwrap<{ deleteBoard: BoardDTO }>(r)),

  like: (bno: number) =>
    http.post(`${BASE_PATH}/like/${bno}`)
       .then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),
};
