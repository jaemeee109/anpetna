'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import './banner.admin.css';

type Banner = {
  id?: number;
  imageUrl?: string;
  linkUrl?: string;
  sortOrder?: number;
  active?: boolean; // DTO 명칭과 동일하게 사용
};

/** API 베이스 유틸 */
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

function toAbs(p?: string): string {
  if (!p) return '';
  if (/^https?:\/\//i.test(p)) return p;
  const base = resolveApiBase();
  return p.startsWith('/') ? `${base}${p}` : `${base}/${p}`;
}

/** JSON 안전 파서 (응답이 JSON이 아닐 때 에러 방지) */
async function safeJson<T = any>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export default function AdminBannerPage() {
  const [banners, setBanners] = useState<Banner[]>([]);

  // 등록폼
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(1);
  const [active, setActive] = useState(true); // CreateBannerReq 필수값

  // 수정폼
  const [editId, setEditId] = useState<number | null>(null);
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editLink, setEditLink] = useState('');
  const [editOrder, setEditOrder] = useState(1);
  const [editActive, setEditActive] = useState<boolean>(true);

  /** 배너 목록 조회 */
  async function fetchBanners() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('관리자 토큰이 없습니다. 먼저 로그인하세요.');
      return;
    }

    const url = `${resolveApiBase()}/adminPage/banner/allList?page=0&size=20&sort=sortOrder,asc`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      alert('관리자 인증이 필요합니다. 관리자 계정으로 로그인 후 다시 시도하세요.');
      setBanners([]);
      return;
    }
    if (!res.ok) {
      alert(`목록 조회 실패 (${res.status})`);
      setBanners([]);
      return;
    }

    const json = await safeJson(res);
    const list = json?.result?.dtoList || json?.result?.content || [];
    setBanners(Array.isArray(list) ? list : []);
  }

  /** 배너 등록 (Create: multipart/form-data + @ModelAttribute CreateBannerReq + @RequestPart("image")) */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert('이미지를 선택하세요');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('관리자 토큰이 없습니다. 먼저 로그인하세요.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('linkUrl', linkUrl);
    formData.append('sortOrder', String(sortOrder));
    formData.append('active', String(active)); // ✅ 필수값: active

    // startAt/endAt 사용 시 ISO-8601 로 추가: formData.append('startAt', '2025-09-25T09:00:00');
    // formData.append('endAt', '2025-09-30T23:59:59');

    const res = await fetch(`${resolveApiBase()}/adminPage/banner/create`, {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      alert(`등록 실패 (${res.status})`);
      return;
    }
    alert('등록 완료');
    setFile(null);
    setLinkUrl('');
    setSortOrder(1);
    setActive(true);
    fetchBanners();
  }

  /** 배너 수정 (Update: multipart/form-data + @ModelAttribute UpdateBannerReq + 선택 이미지) */
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('관리자 토큰이 없습니다. 먼저 로그인하세요.');
      return;
    }

    const formData = new FormData();
    formData.append('linkUrl', editLink);
    formData.append('sortOrder', String(editOrder));
    formData.append('active', String(editActive)); // UpdateBannerReq는 null 허용이나, 명시적으로 보내면 반영됨
    if (editFile) formData.append('image', editFile);

    // 필요 시 시간 필드도 동일 포맷으로:
    // formData.append('startAt', '2025-09-25T09:00:00');
    // formData.append('endAt', '2025-09-30T23:59:59');

    const res = await fetch(`${resolveApiBase()}/adminPage/banner/update/${editId}`, {
      method: 'POST', // 컨트롤러가 @PostMapping("/update/{bannerId}")
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      alert(`수정 실패 (${res.status})`);
      return;
    }
    alert('수정 완료');
    setEditId(null);
    setEditFile(null);
    fetchBanners();
  }

  /** 배너 삭제 (Delete) */
  async function handleDelete(id?: number) {
    if (!id) return;
    if (!confirm('삭제하시겠습니까?')) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('관리자 토큰이 없습니다. 먼저 로그인하세요.');
      return;
    }

    const res = await fetch(`${resolveApiBase()}/adminPage/banner/delete/${id}`, {
      method: 'POST', // 컨트롤러가 @PostMapping("/delete/{bannerId}")
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      alert(`삭제 실패 (${res.status})`);
      return;
    }
    fetchBanners();
  }

  useEffect(() => {
    fetchBanners();
  }, []);

  return (
    <main className="admin-banner">
      <h1 className="admin-banner-title">배너 관리</h1>

      {/* 등록 폼 */}
      <form onSubmit={handleSubmit} className="admin-banner-form">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <input
          type="text"
          placeholder="링크 URL"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <input
          type="number"
          placeholder="정렬 순서"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
        />
        {/* active 스위치 */}
        <label className="admin-flag">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          노출(active)
        </label>
        <button type="submit">등록</button>
      </form>

      {/* 목록 */}
      <div className="admin-banner-list">
        {banners.map((b) => (
          <div key={b.id} className="admin-banner-card">
            <Link href={b.linkUrl || '#'} target="_blank">
              <img src={toAbs(b.imageUrl)} alt="배너" />
            </Link>
            <div className="admin-banner-info">
              <div>순서: {b.sortOrder}</div>
              <div>링크: {b.linkUrl}</div>
              <div>노출: {String(b.active)}</div>
              <div className="admin-banner-actions">
                <button onClick={() => handleDelete(b.id)}>삭제</button>
                <button
                  onClick={() => {
                    setEditId(b.id!);
                    setEditLink(b.linkUrl || '');
                    setEditOrder(b.sortOrder || 1);
                    setEditActive(Boolean(b.active));
                    setEditFile(null);
                  }}
                >
                  수정
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 수정 폼 (선택된 경우만 노출) */}
      {editId && (
        <form onSubmit={handleUpdate} className="admin-banner-form">
          <h2>배너 수정</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setEditFile(e.target.files?.[0] || null)}
          />
          <input
            type="text"
            placeholder="링크 URL"
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
          />
          <input
            type="number"
            placeholder="정렬 순서"
            value={editOrder}
            onChange={(e) => setEditOrder(Number(e.target.value))}
          />
          <label className="admin-flag">
            <input
              type="checkbox"
              checked={editActive}
              onChange={(e) => setEditActive(e.target.checked)}
            />
            노출(active)
          </label>
          <div className="admin-banner-actions">
            <button type="submit">저장</button>
            <button type="button" onClick={() => setEditId(null)}>
              취소
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
