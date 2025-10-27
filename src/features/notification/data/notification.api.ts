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
  nTitle: string;
  nMessage?: string | null;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
  eventId?: string;
  targetType?: string | null;
  targetId?: string | null;
  readAt?: string | null;
};

/* ===== 키워드 알림 타입 ===== */
export type KeywordSubscriptionDTO = {
  kId: number;
  keyword: string;
  scopeBoardType?: string | null;
  createDate?: string;
  latestDate?: string;
  subscriberMemberId?: string;
};
export type ListKeywordRes = { items: KeywordSubscriptionDTO[] };
export type CreateKeywordReq = {
  keyword: string;
  scopeBoardType?: string | null;
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
  const u = new URL(path, base+'/');
  if (q && q.toString()) u.search = q.toString();
  return u.toString();
}

/* ========= 클라이언트 ========= */
export const notificationApi = {
  async unreadCount(): Promise<{ count: number }> {
    const res = await fetch(abs('notification/unread-count'), {
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
    const res = await fetch(abs('notification', q), {
      method: 'GET',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('알림 목록 조회 실패');
    return res.json();
  },

  async markRead(nId: number): Promise<{ ok?: boolean } | any> {
    const res = await fetch(abs(`notification/${nId}/mark-read`), {
      method: 'PATCH',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('읽음 처리 실패');
    return res.json();
  },

  async markAllRead(): Promise<{ ok: true; updated: number }> {
    const res = await fetch(abs('notification/mark-all-read'), {
      method: 'POST',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('전체 읽음 처리 실패');
    return res.json();
  },

  async remove(nId: number): Promise<{ ok?: boolean } | any> {
    const res = await fetch(abs(`notification/${nId}`), {
      method: 'DELETE',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('삭제 실패');
    if (res.status === 204) return { ok: true }; // 일부 백엔드는 204 반환
    return res.json();
  },


openStream(onEvent: (type: string, data: any) => void): EventSource {
  const token = getToken();
  const es: EventSource = new EventSourcePolyfill(abs('notification/stream'), {
    headers: {
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
    },
    withCredentials: true,
    heartbeatTimeout: 600_000,
  } as any);

  // 서버가 주기적으로 보낼 수 있는 keepalive
  es.addEventListener('keepalive', () => {});

  // ✅ 서버 실제 이벤트명: "notification"
  es.addEventListener('notification', (e: MessageEvent) => {
    try { onEvent('notification', JSON.parse(e.data)); } catch {}
  });

  // 필요 시 유지(서버가 현재 사용하진 않음)
  es.addEventListener('notification.created', (e: MessageEvent) => {
    try { onEvent('notification.created', JSON.parse(e.data)); } catch {}
  });
  es.addEventListener('notification.deleted', (e: MessageEvent) => {
    try { onEvent('notification.deleted', JSON.parse(e.data)); } catch {}
  });

  // 이름 없는(default) 이벤트용
  es.onmessage = (e) => {
    try { onEvent('message', JSON.parse(e.data)); } catch {}
  };

  es.onerror = (err: any) => {
    try {
      const msg = String((err && (err.message ?? (err as any)?.data)) || '');
      if (msg.includes('No activity within')) return;
    } catch {}
  };
  return es;
},


  // 단건 조회
  async readOne(nId: number): Promise<NotificationDTO> {
    const res = await fetch(abs(`notification/${nId}`), {
      method: 'GET',
      headers: { ...authHeaders() },
      credentials: 'include',
    });
    if (!res.ok) throw new Error('알림 단건 조회 실패');
    return res.json();
  },

  /* ===== [키워드 구독] ===== */
  keywords: {
    async list(): Promise<ListKeywordRes> {
      const res = await fetch(abs('notification/keywords'), {
        method: 'GET',
        headers: { ...authHeaders() },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`키워드 목록 조회 실패 (HTTP ${res.status})`);
      return res.json();
    },

    async create(req: CreateKeywordReq): Promise<KeywordSubscriptionDTO> {
      const res = await fetch(abs('notification/keywords'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        credentials: 'include',
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`키워드 구독 생성 실패 (HTTP ${res.status})`);
      return res.json();
    },

    async remove(kId: number): Promise<{ kId: number; deleted: boolean }> {
      if (!Number.isFinite(kId)) throw new Error('유효하지 않은 kId');
      const res = await fetch(abs(`notification/keywords/${encodeURIComponent(String(kId))}`), {
        method: 'DELETE',
        headers: { ...authHeaders() },
        credentials: 'include',
      });
      if (res.status === 204) return { kId, deleted: true };
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        throw new Error(`키워드 구독 삭제 실패 (HTTP ${res.status}) ${msg}`.trim());
      }
      return res.json();
    },
  },

  // UPDATE 엔드포인트가 없으므로: 삭제 후 재생성
  async replace(kId: number, keyword: string, scopeBoardType?: string | null) {
    try { await (this as any).keywords.remove(kId); } catch {}
    return (this as any).keywords.create({
      keyword,
      scopeBoardType: scopeBoardType ?? null,
    });
  },
};
