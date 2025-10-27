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
  if (data?.result) return data.result as T;
  return data as T;
}

export type FetchBoardsParams = {
  page?: number;
  size?: number;
  type?: string;       // 라우트에서 넘어오는 NOTICE 등
  keyword?: string;
  boardType?: string;  // 서버 규격
  category?: string;
  q?: string;
};

/** 목록: 비인증 1차 호출 → 401이면 토큰으로 재시도(환경 대응) */
export async function fetchBoards(params?: FetchBoardsParams) {
  const p = params ?? {};
  const page = Number(p.page ?? 1) || 1;
  const size = Number(p.size ?? 10) || 10;

  // ✅ 항상 boardType으로 보냄 (type → boardType 매핑)
  const boardType = (p.boardType ?? p.type ?? '').toUpperCase();
  const keyword = p.keyword ?? p.q ?? '';

  // 1) 비인증 시도
  try {
    const r = await http.get(`${BASE_PATH}/readAll`, {
      params: { page, size, boardType, keyword },
      headers: { 'X-Skip-Auth': '1' },
      withCredentials: false,
    });
    return unwrap<PageRes<BoardDetail>>(r);
  } catch (e: any) {
    if (e?.response?.status !== 401) throw e;
  }

  // 2) 401이면 토큰으로 재시도(일부 환경에서 목록도 인증 요구하는 경우용)
  const token = getAccessToken();

  const r2 = await http.get(`${BASE_PATH}/readAll`, {
    params: { page, size, boardType, keyword },
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: !!token,
  });
  return unwrap<PageRes<BoardDetail>>(r2);
}

export async function fetchBoardById(bno: number, opts?: { like?: boolean }) {
  const like = opts?.like ?? false;

  // ✅ 인터셉터에만 맡기지 말고, 여기서도 명시적으로 Authorization 강제 부착
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }

  const r = await http.get(`/board/readOne/${bno}`, {
    params: { like },
    headers,               // ← 명시적으로 추가
    withCredentials: !!token, // ← 세션/쿠키형 백엔드 겸용 대응
  });

  // 서버가 {result: {...}} 또는 {...}를 주는 두 케이스 모두 안전 해제
  const data = (r as any)?.data ?? r;
  return (data && data.result !== undefined) ? data.result : data;
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

/** 등록 (이미 FormData 준비돼 있을 때) */
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


const likeLock = new Set<number>();

export async function likeBoard(bno: number) {
  if (likeLock.has(bno)) return; 
  likeLock.add(bno);
  try {
    const token = getAccessToken();
    const r = await http.post(`${BASE_PATH}/like/${bno}`, undefined, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return unwrap<any>(r);
  } finally {
    likeLock.delete(bno);
  }
}

