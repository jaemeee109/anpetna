// src/app/notification/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import RequireLogin from '@/components/auth/RequireLogin';
import { notificationApi, type NotificationDTO } from '@/features/notification/data/notification.api';

type PageRes<T> = {
  dtoList: T[];
  total: number;
  page: number; // 0-base (서버)
  size: number;
  start?: number;
  end?: number;
};

export default function NotificationPage() {
  const [page, setPage] = useState(1);       // 프론트 1-base
  const [size, setSize] = useState(10);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const [data, setData] = useState<PageRes<NotificationDTO> | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = async (opts?: { keepPage?: boolean }) => {
    setLoading(true); setErr(null);
    try {
      const res = await notificationApi.list({ unreadOnly: onlyUnread, page, size });
      setData(res);
      // 서버는 0-base, 우리는 1-base 유지 (표시만)
    } catch (e: any) {
      setErr(e?.message || '알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 + 토글/페이지 변경시
  useEffect(() => { void reload(); }, [onlyUnread, page, size]);

  // SSE — 변경 시 재조회
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    esRef.current = notificationApi.openStream(() => { void reload({ keepPage: true }); });
    return () => { try { esRef.current?.close(); } catch {} esRef.current = null; };
  }, [onlyUnread, page, size]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil((data.total || 0) / (data.size || size)));
  }, [data, size]);

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      await reload({ keepPage: true });
    } catch (e) {
      alert('전체 읽음 처리 실패');
    }
  };

  const handleMarkRead = async (nId: number) => {
    try {
      await notificationApi.markRead(nId);
      await reload({ keepPage: true });
    } catch {
      alert('읽음 처리 실패');
    }
  };

  const handleDelete = async (nId: number) => {
    if (!confirm('해당 알림을 삭제할까요?')) return;
    try {
      await notificationApi.remove(nId);
      await reload({ keepPage: true });
    } catch {
      alert('삭제 실패');
    }
  };

  const rows = data?.dtoList ?? [];

  return (
    <RequireLogin>
     <main className="container apn-noti">
        <h1 className="apn-title">알림</h1>

        <div className="apn-toolbar" role="toolbar" aria-label="알림 도구">
          <label className="apn-toggle">
            <input
              type="checkbox"
              checked={onlyUnread}
              onChange={(e) => { setPage(1); setOnlyUnread(e.currentTarget.checked); }}
            />
            <span>안읽음</span>
          </label>
          <div className="spacer" />
          <button type="button" onClick={handleMarkAll} className="btn-link">전체 읽음</button>
        </div>

        {loading && <div>불러오는 중…</div>}
        {err && <div role="alert">{err}</div>}

        {!loading && rows.length === 0 && (
          <div>표시할 알림이 없습니다.</div>
        )}

       <ul className="apn-list">
            {rows.map((n, idx) => {
                const key =
                (n?.nId != null ? String(n.nId) : 'na') +
                '-' +
                (n?.createdAt ?? '') +
                '-' +
                idx; // 항상 고유 보장
                return (
                <li key={key} className={`apn-item ${n.isRead ? 'read' : 'unread'}`}>
                    <div className="meta">
                    <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString()}</time>
                    {!n.isRead && <span className="badge">NEW</span>}
                    </div>
                    <div className="title">
                    {n.linkUrl ? <Link href={n.linkUrl}>{n.title}</Link> : <span>{n.title}</span>}
                    </div>
                    {n.message && <div className="message">{n.message}</div>}

                    <div className="actions">
                    {!n.isRead && (
                        <button type="button" onClick={() => void handleMarkRead(n.nId)} className="btn-link">
                        읽음
                        </button>
                    )}
                    <button type="button" onClick={() => void handleDelete(n.nId)} className="btn-link">
                        삭제
                    </button>
                    </div>
                </li>
                );
            })}
            </ul>


        {totalPages > 1 && (
          <div className="apn-paging" role="navigation" aria-label="페이지 이동">
            <button type="button" className="btn-link" onClick={() => setPage(1)} disabled={page <= 1}>≪</button>
            <button type="button" className="btn-link" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>〈</button>
            <span className="now">{page} / {totalPages}</span>
            <button type="button" className="btn-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>〉</button>
            <button type="button" className="btn-link" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>≫</button>
          </div>
        )}

        <style jsx>{`
          /* === 본문 폭 & 가운데 정렬 === */
          .apn-noti {
            --apn-noti-max: 500px;         /* ← 여기 숫자만 바꾸면 즉시 폭 조절(px) */
            max-width: var(--apn-noti-max);
            margin: 0 auto;                 /* 가운데 정렬 */
            padding: 20px 16px;             /* 기존 padding 유지 (양옆 살짝 여백) */
          }

          .apn-title { font-size: 20px; margin: 0 0 12px; }
          .apn-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .apn-toggle { display: inline-flex; align-items: center; gap: 6px; }
          .spacer { flex: 1; }
          .apn-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
          .apn-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .apn-item.unread { background: #fff; }
          .apn-item.read { background: #fafafa; opacity: 0.9; }
          .meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #6b7280; margin-bottom: 6px; }
          .badge { background: #efefef; border: 1px solid #ddd; border-radius: 4px; padding: 2px 6px; font-size: 11px; }
          .title { font-weight: 600; }
          .message { color: #374151; margin-top: 4px; }
          .actions { display: flex; gap: 10px; margin-top: 8px; }
          .btn-link { background: none; border: 0; padding: 0; cursor: pointer; text-decoration: underline; }
          .apn-paging { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 14px; }
          .now { min-width: 80px; text-align: center; }
        `}</style>
      </main>
    </RequireLogin>
  );
}
