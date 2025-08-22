// src/shared/data/http.ts
import axios from 'axios';

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
  withCredentials: true,
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const at = localStorage.getItem('AT');
    if (at) config.headers.Authorization = `Bearer ${at}`;
  }
  return config;
});

// ===== 응답 인터셉터 (401/403 처리 + refresh) =====
let isRefreshing = false;
let pending: Array<(t: string | null) => void> = [];

function subscribeTokenRefresh(cb: (t: string | null) => void) {
  pending.push(cb);
}
function onRefreshed(newToken: string | null) {
  pending.forEach((cb) => cb(newToken));
  pending = [];
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error || {};
    const status = response?.status;

    // 재시도 방지 플래그
    if (!config || config.__isRetry) {
      return Promise.reject(error);
    }

    if (status === 401 || status === 403) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // refresh 호출 // 토큰 키 이름이 다르면 바꿔줌
          const r = await http.post('/auth/refresh', {}); // ApiResult<LoginRes> 형태 가정
          const newAT = r?.data?.result?.accessToken;
          if (typeof window !== 'undefined' && newAT) {
            localStorage.setItem('AT', newAT);
          }
          onRefreshed(newAT ?? null);
          return http({ ...config, __isRetry: true, headers: { ...config.headers, Authorization: `Bearer ${newAT}` } });
        } catch (e) {
          onRefreshed(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('AT');
            window.location.href = '/member/login';
          }
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      } else {
        // refresh 중이면 기다렸다가 재시도
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newAT) => {
            if (!newAT) {
              reject(error);
              return;
            }
            resolve(http({ ...config, __isRetry: true, headers: { ...config.headers, Authorization: `Bearer ${newAT}` } }));
          });
        });
      }
    }

    return Promise.reject(error);
  }
);
