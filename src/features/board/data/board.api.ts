// features/board/data/board.api.ts
import { http } from '@/shared/data/http';
import type {
  BoardDetail as BoardDTO,
  CreateBoardReq,
  UpdateBoardReq,
  PageRes,
  BoardDetail,
} from './board.types';

const BASE_PATH = '/anpetna/board';

function unwrap<T>(r: any): T {
  return (r?.data?.result ?? r?.data) as T;
}

export const boardApi = {
  get: async (bno: number): Promise<BoardDetail> => {
    // ✅ 1차: /readOne/{bno} (PathVariable 방식)
    try {
      const r = await http.get(`${BASE_PATH}/readOne/${bno}`);
      const data = (r as any)?.data ?? r;
      const result = data?.result ?? data;
      const detail =
        result?.readOneBoard ??    // { result: { readOneBoard: {...} } }
        result?.board ??           // { result: { board: {...} } }
        result ??                  // { result: {...} } or {...}
        null;
      if (!detail) throw new Error('board/readOne invalid response');
      return detail as BoardDetail;
    } catch (err) {
      // ✅ 2차 폴백: /readOne?bno= (RequestParam 방식일 때)
      const r2 = await http.get(`${BASE_PATH}/readOne`, { params: { bno } });
      const data2 = (r2 as any)?.data ?? r2;
      const result2 = data2?.result ?? data2;
      const detail2 =
        result2?.readOneBoard ??
        result2?.board ??
        result2 ?? null;
      if (!detail2) throw new Error('board/readOne invalid response (fallback)');
      return detail2 as BoardDetail;
    }
  },


  list: (opts: {
    page?: number | string;
    size?: number | string;
    keyword?: string;
    boardType?: string;
    type?: string;
  }) => {
    const page1 = Number(opts.page ?? 1);
    const sizeN = Number(opts.size ?? 10);
    const boardKind =
      (opts.boardType ?? opts.type ?? '').toString().trim().toUpperCase() || 'NOTICE';

    return http
      .get(`${BASE_PATH}/readAll`, {
        params: { page: page1, size: sizeN, type: boardKind, keyword: opts.keyword ?? '' },
      })
      .then((r) => unwrap<PageRes<BoardDTO>>(r));
  },

  create: (payload: CreateBoardReq) =>
    http.post(`${BASE_PATH}/create`, payload).then((r) => unwrap<{ createBoard: BoardDTO }>(r)),
  update: (payload: UpdateBoardReq) =>
    http.post(`${BASE_PATH}/update/${payload.bno}`, payload).then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),
  remove: (bno: number) =>
    http.post(`${BASE_PATH}/delete/${bno}`).then((r) => unwrap<{ deleteBoard: BoardDTO }>(r)),
  like: (bno: number) =>
    http.post(`${BASE_PATH}/like/${bno}`).then((r) => unwrap<{ updateBoard: BoardDTO }>(r)),
};

// 목록 조회
export async function fetchBoards(params: {
  page: number;
  size: number;
  boardType: string;  // "NOTICE" | "FREE" | "QNA" | "FAQ"
  keyword?: string;
}) {
  const { page, size, boardType, keyword } = params;

  // ✅ 컨트롤러 URL과 동일 (/anpetna/board/readAll)
  const { data } = await http.get("/anpetna/board/readAll", {
    params: {
      page,
      size,
      boardType,             // ✅ 반드시 전송
      keyword: keyword || "",
    },
  });

  return data;
}