// src/features/notification/data/notification.api.ts
import { withPrefix } from '@/lib/api';
import { EventSourcePolyfill } from 'event-source-polyfill';

type PageRes<T> = {
  dtoList: T[];
  total: number;
  page: number;
  size: number;
  start?: number;
  end?: number;
};

export type NotificationDTO = {
  nId: number;
  title: string;
  message?: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string; // ISO
  readAt?: string | null;
  variant?: string | null;
  notificationType?: string | null;
};

/* ========= 공통: 토큰/헤더 ========= */
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = document.cookie.match(new RegExp('(?:^|; )' + safe + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}
function getToken() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('accessToken') ||
    getCookie('Authorization') ||
    ''
  );
}
function authHeaders(): Record<string, string> {
  const raw = getToken();
  if (!raw) return {};
  const val = raw.startsWith('Bearer ') ? raw : `Bearer ${raw}`;
  return { Authorization: val };
}

/* ========= API 베이스 ========= */
function resolveApiBase(): string {
  const envBase =
    (process.env.NEXT_PUBLIC_API_BASE as string | undefined) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ||
    '';
  if (envBase) return envBase.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  const guessPort = port ? (port === '3000' ? '8000' : port) : '';
  return `${protocol}//${hostname}${guessPort ? `:${guessPort}` : ''}`.replace(/\/+$/, '');
}
function abs(path: string, q?: URLSearchParams): string {
  const base = resolveApiBase();
  const p = withPrefix(path);
  const u = new URL(p, base);
  if (q && q.toString()) u.search = q.toString();
  return u.toString();
}

/* ========= 클라이언트 ========= */
export const notificationApi = {
  async unreadCount(): Promise<{ count: number }> {
    const res = await fetch(abs('/notification/unread-count'), {
      method: 'GET',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('unread-count 실패');
    return res.json();
  },

  async list(params: { unreadOnly?: boolean; page?: number; size?: number }): Promise<PageRes<NotificationDTO>> {
    const q = new URLSearchParams();
    if (params.unreadOnly != null) q.set('unreadOnly', String(params.unreadOnly));
    if (params.page != null) q.set('page', String(params.page as number));
    if (params.size != null) q.set('size', String(params.size));
    const res = await fetch(abs('/notification', q), {
      method: 'GET',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('알림 목록 조회 실패');
    return res.json();
  },

  async markRead(nId: number): Promise<{ ok?: boolean } | any> {
    const res = await fetch(abs(`/notification/${nId}/mark-read`), {
      method: 'PATCH',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('읽음 처리 실패');
    return res.json();
  },

  async markAllRead(): Promise<{ ok: true; updated: number }> {
    const res = await fetch(abs('/notification/mark-all-read'), {
      method: 'POST',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('전체 읽음 처리 실패');
    return res.json();
  },

  async remove(nId: number): Promise<{ ok?: boolean } | any> {
    const res = await fetch(abs(`/notification/${nId}`), {
      method: 'DELETE',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('삭제 실패');
    return res.json();
  },

  openStream(onEvent: (type: string, data: any) => void): EventSource {
    const token = getToken();
    const es: EventSource = new EventSourcePolyfill(abs('/notification/stream'), {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
      withCredentials: true,
      heartbeatTimeout: 600_000,
    } as any);

    es.addEventListener('keepalive', () => { /* 연결 직후 1회 수신 */ });
    es.addEventListener('notification.created', (e: MessageEvent) => {
      try { onEvent('notification.created', JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('notification.deleted', (e: MessageEvent) => {
      try { onEvent('notification.deleted', JSON.parse(e.data)); } catch {}
    });
    es.onmessage = (e) => {
      try { onEvent('message', JSON.parse(e.data)); } catch {}
    };

    // 폴리필 유휴 타임아웃 메시지("No activity within ...")만 조용히 무시
    es.onerror = (err: any) => {
      try {
        const msg = String((err && (err.message ?? (err as any)?.data)) || '');
        if (msg.includes('No activity within')) {
          return; // 자동 재연결은 폴리필이 수행
        }
      } catch {}
      // (선택) 실제 네트워크 오류에 대해 후속 처리
      // notificationApi.unreadCount().catch(() => {});
    };

    return es;
  },
};
