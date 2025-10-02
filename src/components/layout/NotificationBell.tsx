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

export default function NotificationBell({
  size = '1em',
  weight = 400,
  dotOffset,
}: Props) {
  const [count, setCount] = useState<number>(0);
  const esRef = useRef<EventSource | null>(null);

  // 초기 1회: GET /notification/unread-count (폴링 없음)
  useEffect(() => {
    let mounted = true;
    notificationApi
      .unreadCount()
      .then((r) => {
        if (mounted) setCount(r?.count ?? 0);
      })
      .catch(() => {
        /* 실패 시 0 유지 */
      });
    return () => {
      mounted = false;
    };
  }, []);

  // SSE 연결: 신규/삭제 시 숫자 갱신(보수적으로 count 재조회)
  useEffect(() => {
    esRef.current = notificationApi.openStream((_type) => {
      notificationApi
        .unreadCount()
        .then((r) => setCount(r?.count ?? 0))
        .catch(() => {});
    });
    return () => {
      try {
        esRef.current?.close();
      } catch {}
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
          // 크기/굵기 커스터마이즈 (부모에서 덮어쓰기 가능)
          '--apn-notify-size': size,
          '--apn-notify-weight': String(weight),
          '--apn-dot-translate-x': `${dx}px`,
          '--apn-dot-translate-y': `${dy}px`,
        } as React.CSSProperties
      }
    >
      {/* 아이콘 + 배지를 한 박스로 묶어 absolute 배지 오버레이 */}
      <span className="apn-notify-box" aria-hidden="true">
        <BellIcon />
        {count > 0 && (
          <span className="apn-notify-dot" aria-label={`미읽음 ${count}건`}>
            {count}
          </span>
        )}
      </span>
      <style jsx>{`
        /* 한 줄 정렬: 상위 링크 자체를 inline-flex */
        .apn-notify {
          display: inline-flex;
          align-items: center;
          font-weight: var(--apn-notify-weight, 400);
          line-height: 1;
        }

        /* 아이콘/배지 묶음은 relative 컨테이너 */
        .apn-notify-box {
          position: relative;
          display: inline-block;
          vertical-align: middle;
          /* 아이콘 크기 제어: 1em => 상위 글자 크기에 종속 */
          font-size: var(--apn-notify-size, 1em);
        }

        /* SVG 아이콘은 currentColor로 채택, 1em 고정(텍스트 크기와 동일) */
        .apn-notify-box :global(svg) {
          width: 18px;
          height: 18px;
          display: block;
        }

        /* 빨간 동그라미 배지 (흰색 숫자) */
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

          background: #ef4444; /* 빨간색 */
          color: #fff; /* 하얀 글씨 */
          font-size: 13px;
          line-height: 16px;
          text-align: center;
          font-weight: 900;

          /* 아이콘과 겹칠 때 테두리 효과(밝은 배경 기준) */
          box-shadow: 0 0 0 2px #fff;
        }
      `}</style>
    </Link>
  );
}
