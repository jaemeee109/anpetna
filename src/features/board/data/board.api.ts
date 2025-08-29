// src/features/board/data/board.api.ts
import { http, getAccessToken } from '@/shared/data/http';
import type {
  BoardDetail,
  CreateBoardReq,
  UpdateBoardReq,
  PageRes,
} from './board.types';

const BASE_PATH = '/board'; // 백엔드가 /anpetna/board 라면 '/anpetna/board'로 바꿔주세요.

function unwrap<T>(r: any): T {
  const data = (r as any)?.data ?? r;
  return (data?.result ?? data) as T;
}

/** 목록 조회 */
export async function fetchBoardList(params?: {
  page?: number;
  size?: number;
  type?: string;        // t,c,w 등 검색 타입 사용 시
  keyword?: string;
  boardType?: string;   // NOTICE/FREE/QNA/FAQ
  category?: string;
}) {
  // [HARDEN] params undefined로 들어올 때 axios 내부에서 병합 에러 방지
  const safe = params ?? {};
  const r = await http.get(`${BASE_PATH}/readAll`, { params: safe });
  return unwrap<PageRes<BoardDetail>>(r);
}

/** 단건 조회 */
export async function fetchBoardById(bno: number, opts?: { like?: boolean }) {
  const like = opts?.like ?? false;
  const r = await http.get(`${BASE_PATH}/readOne/${bno}`, { params: { like } });
  return unwrap<BoardDetail>(r);
}

/** 등록 (FormData: json + files[]) */
export async function createBoardByFormData(body: CreateBoardReq, files?: File[]) {
  const fd = new FormData();

  // [FIX] Spring이 @RequestPart("json")를 안정적으로 파싱하도록 파일명까지 함께 지정
  fd.append(
    'json',
    new Blob([JSON.stringify(body ?? {})], { type: 'application/json' }),
    'payload.json'
  );

  (files ?? []).forEach(f => fd.append('files', f));

  const token = getAccessToken(); // localStorage 또는 쿠키에서 읽음

  const r = await http.post(`${BASE_PATH}/create`, fd, {
    // [KEEP] Content-Type 수동 지정 금지(axios가 boundary 포함 자동 세팅)
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true, // 쿠키를 병행한다면 유지, 아니라면 제거해도 무방
  });

  return unwrap<any>(r);
}

/** 수정 (FormData: json + addFiles[] + deleteUuids(JSON) + orders(JSON)) */
export async function updateBoardByFormData(
  bno: number,
  body: Omit<UpdateBoardReq, 'bno'>,
  opts?: {
    addFiles?: File[];
    deleteUuids?: number[];              // 삭제할 이미지 uuid들
    orders?: Array<{ uuid: number; sortOrder: number }>;
  }
) {
  const fd = new FormData();

  // [FIX] 여기서도 파일명 지정
  fd.append(
    'json',
    new Blob([JSON.stringify(body ?? {})], { type: 'application/json' }),
    'payload.json'
  );

  (opts?.addFiles ?? []).forEach(f => fd.append('addFiles', f));

  if (opts?.deleteUuids?.length) {
    fd.append('deleteUuids',
      new Blob([JSON.stringify(opts.deleteUuids)], { type: 'application/json' }),
      'deleteUuids.json'
    );
  }
  if (opts?.orders?.length) {
    fd.append('orders',
      new Blob([JSON.stringify(opts.orders)], { type: 'application/json' }),
      'orders.json'
    );
  }

  const token = getAccessToken();

  const r = await http.post(`${BASE_PATH}/update/${bno}`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });

  return unwrap<any>(r);
}

/** 삭제 */
export async function removeBoard(bno: number) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/delete/${bno}`, undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });
  return unwrap<any>(r);
}

/** 좋아요 */
export async function likeBoard(bno: number) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/like/${bno}`, undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  });
  return unwrap<any>(r);
}

/* ─────────────────────────────────────────────────────────────
   훅(useBoards.ts)과의 호환용 이름들
   - useBoards.ts 가 fetchBoards, createBoard, updateBoard 를 임포트함
   ──────────────────────────────────────────────────────────── */
export { fetchBoardList as fetchBoards };
export { createBoardByFormData as createBoard };
export { updateBoardByFormData as updateBoard };
