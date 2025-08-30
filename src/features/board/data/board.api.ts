// src/features/board/data/board.api.ts
import http, { getAccessToken } from '@/shared/data/http';
import type {
  BoardDetail,
  CreateBoardReq,
  UpdateBoardReq,
  PageRes,
} from './board.types';

const BASE_PATH = '/board';

function unwrap<T>(r: any): T {
  const data = (r as any)?.data ?? r;
  return (data?.result ?? data) as T;
}

export type FetchBoardsParams = {
  page?: number;
  size?: number;
  type?: string;
  keyword?: string;
  boardType?: string;
  category?: string;
  q?: string;
};

export async function fetchBoards(params?: FetchBoardsParams) {
  const safe = params ?? {};
  const r = await http.get(`${BASE_PATH}/readAll`, { params: safe });
  return unwrap<PageRes<BoardDetail>>(r);
}

export async function fetchBoardById(bno: number, opts?: { like?: boolean }) {
  const like = opts?.like ?? false;
  const r = await http.get(`${BASE_PATH}/readOne/${bno}`, { params: { like } });
  return unwrap<BoardDetail>(r);
}

/** 등록 (JSON + 파일을 받아 FormData로 만들어 전송) */
export async function createBoard(body: CreateBoardReq, files?: File[]) {
  const fd = new FormData();
  fd.append(
    'json',
    new Blob([JSON.stringify(body ?? {})], { type: 'application/json' }),
    'payload.json'
  );
  (files ?? []).forEach((f) => fd.append('files', f));

  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/create`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}

/** ✅ 등록 (이미 FormData가 준비되어 있을 때 그대로 전송) */
export async function createBoardByFormData(fd: FormData) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/create`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}

/** 수정 (FormData: json + addFiles[] + deleteUuids(JSON) + orders(JSON)) */
export async function updateBoard(
  payload: UpdateBoardReq & { images?: File[] }
) {
  const { bno, images, ...rest } = payload;
  const fd = new FormData();

  fd.append(
    'json',
    new Blob([JSON.stringify(rest ?? {})], { type: 'application/json' }),
    'payload.json'
  );
  (images ?? []).forEach((f) => fd.append('addFiles', f));

  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/update/${bno}`, fd, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}

export async function updateBoardByFormData(args: { bno: number; formData: FormData }) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/update/${args.bno}`, args.formData, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}

export async function removeBoard(bno: number) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/delete/${bno}`, undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}

export async function likeBoard(bno: number) {
  const token = getAccessToken();
  const r = await http.post(`${BASE_PATH}/like/${bno}`, undefined, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return unwrap<any>(r);
}
