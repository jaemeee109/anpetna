// src/components/layout/NotificationBell.tsx
'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import BellIcon from '@/components/icons/Bell';
import { notificationApi } from '@/features/notification/data/notification.api';

/**
 * size: 아이콘(및 텍스트)의 상대 크기. 기본 '1em'
 * weight: 링크 글자 굵기. 기본 400
 * dotOffset: 배지 위치 미세조정(px). 기본 {x: -6, y: -6}
 */
type Props = {
  size?: string; // '1em' | '14px' | '1.25rem' ...
  weight?: number; // 300~900
  dotOffset?: { x?: number; y?: number };
};

// 클라이언트에서 로그인 여부 간단 판별(스토리지/쿠키)
function hasAuth(): boolean {
  try {
    return !!(
      localStorage.getItem('accessToken') ||
      localStorage.getItem('access_token') ||
      document.cookie.match(/(?:^|;\s*)JSESSIONID=([^;]+)/)
    );
  } catch { return false; }
}

export default function NotificationBell({
  size = '1em',
  weight = 400,
  dotOffset,
}: Props) {
  const [count, setCount] = useState<number>(0);
  const esRef = useRef<EventSource | null>(null);

  // 초기 1회 조회: 비로그인 시 바로 종료
  useEffect(() => {
    if (!hasAuth()) { setCount(0); return; }

    let mounted = true;
    notificationApi
      .unreadCount()
      .then((r) => {
        if (mounted) setCount(r?.count ?? 0);
      })
      .catch(() => {
        /* 실패 시 0 유지 */
      });
    return () => { mounted = false; };
  }, []);

  // SSE 연결: 비로그인 시 연결하지 않음
  useEffect(() => {
    if (!hasAuth()) return;

    esRef.current = notificationApi.openStream((_type) => {
      notificationApi
        .unreadCount()
        .then((r) => setCount(r?.count ?? 0))
        .catch(() => {});
    });

    return () => {
      try { esRef.current?.close(); } catch {}
      esRef.current = null;
    };
  }, []);

  // 배지 위치 보정
  const dx = dotOffset?.x ?? -6;
  const dy = dotOffset?.y ?? -6;

  return (
    <Link
      href="/notification"
      className="btn-link apn-notify"
      prefetch={false}
      aria-label="알림 페이지로 이동"
      style={
        {
          '--apn-notify-size': size,
          '--apn-notify-weight': String(weight),
          '--apn-dot-translate-x': `${dx}px`,
          '--apn-dot-translate-y': `${dy}px`,
        } as React.CSSProperties
      }
    >
      <span className="apn-notify-box" aria-hidden="true">
        <BellIcon />
        {count > 0 && (
          <span className="apn-notify-dot" aria-label={`미읽음 ${count}건`}>
            {count}
          </span>
        )}
      </span>
      <style jsx>{`
        .apn-notify {
          display: inline-flex;
          align-items: center;
          font-weight: var(--apn-notify-weight, 400);
          line-height: 1;
        }
        .apn-notify-box {
          position: relative;
          display: inline-block;
          vertical-align: middle;
          font-size: var(--apn-notify-size, 1em);
        }
        .apn-notify-box :global(svg) {
          width: 18px;
          height: 18px;
          display: block;
        }
        .apn-notify-dot {
          position: absolute;
          top:0px;
          right:5px;
          transform: translate(
            var(--apn-dot-translate-x, -6px),
            var(--apn-dot-translate-y, -6px)
          );
          min-width: 16px;
          height: 18px;
          padding: 0 4px;
          border-radius: 9999px;
          background: #ef4444;
          color: #fff;
          font-size: 13px;
          line-height: 16px;
          text-align: center;
          font-weight: 900;
          box-shadow: 0 0 0 2px #fff;
        }
      `}</style>
    </Link>
  );
}
