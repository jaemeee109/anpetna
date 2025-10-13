// src/app/notification/page.tsx
'use client';

import { useEffect, useState, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import RequireLogin from '@/components/auth/RequireLogin';
import { notificationApi, type NotificationDTO } from '@/features/notification/data/notification.api';

type PageRes<T> = {
  dtoList: T[];
  total: number;
  page: number;
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

// ▶ 이 숫자만 바꾸면 본문 폭이 같이 바뀜
const CONTENT_WIDTH = 500; // px

export default function NotificationPage() {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const [data, setData] = useState<PageRes<NotificationDTO> | null>(null);
  const [loading, setLoading] = useState(false);

  const [kwItems, setKwItems] = useState<KeywordRow[]>([]);
  const [kwLoading, setKwLoading] = useState(false);
  const [kwInput, setKwInput] = useState('');
  const scopeBoardType: string | null = null;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<ViewItem | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await notificationApi.list({ unreadOnly: onlyUnread, page, size });
      setData(res);
    } finally {
      setLoading(false);
    }
  }

  async function loadKeywords() {
    setKwLoading(true);
    try {
      const list = await (notificationApi as any).keywords.list();
      const rows: KeywordRow[] = (list?.items ?? [])
        .map((it: any): KeywordRow => {
          const kId = Number(it?.kId ?? it?.kid ?? it?.id);
          return {
            kId,
            keyword: String(it?.keyword ?? ''),
            scopeBoardType: (it?.scopeBoardType ?? null) as string | null,
          };
        })
        .filter((r: KeywordRow) => Number.isFinite(r.kId));
      setKwItems(rows);
    } finally {
      setKwLoading(false);
    }
  }

  useEffect(() => { reload(); }, [page, size, onlyUnread]);
  useEffect(() => { loadKeywords(); }, []);
  useEffect(() => {
    const es = notificationApi.openStream((_t) => { reload(); });
    return () => es?.close?.();
  }, []);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, size)));
  const hasPagination = totalPages > 1;
  const hasList = (data?.dtoList?.length ?? 0) > 0;
  // 페이징이 없고, 리스트가 있을 때만 하단 여백(예: 80px)
  const bottomGap = !hasPagination && hasList ? 80 : 0;

  const onToggleUnread = () => { setPage(1); setOnlyUnread(v => !v); };
  const onMarkAllRead = async () => { await notificationApi.markAllRead(); setOnlyUnread(false); await reload(); };
  const onRemove = async (nId: number, e?: MouseEvent) => { e?.stopPropagation(); await notificationApi.remove(nId); await reload(); };
  const onMarkRead = async (nId: number, e?: MouseEvent) => { e?.stopPropagation(); await notificationApi.markRead(nId); await reload(); };

  const openModal = async (raw: any) => {
    const id = Number(raw?.nId ?? raw?.nid ?? raw?.id ?? raw?.n_id ?? NaN);
    const title = raw?.nTitle ?? raw?.ntitle ?? raw?.title ?? raw?.n_title ?? '(제목 없음)';
    const message = raw?.nMessage ?? raw?.nmessage ?? '';
    const linkUrl = raw?.linkUrl ?? '';
    const createdAt = raw?.createdAt ?? raw?.created_at ?? raw?.created ?? null;
    const read = Boolean(raw?.isRead ?? raw?.read ?? raw?.is_read);

    setModalItem({ id, title, message, linkUrl, createdAt, read });
    setModalOpen(true);

    if (Number.isFinite(id) && !read) {
      try {
        await notificationApi.markRead(id);
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            dtoList: prev.dtoList.map((x: any) =>
              (Number(x?.nId ?? x?.nid) === id) ? { ...x, isRead: true, read: true } : x
            )
          };
        });
      } finally {
        reload();
      }
    }
  };

  const closeModal = () => { setModalOpen(false); setModalItem(null); };
  const goToLink = () => { if (modalItem?.linkUrl) router.push(modalItem.linkUrl); else closeModal(); };

  const submitKeyword = async () => {
    const keyword = kwInput.trim();
    if (!keyword) return;
    await (notificationApi as any).keywords.create({ keyword, scopeBoardType });
    setKwInput('');
    await loadKeywords();
  };
  const deleteKeyword = async (kId: number) => {
    try { await (notificationApi as any).keywords.remove(kId); await loadKeywords(); }
    catch (e: any) { alert(e?.message || '키워드 삭제 중 오류가 발생했습니다.'); }
  };

  return (
    <RequireLogin>
      <section className="w-full flex justify-center px-4 py-6">
        {/* 페이지 컨테이너 — 고정 폭 + 중앙 */}
        <div className="mx-auto" style={{ width: CONTENT_WIDTH, marginBottom: bottomGap }}>
          {/* === 키워드 카드 === */}
          <div className="noti-card mb-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold"><strong>키워드 알림</strong></div>
            </div>

            <div className="flex items-center gap-[5px] mt-[10px]">
              <input
                type="text"
                className="kw-t flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder=" 구독하고 싶은 키워드를 입력해주세요 "
                value={kwInput}
                onChange={(e) => setKwInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitKeyword(); }}
              />
              <button type="button" className="noti-btn" onClick={submitKeyword}>추가</button>
            </div>

            {/* 키워드 목록 */}
            <div className="mt-3 w-full">
              {kwLoading ? (
                <div className="text-sm text-gray-500 text-center">키워드 불러오는 중…</div>
              ) : kwItems.length === 0 ? (
                <div className="text-sm text-gray-500 text-center">등록된 키워드가 없습니다.</div>
              ) : (
                <ul className="kw-grid">
                  {kwItems.map((row) => (
                    <li key={row.kId} className="kw-cell">
                      <div className="kw-chip">
                        <span className="kw-text" aria-label="키워드">{row.keyword}</span>
                        <button
                          type="button"
                          aria-label={`${row.keyword} 삭제`}
                          className="kw-xbtn"
                          onClick={() => deleteKeyword(row.kId)}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* === 목록 상단 === */}
          <div className="flex items-center justify-between mt-[30px] mb-[10px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`noti-btn btn-unread ${onlyUnread ? 'active' : ''}`}
                onClick={onToggleUnread}
                aria-pressed={onlyUnread}
                title="안읽은 알림만 보기"
              >
                <strong>{onlyUnread ? '안읽은 리스트 ON' : '안읽음 ∨'}</strong>
              </button>
            </div>
            <button
              type="button"
              className="noti-btn btn-markall"
              onClick={onMarkAllRead}
              title="전체 읽음 처리"
            >
              전체읽음
            </button>
          </div>

          {loading && <p className="text-sm text-gray-500 text-center">불러오는 중…</p>}
          {!loading && (data?.dtoList?.length ?? 0) === 0 && (
            <p className="text-sm text-gray-500 text-center">알림이 없습니다.</p>
          )}

          {/* === 알림 리스트 === */}
          <ul className="list-none pl-0 flex flex-col gap-[2px] w-full">
            {(data?.dtoList || []).map((n, idx) => {
              const title =
                (n as any).nTitle ??
                (n as any).ntitle ??
                (n as any).title ??
                (n as any)['n_title'] ??
                '(제목 없음)';
              const idRaw = (n as any).nId ?? (n as any).nid ?? (n as any).id ?? (n as any)['n_id'];
              const nIdNum = Number.isFinite(Number(idRaw)) ? Number(idRaw) : NaN;
              const read = Boolean((n as any).isRead ?? (n as any).read ?? (n as any)['is_read']);
              const created =
                (n as any).createdAt ?? (n as any)['created_at'] ?? (n as any).created ?? null;
              const key = Number.isFinite(nIdNum)
                ? `nid-${nIdNum}`
                : (n as any).eventId
                ? `evt-${(n as any).eventId}`
                : `ts-${String(created || '')}-${idx}`;

              return (
                <li key={key} className="w-full">
                  <div
                    className="noti-card cursor-pointer w-full"
                    onClick={() => openModal(n)}
                    role="button"
                    aria-label="알림 상세 열기"
                  >
                    <div className="noti-title" title={title}>{title}</div>

                    {/* 타이포 제어를 위한 래퍼 클래스 */}
                    <div className="noti-meta flex items-center gap-2">
                      <time className="noti-time" dateTime={String(created || '')}>
                        {created ? new Date(created as any).toLocaleString() : ''}
                      </time>
                      {!read && <span className="badge">NEW</span>}
                    </div>

                    <div className="noti-actions mt-2 flex items-center gap-[5px]">
                      <button
                        type="button"
                        className="noti-btn1"
                        onClick={(e) => onMarkRead(nIdNum, e)}
                        title="읽음 처리"
                      >
                        읽음
                      </button>
                      <button
                        type="button"
                        className="noti-btn1"
                        onClick={(e) => onRemove(nIdNum, e)}
                        title="이 알림 삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2 mt-[20px] mb-[60px]">
              <button type="button" className="noti-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>이전</button>
              <span className="text-sm tabular-nums">{page} / {totalPages}</span>
              <button type="button" className="noti-btn" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>다음</button>
            </div>
          )}

          {modalOpen && modalItem && (
            <div className="modal-backdrop" onClick={closeModal}>
              <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                <div className="modal-title" title={modalItem.title}>{modalItem.title}</div>
                <div className="modal-time">{modalItem.createdAt ? new Date(modalItem.createdAt).toLocaleString() : ''}</div>
                <hr className="my-3 border-gray-200" />
                <div className="modal-body">{modalItem.message || ''}</div>
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button type="button" className="noti-btn" onClick={goToLink}>확인하기</button>
                  <button type="button" className="noti-btn" onClick={closeModal}>닫기</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
/* === 리셋/안전망 === */
ul { margin: 0; padding-left: 0; }

/* === 공통 버튼 베이스 === */
.noti-btn {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 0.875rem;
  line-height: 1;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 32px;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease;
}
.noti-btn.active { background: #f3f4f6; }

/* === "안읽음만 보기" 버튼 색 === */
.btn-unread {
  border-color: #e5e7eb;
  color: #f5f5f5ff;
  background: #92c1ffff;
}
.btn-unread:hover {
  background: #60a5fa;
  border-color: #e5e7eb;
}
.btn-unread.active {
  background: #60a5fa;
  border-color: #e5e7eb;
}

/* === "전체읽음" 버튼 색 === */
.btn-markall {
  border-color: #bbbbbbff;
  color: #000000ff;
  background: #ffffffff;
}
.btn-markall:hover {
  background: #ebebebff;
  border-color: #bbbbbbff;
}

/* === 알림 카드 (폭/정렬/타이포) === */
.noti-card {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  padding: 12px 14px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
  box-sizing: border-box;
}
.noti-title {
  font-weight: 700;
  font-size: 0.98rem;
  color: #111827;           /* 제일 진한 텍스트 */
  line-height: 1.35;        /* 줄간격 */
  letter-spacing: 0.1px;    /* 글자간격 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 5px;
}
.noti-meta {
  margin-top: 4px;
}
.noti-time {
  font-size: 13px;          /* 폰트 크기 */
  color: #6b7280;           /* 회색 */
  line-height: 1.2;         /* 줄간격 */
  letter-spacing: 0.5px;    /* 글자간격 */
  margin-top:5px;
  margin-bottom: 0px;
}
.badge {
  display: inline-block;
  border: 1px solid #ffa1acff;
  background: #fca6a6ff;
  border-radius: 8px;
  padding: 3px 4px;
  font-size: 12px;
  line-height: 1;
  color: #ffffffff !important;
  margin-left: 5px;
  margin-top: 3px;
}

/* 카드 안 액션 버튼(읽음/삭제)  */
.noti-btn1{
  border: 1px solid #e5e7eb;
  background: #ffffff;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px ;
  height: 30px;
  margin-top: 5px;
  transition: background-color .15s ease, border-color .15s ease, color .15s ease;
}
.noti-btn1:hover { background: #f9fafb; }
.noti-actions .noti-btn1:first-child { /* 읽음 버튼 전용 색상 (예: 파랑) */
  border-color: #c7c7c7ff;
  color: #0e0e0eff;
  background: #ffffffff;
}
.noti-actions .noti-btn1:first-child:hover {
  background: #ebebebff;
  border-color: #bbbbbbff;
}
.noti-actions .noti-btn1:last-child {  /* 삭제 버튼 전용 색상 (예: 회색/빨강) */
  border-color: #c7c7c7ff;
  color: #0e0e0eff;
  background: #ffffffff;
}
.noti-actions .noti-btn1:last-child:hover {
  background: #ebebebff;
  border-color: #bbbbbbff;
}

/* === 모달 === */
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; z-index: 50;
}
.modal-panel {
  width: 100%; max-width: 560px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.12);
}
.modal-title {
  font-size: 1rem; font-weight: 700; color: #111827;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: 0.1px; line-height: 1.3;
}
.modal-time  { margin-top: 4px; font-size: 0.75rem; color: #6b7280; letter-spacing: .2px; }
.modal-body  { white-space: pre-wrap; font-size: 0.92rem; line-height: 1.6; letter-spacing: 0.1px; color: #111827; }

/* === 키워드 입력 === */
.kw-t{
  border: 1px solid #d1d5db;
  background: #fff;
  border-radius: 8px;
  height: 30px;
  font-size: 14px;
}

/* === 키워드 목록(5열) === */
.kw-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  width: 100%;
  place-items: center;
  list-style: none;
  margin: 15px auto 0;
}
.kw-cell { display: flex; justify-content: center; }

/* === 칩 === */
.kw-chip {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  box-sizing: border-box;
  border: 2px solid #f3f3f3;
  background: #eeeeee;
  border-radius: 9999px;
  width: 80px; height: 35px;
  padding: 0 24px 0 10px;
  font-size: 13px; line-height: 1;
}
.kw-chip:hover { background: #f9fafb; }
.kw-text  {
  width: 100%;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 500;
  color: #4b5563;
}
.kw-xbtn  {
  position: absolute; top: 50%; right: 6px; transform: translateY(-50%);
  width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center;
  font-weight: 500; background: transparent; border: 0; padding: 0; cursor: pointer; line-height: 1;
  font-size: 18px; color: #9ca3af;
}
        `}</style>
      </section>
    </RequireLogin>
  );
}
