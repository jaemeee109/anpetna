import axios from 'axios';

export const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// 토큰을 로컬스토리지에서 꺼내 헤더에 붙임 (로그인 성공 후 저장 예정)
http.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const at = localStorage.getItem('AT');
    if (at) config.headers.Authorization = `Bearer ${at}`;
  }
  return config;
});
