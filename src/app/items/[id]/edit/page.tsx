// src/app/items/[id]/edit/page.tsx
'use client';

import { useEffect, useMemo, useState, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

/** API Base (등록/상세와 동일한 방식) */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined'
    ? window.location.origin.replace(':3000', ':8000')
    : '');

/** 상대경로를 절대경로로 변환(미리보기용, 서버 전송 값은 원본 유지) */
function toAbs(u?: string) {
  const url = u || '';
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (API_BASE || '').replace(/\/+$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

/** URL/경로 -> 파일명만 추출(서버가 파일명 기준으로 매칭하는 경우 대응) */
function toBaseName(u?: string) {
  const s = (u || '').split('?')[0];
  if (!s) return '';
  const parts = s.split('/');
  return parts[parts.length - 1] || '';
}

/** Bearer 토큰 헬퍼 (등록 페이지와 동일 규칙을 그대로 사용) */
function toBearer(t?: string) {
  return `Bearer ${t ?? ''}`.trim();
}
function getAccessToken() {
  try {
    return (
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken') ||
      (() => {
        try {
          const m = document.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
          return m ? decodeURIComponent(m[1]) : '';
        } catch {
          return '';
        }
      })() ||
      ''
    );
  } catch {
    return '';
  }
}
function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: toBearer(token) } : {};
}

/** 카테고리/상태 (등록 페이지와 동일한 값·라벨) */
const CATEGORIES = [
  { label: 'FEED', value: 'FEED' },
  { label: 'SNACKS', value: 'SNACKS' },
  { label: 'CLOTHING', value: 'CLOTHING' },
  { label: 'BATH', value: 'BATH_PRODUCT' },
  { label: 'BEAUTY', value: 'BEUTY_PRODUCT' },
  { label: 'TOY', value: 'TOY' },
  { label: 'OTHERS', value: 'OTHERS' },
] as const;

const STATUSES = [
  { label: '판매중', value: 'SELL' },
  { label: '품절',   value: 'SOLD_OUT' },
] as const;

/** 상세 조회 응답 형태(등록/상세에서 쓰던 필드만 사용) */
type ItemDetailRes = {
  itemId: number;
  itemName: string;
  itemPrice: number;
  itemStock?: number;
  itemCategory?: (typeof CATEGORIES)[number]['value'] | string;
  itemSellStatus?: (typeof STATUSES)[number]['value'] | string;
  itemDetail?: string;
  thumbnailUrl?: string;   // 저장된 썸네일 URL(또는 경로)
  imageUrls?: string[];    // 상세 이미지 URL(또는 경로) 목록
};

/** 내부 상태: 기존 이미지 + 유지/삭제 + 정렬(정렬 입력은 숨김) */
type ExistingImg = { url: string; sortOrder: number };
type NewImg = { file: File; sortOrder: number };

export default function ItemEditPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  // 작성자(표시용), 관리자인지(표시 유지)
  const [writer, setWriter] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  // 폼 상태
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemStock, setItemStock] = useState<number | ''>('');
  const [itemCategory, setItemCategory] =
    useState<(typeof CATEGORIES)[number]['value']>('FEED');
  const [itemSellStatus, setItemSellStatus] =
    useState<(typeof STATUSES)[number]['value']>('SELL');
  const [itemDetail, setItemDetail] = useState('');

  // 썸네일(기존/새 파일)
  const [existingThumb, setExistingThumb] = useState<string>(''); // 원본 경로/파일명 보관
  const [newThumb, setNewThumb] = useState<File | null>(null);

  // 상세이미지(기존/신규)
  const [existingImages, setExistingImages] = useState<ExistingImg[]>([]);
  const [newImages, setNewImages] = useState<NewImg[]>([]);

  // 로딩/오류/전송
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** 작성자/권한 세팅 (등록 페이지와 동일한 로직) */
  useEffect(() => {
    try {
      const id =
        localStorage.getItem('memberId') ||
        sessionStorage.getItem('memberId') ||
        '';
      if (id) setWriter(id);

      const role = (
        (localStorage.getItem('memberRole') ||
          sessionStorage.getItem('memberRole') ||
          (() => {
            try {
              const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
              return m ? decodeURIComponent(m[1]) : '';
            } catch {
              return '';
            }
          })()) ?? ''
      ).toUpperCase();
      setIsAdmin(role === 'ADMIN' || role === 'ROLE_ADMIN');
    } catch {}
  }, []);

  /** 상세 데이터 로드 */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg(null);

        const resp = await fetch(`${API_BASE}/item/${id}`, {
          method: 'GET',
          credentials: 'include',
          headers: ({ ...authHeaders(), Accept: 'application/json' } as HeadersInit),
        });
        const data = await resp.clone().json().catch(() => null as any);
        const payload: ItemDetailRes = (data?.result ?? data) as ItemDetailRes;

        if (!resp.ok || !payload || !payload.itemId) {
          throw new Error(
            data?.message || data?.resMessage || `상세 조회 실패 (HTTP ${resp.status})`
          );
        }

        if (!alive) return;

        // 폼 채우기
        setItemName(payload.itemName ?? '');
        setItemPrice(Number.isFinite(Number(payload.itemPrice)) ? Number(payload.itemPrice) : '');
        setItemStock(
          Number.isFinite(Number(payload.itemStock)) ? Number(payload.itemStock) : ''
        );
        setItemCategory((payload.itemCategory as any) || 'FEED');
        setItemSellStatus((payload.itemSellStatus as any) || 'SELL');
        setItemDetail(payload.itemDetail ?? '');

        // 원본(상대경로) 그대로 보관 → 미리보기 때만 절대경로로 변환
        setExistingThumb(payload.thumbnailUrl || '');

        const imgs = (payload.imageUrls || []).map((u, i) => ({
          url: u,        // 원본 보관
          sortOrder: i + 1, // 상세는 1부터
        }));
        setExistingImages(imgs);
      } catch (e: any) {
        if (alive) setErrMsg(e?.message || '상품 정보를 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /** 새 상세이미지 추가 */
  const onAddNewImages: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 새 이미지 sortOrder는 현재 최대+1부터 순서 부여
    const maxOrder = Math.max(
      0,
      ...existingImages.map((x) => x.sortOrder),
      ...newImages.map((x) => x.sortOrder)
    );
    const list: NewImg[] = [];
    Array.from(files).forEach((f, i) => {
      list.push({ file: f, sortOrder: maxOrder + i + 1 });
    });
    setNewImages((prev) => [...prev, ...list]);
    // 같은 파일 다시 선택 가능하도록
    e.currentTarget.value = '';
  };

  /** 기존 상세이미지 삭제(버튼 누르면 즉시 화면에서 제거되고 서버에선 삭제됨) */
  const removeExisting = (idx: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  };

  /** 기존 상세이미지 교체(미리보기 클릭 → 파일 선택 → 기존은 제거하고 같은 sortOrder로 신규 추가) */
  const onReplacePick = (idx: number) => {
    const input = document.getElementById(`__rep_${idx}`) as HTMLInputElement | null;
    input?.click();
  };
  const onReplaceChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const idx = Number(e.currentTarget.dataset.idx || -1);
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = ''; // 같은 파일 재선택 허용
    if (!file || idx < 0) return;

    setExistingImages((prev) => {
      const target = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      if (target) {
        setNewImages((n) => [...n, { file, sortOrder: target.sortOrder }]);
      }
      return rest;
    });
  };

  /** 저장(수정) — multipart/form-data */
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setErrMsg(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('로그인이 필요합니다.');
      }

      // 썸네일 파일명(상세 목록에서 제외해 썸네일이 상세로 섞이는 문제 방지)
      const thumbName = toBaseName(existingThumb);

      // 기존 상세: 화면에 남아있는 것만 keep (썸네일과 동일 파일명은 혹시 몰라 제외)
      const seen = new Set<string>();
      const keepList = existingImages
        .filter((x) => toBaseName(x.url) !== thumbName)
        .filter((x) => {
          const fn = toBaseName(x.url);
          if (seen.has(fn)) return false;
          seen.add(fn);
          return true;
        })
        .map((x) => ({
          fileName: toBaseName(x.url),
          sortOrder: Number(x.sortOrder) || 1,
        }));

      const json: any = {
        itemId: Number(id),
        itemName,
        itemPrice: Number(itemPrice || 0),
        itemStock: Number(itemStock || 0),
        itemCategory,
        itemSellStatus,
        itemDetail,
        existingThumb: thumbName || '',   // @NotNull 대응
        existingImages: keepList,
      };

      const fd = new FormData();
      const jsonBlob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      fd.append('putReq', jsonBlob);

      // 새 썸네일(선택한 경우에만)
      if (newThumb) {
        fd.append('newThumb', newThumb);
      }

      // 신규 상세이미지 + 같은 길이의 sortOrder
      newImages.forEach((ni) => fd.append('newFiles', ni.file));
      newImages.forEach((ni) => fd.append('sortOrder', String(Number(ni.sortOrder) || 1)));

      const resp = await fetch(`${API_BASE}/item/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: ({
          ...authHeaders(),
          Accept: 'application/json',
        } as HeadersInit),
        body: fd,
      });

      const txt = await resp.clone().text();
      const body = (() => {
        try {
          return JSON.parse(txt);
        } catch {
          return { message: txt };
        }
      })();

      if (!resp.ok) {
        throw new Error(body?.message || body?.resMessage || `수정 실패 (HTTP ${resp.status})`);
      }

      alert('상품이 수정되었습니다.');
      router.replace(`/items/${id}`);
    } catch (e: any) {
      setErrMsg(e?.message || '상품 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  // 미리보기(썸네일) — 새 파일이면 blob, 아니면 절대경로로 변환해서 표시
  const thumbPreview = useMemo(() => {
    if (newThumb) return URL.createObjectURL(newThumb);
    return toAbs(existingThumb);
  }, [newThumb, existingThumb]);

  if (loading) {
    return (
      <main className="apn-form px-4 py-8 text-center">
        로딩중…
      </main>
    );
  }
  if (errMsg && !itemName) {
    return (
      <main className="apn-form px-4 py-8 text-center">
        {errMsg}
      </main>
    );
  }

  return (
    <main className="apn-form px-4 py-8">
      <h1 className="title">상품 수정</h1>

      <form onSubmit={onSubmit} className="form">
        {/* 상품명 */}
        <div className="row">
          <label className="label" htmlFor="name">상품명</label>
          <input
            id="name"
            className="control"
            placeholder="상품명"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            required
          />
        </div>

        {/* 메인이미지 */}
        <div className="row">
          <span className="label">메인이미지</span>
          <div className="control">
            {thumbPreview ? (
              <img src={thumbPreview} alt="thumbnail" className="thumb" />
            ) : (
              <div className="thumb noimg">No Image</div>
            )}
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewThumb(e.target.files?.[0] ?? null)}
              />
            </div>
            {/* 기존 썸네일 안내(디자인 유지용 텍스트) */}
            {existingThumb && !newThumb && (
              <p className="hint">현재 등록된 썸네일을 유지합니다. 새 파일을 선택하면 교체됩니다.</p>
            )}
            {!existingThumb && (
              <p className="hint">썸네일이 없습니다. 파일을 선택해 주세요.</p>
            )}
          </div>
        </div>

        {/* 카테고리 */}
        <div className="row">
          <label className="label" htmlFor="category">카테고리</label>
          <select
            id="category"
            className="control"
            value={itemCategory}
            onChange={(e) =>
              setItemCategory(e.target.value as (typeof CATEGORIES)[number]['value'])
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 작성자(표시만) */}
        <div className="row">
          <span className="label">작성자</span>
          <div className="control readonly">{writer || '-'}</div>
        </div>

        {/* 가격 */}
        <div className="row">
          <label className="label" htmlFor="price">가격</label>
          <input
            id="price"
            className="control"
            type="number"
            min={0}
            step={100}
            placeholder="가격"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        {/* 재고 */}
        <div className="row">
          <label className="label" htmlFor="stock">재고</label>
          <input
            id="stock"
            className="control"
            type="number"
            min={0}
            step={1}
            placeholder="재고"
            value={itemStock}
            onChange={(e) => setItemStock(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        {/* 상태 */}
        <div className="row">
          <label className="label" htmlFor="status">상태</label>
          <select
            id="status"
            className="control"
            value={itemSellStatus}
            onChange={(e) =>
              setItemSellStatus(e.target.value as (typeof STATUSES)[number]['value'])
            }
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* 상품상세이미지 (기존/신규) */}
        <div className="row">
          <span className="label">상품상세이미지</span>
          <div className="control">
            {/* 기존 이미지 리스트 */}
            {existingImages.length > 0 ? (
              <ul className="imgs">
                {existingImages.map((img, i) => (
                  <li key={`${img.url}-${i}`} className="imgitem">
                    {/* 미리보기 클릭 → 교체 */}
                    <img
                      src={toAbs(img.url)}
                      alt={`img-${i + 1}`}
                      onClick={() => onReplacePick(i)}
                      style={{ cursor: 'pointer' }}
                      title="클릭하여 다른 이미지로 교체"
                    />
                    {/* 숨겨진 파일 입력(교체용) */}
                    <input
                      id={`__rep_${i}`}
                      data-idx={i}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={onReplaceChosen}
                    />
                    <div className="img-controls">
                      <button
                        type="button"
                        className="btn-3d btn-white px-3 py-1 rounded border"
                        onClick={() => removeExisting(i)}
                        title="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">등록된 상세이미지가 없습니다.</p>
            )}

            {/* 신규 이미지 추가 */}
            <div className="mt-2">
              <input type="file" accept="image/*" multiple onChange={onAddNewImages} />
            </div>

            {/* 신규 이미지 미리보기/제거 (정렬 입력 제거) */}
            {newImages.length > 0 && (
              <ul className="imgs mt-2">
                {newImages.map((ni, i) => {
                  const url = URL.createObjectURL(ni.file);
                  return (
                    <li key={`${ni.file.name}-${i}`} className="imgitem">
                      <img src={url} alt={`new-${i + 1}`} />
                      <div className="img-controls">
                        <button
                          type="button"
                          className="btn-3d btn-white px-3 py-1 rounded border"
                          onClick={() =>
                            setNewImages((prev) => prev.filter((_, idx) => idx !== i))
                          }
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* 상품상세 */}
        <div className="row">
          <label className="label" htmlFor="detail">상품상세</label>
          <textarea
            id="detail"
            className="control textarea"
            rows={8}
            placeholder="상품 상세 설명"
            value={itemDetail}
            onChange={(e) => setItemDetail(e.target.value)}
          />
        </div>

        {/* 액션 */}
        <div className="actions">
          <Link
            href={`/items/${id}`}
            prefetch={false}
            className="btn-3d btn-white px-4 py-2 rounded border"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-3d btn-white px-4 py-2 rounded border"
          >
            {submitting ? '저장중…' : '수정하기'}
          </button>
        </div>

        {errMsg && <p className="err">{errMsg}</p>}
      </form>

      {/* 등록 페이지와 동일한 톤의 스타일 유지 + 삭제 버튼 가로 정렬 보장 */}
      <style jsx>{`
        .apn-form {
          max-width: 720px;
          margin: 0 auto;
          --label-w: 120px;
        }
        .title { font-size: 22px; font-weight: 600; text-align: center; margin-bottom: 16px; }

        .form { display: flex; flex-direction: column; gap: 12px; }
        .row {
          display: grid;
          grid-template-columns: var(--label-w) 1fr;
          align-items: start;
          gap: 8px;
        }
        .label { color: #4b5563; padding-top: 8px; }
        .control {
          width: 100%;
          border: 1px solid #e5e7eb; border-radius: 8px;
          padding: 8px 10px; outline: none;
          background: #fff; color: #111827;
        }
        .control.readonly {
          border: 1px dashed #e5e7eb; border-radius: 8px;
          padding: 8px 10px; background: #fafafa;
        }
        .textarea { min-height: 160px; resize: vertical; }

        .thumb {
          width: 180px; height: 180px; object-fit: cover;
          border: 1px solid #e5e7eb; border-radius: 8px;
        }
        .thumb.noimg {
          display: flex; align-items: center; justify-content: center;
          color: #9ca3af; font-size: 13px; background: #fafafa;
        }

        .imgs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .imgitem img {
          width: 100%; height: 160px; object-fit: cover;
          border: 1px solid #e5e7eb; border-radius: 8px;
        }
        .img-controls {
          display: flex; align-items: center; justify-content: flex-end;
          gap: 8px; margin-top: 6px; white-space: nowrap;
        }

        .actions { display: flex; justify-content: center; gap: 8px; margin-top: 8px; }
        .btn-3d { box-shadow: 0 2px 0 rgba(0,0,0,0.08); }
        .btn-white { background: #fff; color: #111827; }
        .btn-3d:active { transform: translateY(1px); box-shadow: 0 1px 0 rgba(0,0,0,0.08); }

        .hint { margin-top: 6px; font-size: 12px; color: #6b7280; }
        .err { margin-top: 10px; color: #b91c1c; text-align: center; }
      `}</style>
    </main>
  );
}
