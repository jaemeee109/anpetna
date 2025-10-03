// src/app/notification/page.tsx
'use client';

import { useEffect, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import { notificationApi, type NotificationDTO } from '@/features/notification/data/notification.api';

type PageRes<T> = {
  dtoList: T[];
  total: number; // 전체 개수
  page: number;  // 서버 0-base, 프론트는 1-base 사용
  size: number;
  start?: number;
  end?: number;
};

type ViewItem = {
  id: number;
  title: string;
  message: string;
  linkUrl: string;
  createdAt?: string | null;
  read: boolean;
};

type KeywordRow = {
  kId: number;
  keyword: string;
  scopeBoardType?: string | null;
};

export default function NotificationPage() {
  const router = useRouter();

  // 프론트 1-base 페이지 상태
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  // (1) 안읽음 토글: 체크박스 → 버튼
  const [onlyUnread, setOnlyUnread] = useState(false);

  const [data, setData] = useState<PageRes<NotificationDTO> | null>(null);
  const [loading, setLoading] = useState(false);

  // === 키워드 구독 상태 ===
  const [kwItems, setKwItems] = useState<KeywordRow[]>([]);
  const [kwLoading, setKwLoading] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const [kwEditId, setKwEditId] = useState<number | null>(null); // null이면 생성, 숫자면 수정 모드
  // scopeBoardType은 백엔드가 null 허용 — 우선 전체(null)만 지원 (선택박스 필요시 확장)
  const scopeBoardType: string | null = null;

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<ViewItem | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await notificationApi.list({
        unreadOnly: onlyUnread,
        page,
        size,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  async function loadKeywords() {
    setKwLoading(true);
    try {
      const list = await (notificationApi as any).keywords.list();
      const rows: KeywordRow[] = (list?.items ?? []).map((it: any) => ({
        kId: Number(it.kId),
        keyword: String(it.keyword ?? ''),
        scopeBoardType: it.scopeBoardType ?? null,
      }));
      setKwItems(rows);
    } finally {
      setKwLoading(false);
    }
  }

  // 초기 로드 & 필터/페이지 변경 시 재조회
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, onlyUnread]);

  // 키워드 목록 초기 로드
  useEffect(() => {
    loadKeywords();
  }, []);

  // SSE 연결: 알림 수신 시 자동 갱신
  useEffect(() => {
    const es = notificationApi.openStream((_type) => {
      reload();
    });
    return () => es?.close?.();
  }, []);

  // 페이지 정보
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, size)));

  // 액션 핸들러
  const onToggleUnread = () => {
    setPage(1);
    setOnlyUnread((v) => !v);
  };

  const onMarkAllRead = async () => {
    await notificationApi.markAllRead();
    setOnlyUnread(false);
    await reload();
  };

  const onRemove = async (nId: number, e?: MouseEvent) => {
    e?.stopPropagation();
    await notificationApi.remove(nId);
    await reload();
  };

  const onMarkRead = async (nId: number, e?: MouseEvent) => {
    e?.stopPropagation();
    await notificationApi.markRead(nId);
    await reload();
  };

  // 리스트 아이템 클릭 → 모달 오픈 + 즉시 읽음 처리
  const openModal = async (raw: any) => {
    const id =
      Number(raw?.nId ?? raw?.nid ?? raw?.id ?? raw?.n_id ?? NaN);

    const title =
      raw?.nTitle ?? raw?.ntitle ?? raw?.title ?? raw?.n_title ?? '(제목 없음)';

    const message =
      raw?.nMessage ?? raw?.nmessage ?? '' ;

    const linkUrl =
      raw?.linkUrl ?? '';

    const createdAt =
      raw?.createdAt ?? raw?.created_at ?? raw?.created ?? null;

    const read = Boolean(raw?.isRead ?? raw?.read ?? raw?.is_read);

    setModalItem({ id, title, message, linkUrl, createdAt, read });
    setModalOpen(true);

    if (Number.isFinite(id) && !read) {
      try {
        await notificationApi.markRead(id);
        setData((prev) => {
          if (!prev) return prev;
          const next = { ...prev, dtoList: prev.dtoList.map((x: any) =>
            (Number(x?.nId ?? x?.nid) === id) ? { ...x, isRead: true, read: true } : x
          ) };
          return next;
        });
      } finally {
        reload();
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalItem(null);
  };

  const goToLink = () => {
    if (modalItem?.linkUrl) {
      router.push(modalItem.linkUrl);
    } else {
      closeModal();
    }
  };

  // === 키워드 구독: 생성/수정/삭제 ===
  const submitKeyword = async () => {
    const keyword = kwInput.trim();
    if (!keyword) return;

    if (kwEditId !== null) {
      await (notificationApi as any).keywords.replace(kwEditId, keyword, scopeBoardType);
    } else {
      await (notificationApi as any).keywords.create({ keyword, scopeBoardType });
    }

    setKwInput('');
    setKwEditId(null);
    await loadKeywords();
  };

  const editKeyword = (row: KeywordRow) => {
    setKwInput(row.keyword);
    setKwEditId(row.kId);
  };

  const deleteKeyword = async (kId: number) => {
  try {
    await (notificationApi as any).keywords.remove(kId);
    if (kwEditId === kId) {
      setKwInput('');
      setKwEditId(null);
    }
    await loadKeywords();
  } catch (e: any) {
    alert(e?.message || '키워드 삭제 중 오류가 발생했습니다.');
  }
};


  return (
    <RequireLogin>
      <section className="mx-auto w-full max-w-[720px] px-4 py-6">
        {/* === [키워드 알림 관리] === */}
        <div className="noti-card mb-5">
          <div className="flex items-center justify-between">
            <div className="font-semibold">키워드 알림</div>
          </div>

          {/* 입력영역: 현재는 전체 보드 대상(null). 필요 시 보드타입 선택 박스 추가 가능 */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="키워드를 입력하세요 (예: 고양이)"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitKeyword(); }}
            />
                <button type="button" className="noti-btn" onClick={submitKeyword}>
                {kwEditId !== null ? '수정' : '추가'}
              </button>
              {kwEditId !== null && (
                <button
                  type="button"
                  className="noti-btn"
                  onClick={() => { setKwInput(''); setKwEditId(null); }}
                >
                  취소
                </button>
              )}

          </div>

          {/* 목록 */}
          <div className="mt-3">
            {kwLoading ? (
              <div className="text-sm text-gray-500">키워드 불러오는 중…</div>
            ) : (kwItems.length === 0 ? (
              <div className="text-sm text-gray-500">등록된 키워드가 없습니다.</div>
            ) : (
              <ul className="list-none pl-0 flex flex-col gap-2">
                {kwItems.map((row) => (
                  <li key={row.kId} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div className="text-sm">
                      <span className="font-medium">{row.keyword}</span>
                      {/* scopeBoardType 표시 필요 시: */}
                      {/* {row.scopeBoardType ? ` · ${row.scopeBoardType}` : ''} */}
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" className="noti-btn" onClick={() => editKeyword(row)}>수정</button>
                      <button type="button" className="noti-btn" onClick={() => deleteKeyword(row.kId)}>삭제</button>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* 헤더: 필터/액션 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* (1) 안읽음 토글 버튼 */}
            <button
              type="button"
              className={`noti-btn ${onlyUnread ? 'active' : ''}`}
              onClick={onToggleUnread}
              aria-pressed={onlyUnread}
              title="안읽은 알림만 보기"
            >
              {onlyUnread ? '안읽음만 보기: ON' : '안읽음만 보기'}
            </button>
          </div>

          {/* (2) 전체읽음 버튼: 밑줄 제거 + 흰 배경 + 회색 테두리 */}
          <button
            type="button"
            className="noti-btn"
            onClick={onMarkAllRead}
            title="전체 읽음 처리"
          >
            전체읽음
          </button>
        </div>

        {/* 목록 */}
        {loading && <p className="text-sm text-gray-500">불러오는 중…</p>}
        {!loading && (data?.dtoList?.length ?? 0) === 0 && (
          <p className="text-sm text-gray-500">알림이 없습니다.</p>
        )}

        {/* 목록 */}
        <ul className="list-none pl-0 flex flex-col gap-3">
          {(data?.dtoList || []).map((n, idx) => {
            // 제목
            const title =
              (n as any).nTitle ??
              (n as any).ntitle ??
              (n as any).title ??
              (n as any)['n_title'] ??
              '(제목 없음)';

            // ID
            const idRaw =
              (n as any).nId ??
              (n as any).nid ??
              (n as any).id ??
              (n as any)['n_id'];
            const nIdNum = Number.isFinite(Number(idRaw)) ? Number(idRaw) : NaN;

            // 읽음 여부
            const read = Boolean(
              (n as any).isRead ??
              (n as any).read ??
              (n as any)['is_read']
            );

            // 날짜
            const created =
              (n as any).createdAt ??
              (n as any)['created_at'] ??
              (n as any).created ??
              null;

            // 고유 key
            const key = Number.isFinite(nIdNum)
              ? `nid-${nIdNum}`
              : (n as any).eventId
              ? `evt-${(n as any).eventId}`
              : `ts-${String(created || '')}-${idx}`;

            return (
              <li
                key={key}
                className="noti-card cursor-pointer"
                onClick={() => openModal(n)}
                role="button"
                aria-label="알림 상세 열기"
              >
                {/* 1줄: 제목 */}
                <div className="noti-title" title={title}>
                  {title}
                </div>

                {/* 2줄: 날짜 + NEW 뱃지 */}
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <time dateTime={String(created || '')}>
                    {created ? new Date(created as any).toLocaleString() : ''}
                  </time>
                  {!read && <span className="badge">NEW</span>}
                </div>

                {/* 3줄: 읽음/삭제 */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className="noti-btn"
                    onClick={(e) => onMarkRead(nIdNum, e)}
                    title="읽음 처리"
                  >
                    읽음
                  </button>
                  <button
                    type="button"
                    className="noti-btn"
                    onClick={(e) => onRemove(nIdNum, e)}
                    title="이 알림 삭제"
                  >
                    삭제
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* 페이징: 가운데 정렬 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              type="button"
              className="noti-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              이전
            </button>
            <span className="text-sm tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              className="noti-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              다음
            </button>
          </div>
        )}

        {/* 모달 */}
        {modalOpen && modalItem && (
          <div className="modal-backdrop" onClick={closeModal}>
            <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-title" title={modalItem.title}>
                {modalItem.title}
              </div>
              <div className="modal-time">
                {modalItem.createdAt ? new Date(modalItem.createdAt).toLocaleString() : ''}
              </div>

              <hr className="my-3 border-gray-200" />

              <div className="modal-body">
                {modalItem.message || ''}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" className="noti-btn" onClick={goToLink}>
                  확인하기
                </button>
                <button type="button" className="noti-btn" onClick={closeModal}>
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 이 페이지 전용 스타일 */}
        <style jsx>{`
          .noti-btn {
            border: 1px solid #e5e7eb;   /* 회색 테두리 */
            background: #fff;            /* 흰 바탕 */
            border-radius: 10px;
            padding: 6px 12px;
            font-size: 0.875rem;
            line-height: 1;
            text-decoration: none;       /* 밑줄 제거 */
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .noti-btn.active {
            background: #f3f4f6;
          }
          .noti-card {
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            background: #fff;
            padding: 12px 14px;
          }
          .noti-title {
            font-weight: 600;
            font-size: 0.95rem;
            overflow: hidden;
            text-overflow: ellipsis;     /* 카드 폭에 맞춰 한 줄 말줄임 */
            white-space: nowrap;
          }
          .badge {
            display: inline-block;
            border: 1px solid #e5e7eb;
            background: #fff;
            border-radius: 9999px;
            padding: 2px 6px;
            font-size: 0.7rem;
            line-height: 1;
          }

          /* === 모달 === */
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 50;
          }
          .modal-panel {
            width: 100%;
            max-width: 560px;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            padding: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          }
          .modal-title {
            font-size: 1rem;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .modal-time {
            margin-top: 4px;
            font-size: 0.75rem;
            color: #6b7280; /* gray-500 */
          }
          .modal-body {
            white-space: pre-wrap;  /* 줄바꿈/개행 유지 */
            font-size: 0.9rem;
          }
        `}</style>
      </section>
    </RequireLogin>
  );
}
