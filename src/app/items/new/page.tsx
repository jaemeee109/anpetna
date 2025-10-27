// src/app/items/new/page.tsx
'use client';

import React, { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/shared/data/http';
import PawIcon from '@/components/icons/Paw';

/** Bearer 프리픽스 부착 */
function toBearer(token: string) {
  return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
}

/** 공통: API 베이스 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined'
    ? window.location.origin.replace(':3000', ':8000')
    : '');

/** 권한/토큰 헤더 */
function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = getAccessToken?.() || '';
  return token ? { Authorization: toBearer(token) } : {};
}

/** 카테고리/상태 (백엔드 enum과 정확히 일치) */
const CATEGORIES = [
  { label: 'FEED', value: 'FEED' },
  { label: 'SNACKS', value: 'SNACKS' },
  { label: 'CLOTHING', value: 'CLOTHING' },
  { label: 'BATH', value: 'BATH_PRODUCT' },
  { label: 'BEAUTY', value: 'BEUTY_PRODUCT' },  // 철자 주의
  { label: 'TOY', value: 'TOY' },
  { label: 'OTHERS', value: 'OTHERS' },
] as const;

const STATUSES = [
  { label: '판매중', value: 'SELL' },
  { label: '품절', value: 'SOLD_OUT' },
] as const;

export default function ItemNewPage() {
  const router = useRouter();

  // 작성자/권한
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

  // 메인이미지(단일) + 미리보기
  const [thumb, setThumb] = useState<File | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  // 상세이미지(N장) + 미리보기
  const [detailFiles, setDetailFiles] = useState<File[]>([]);
  const [detailUrls, setDetailUrls] = useState<string[]>([]);
  const detailInputRef = useRef<HTMLInputElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // 작성자/관리자 판별
  useEffect(() => {
    try {
      const id =
        localStorage.getItem('memberId') ||
        sessionStorage.getItem('memberId') ||
        '';
      if (id) setWriter(id);

      const roleStr = (
        (localStorage.getItem('memberRole') ||
          sessionStorage.getItem('memberRole') ||
          (() => {
            try {
              const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
              return m ? decodeURIComponent(m[1]) : '';
            } catch { return ''; }
          })()) ?? ''
      ).toUpperCase();

      const admin = roleStr === 'ADMIN' || roleStr === 'ROLE_ADMIN';
      setIsAdmin(admin);
    } catch {}
  }, []);

  // 언마운트 시 객체 URL 해제
  useEffect(() => {
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
      detailUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [thumbUrl, detailUrls]);

  // 메인이미지 선택
  function onChangeThumb(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setThumb(f);
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    setThumbUrl(f ? URL.createObjectURL(f) : null);
  }

  // 상세이미지 선택(여러 번 선택해도 누적 추가)
  function onChangeDetails(e: React.ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files;
    if (!fl || fl.length === 0) return;

    const addFiles = Array.from(fl);
    const addUrls = addFiles.map((f) => URL.createObjectURL(f));
    setDetailFiles((prev) => [...prev, ...addFiles]);
    setDetailUrls((prev) => [...prev, ...addUrls]);

    if (detailInputRef.current) detailInputRef.current.value = '';
  }

  // 상세이미지 개별 삭제
  function removeDetailAt(idx: number) {
    setDetailFiles((prev) => prev.filter((_, i) => i !== idx));
    setDetailUrls((prev) => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const token = getAccessToken?.();
    if (!token) {
      setErrMsg('로그인이 필요합니다.');
      alert('로그인이 필요합니다.');
      return;
    }
    if (!isAdmin) {
      setErrMsg('상품등록은 관리자(ADMIN)만 가능합니다.');
      alert('상품등록은 관리자(ADMIN)만 가능합니다.');
      return;
    }
    if (!itemName.trim()) {
      alert('상품명을 입력해 주세요.');
      return;
    }
    if (itemPrice === '' || isNaN(Number(itemPrice)) || Number(itemPrice) < 0) {
      alert('가격을 올바르게 입력해 주세요.');
      return;
    }
    if (itemStock === '' || isNaN(Number(itemStock)) || Number(itemStock) < 0) {
      alert('재고를 올바르게 입력해 주세요.');
      return;
    }
    if (!thumb) {
      alert('메인이미지를 첨부해 주세요.');
      return;
    }

    setErrMsg(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append(
        'postReq',
        new Blob([JSON.stringify({
          itemName,
          itemPrice: Number(itemPrice),
          itemStock: Number(itemStock),
          itemDetail,
          itemCategory,
          itemSellStatus,
        })], { type: 'application/json' }),
        'payload.json',
      );
      fd.append('thumb', thumb);
      detailFiles.forEach((f) => fd.append('files', f));

      const resp = await fetch(new URL('item', API_BASE+'/'), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
        body: fd,
      });
      const json = await resp.clone().json().catch(() => null as any);
      if (!resp.ok || (json && json.isSuccess === false)) {
        const msg = json?.resMessage || json?.message || `등록 실패 (HTTP ${resp.status})`;
        throw new Error(msg);
      }
      alert('상품이 등록되었습니다.');
      router.replace('/items');
    } catch (e: any) {
      setErrMsg(e?.message || '등록 중 오류가 발생했습니다.');
      alert(e?.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="apn-container mx-auto px-4 py-8" style={{ maxWidth: '700px' }}>
      {/* ▼ 제목 + 아이콘을 가로로 가운데 정렬, 세로 정렬 가운데, 간격 고정 */}
      <div className="apn-title mt-[30px] mb-[45px]">
        <span className="apn-title-text">New ITEM</span>
       <span className="apn-title-ico"><PawIcon /></span>

      </div>

      <hr className="my-6 border-gray-300" />

      {/* 폼 */}
      <form onSubmit={onSubmit} className="apn-form">
        {/* 상품명 */}
        <div className="row grid grid-cols-4 items-center mt-[40px]">
          <label className="col-span-1 col-label">상품명</label>
          <input
            className="col-span-3 field-input w-[280px]"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="상품 이름을 입력하세요"
          />
        </div>

        {/* 메인이미지 — 파일선택 중앙 정렬 */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">메인이미지</label>
          <div className="col-span-3 h-[36px] flex items-center">
            <input
              className="field-file max-w-[480px] h-[36px]"
              type="file"
              accept="image/*"
              onChange={onChangeThumb}
            />
          </div>
        </div>

        {/* 메인이미지 미리보기 */}
        {thumbUrl && (
          <div className="row grid grid-cols-4 items-start">
            <div className="col-span-1" />
            <div className="col-span-3">
              <div className="thumb-main">
                <img src={thumbUrl} alt="메인이미지 미리보기" />
              </div>
            </div>
          </div>
        )}

        {/* 카테고리 (옵션칸: 테두리 유지) */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">카테고리</label>
          <select
            className="col-span-3 field-select max-w-[100px] text-center"
            value={itemCategory}
            onChange={(e) =>
              setItemCategory(e.target.value as (typeof CATEGORIES)[number]['value'])
            }
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 작성자 */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">작성자</label>
          <input
            className="col-span-3 field-input writer-field max-w-[100px] bg-gray-50"
            value={writer}
            readOnly
            placeholder="로그인한 작성자"
          />
        </div>

        {/* 가격 */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">가격</label>
          <div className="col-span-3 flex items-center gap-2">
            <input
              className="field-input text-right max-w-[100px]"
              value={itemPrice}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, '');
                setItemPrice(v === '' ? '' : Number(v));
              }}
              inputMode="numeric"
              placeholder="0"
            />
            <span>원</span>
          </div>
        </div>

        {/* 재고 */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">재고</label>
          <input
            className="col-span-3 field-input text-right max-w-[100px]"
            value={itemStock}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, '');
              setItemStock(v === '' ? '' : Number(v));
            }}
            inputMode="numeric"
            placeholder="0"
          />
        </div>

        {/* 상태 (옵션칸: 테두리 유지) */}
        <div className="row grid grid-cols-4 items-center">
          <label className="col-span-1 col-label">상태</label>
          <select
            className="col-span-3 field-select max-w-[100px] text-center"
            value={itemSellStatus}
            onChange={(e) =>
              setItemSellStatus(e.target.value as (typeof STATUSES)[number]['value'])
            }
          >
            {STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* 상품상세이미지 — 파일선택 중앙 정렬 */}
        <div className="row grid grid-cols-4 items-start">
          <label className="col-span-1 col-label">상품상세이미지</label>
          <div className="col-span-3">
            <div className="h-[36px] flex items-center">
              <input
                ref={detailInputRef}
                className="field-file max-w:[480px] h-[36px]"
                type="file"
                accept="image/*"
                multiple
                onChange={onChangeDetails}
              />
            </div>
            {detailUrls.length > 0 && (
              <div className="thumb-grid mt-3">
                {detailUrls.map((u, i) => (
                  <div key={i} className="thumb-detail">
                    <img src={u} alt={`상세이미지 ${i + 1}`} />
                    <button
                      type="button"
                      onClick={() => removeDetailAt(i)}
                      className="thumb-del-btn"
                      aria-label={`상세이미지 ${i + 1} 삭제`}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 상품상세 (textarea: 테두리 유지) */}
        <div className="row grid grid-cols-4 items-start">
          <label className="col-span-1 col-label">상품상세</label>
          <textarea
            className="col-span-3 field-textarea min-h-[140px] max-w-[640px] mb-[30px]"
            value={itemDetail}
            onChange={(e) => setItemDetail(e.target.value)}
            placeholder="상세설명을 입력하세요 (이미지 설명 포함)"
          />
        </div>

        <hr className="my-6 border-gray-300" />

        {/* 버튼 둘 다 흰색 UI */}
        <div className="flex gap-3 justify-end">
          <button type="submit" disabled={submitting} className="btn-3d btn-primary px-5 py-2 rounded border mb-[50px]">
            {submitting ? '등록 중…' : '등록'}
          </button>
          <Link href="/items" className="btn-3d btn-gray px-5 py-2 rounded border" prefetch={false}>취소</Link>
        </div>

        {errMsg && <p className="text-red-600 mt-2 whitespace-pre-wrap">{errMsg}</p>}
      </form>

      <style jsx>{`
        /* ===== 제목(텍스트+아이콘) 정렬/간격 ===== */
.apn-title {
  display: flex;
  align-items: center;      /* 세로 가운데 */
  justify-content: center;  /* 가로 가운데 */
  gap: 10px;                /* 텍스트-아이콘 간격 */
  margin-bottom: 18px;
}
.apn-title-text {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;           /* 아이콘과 정확히 맞추기 */
}

/* 아이콘: 래퍼 크기 고정 + 내부 SVG 강제 맞춤 */
.apn-title-ico {
  width: 30px;              /* ← 원하는 크기(px)로 조절하세요 */
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
/* PawIcon 내부 svg가 width/height를 박아놔도 강제로 덮어쓰기 */
.apn-title-ico :global(svg) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}


        /* 버튼 두 개 모두 흰색 UI로 통일 */
        .btn-3d { box-shadow: 0 2px 0 rgba(0,0,0,0.1); }
        .btn-primary,
        .btn-gray {
          background:#fff;
          color:#111827;
        }
        .btn-3d:active { transform: translateY(1px); box-shadow:0 1px 0 rgba(0,0,0,0.1); }

        /* 행 간격 */
        .apn-form .row { column-gap: 10px; }
        .apn-form .row + .row { margin-top: 16px; }

        /* 라벨/필드 높이/정렬 통일 */
        .apn-form .col-label {
          height: 36px; display:flex; align-items:center; justify-content:flex-end;
          font-weight: 500; text-align:right;
        }
        .apn-form .field-input,
        .apn-form .field-file,
        .apn-form .field-select,
        .apn-form .field-textarea { height: 36px; }

        /* 인풋 테두리 제거(옵션칸/textarea 제외) */
        .apn-form .field-input,
        .apn-form input[type="text"],
        .apn-form input[type="number"],
        .apn-form input:not([type]),
        .apn-form .row input:not([type="file"]):not([type="checkbox"]):not([type="radio"]) {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          outline: none;
          padding: 0 12px;
        }

        /* placeholder 글씨 크기 */
        .apn-form .field-input::placeholder { font-size: 15px; }

        /* 작성자 값 폰트 크기 */
        .writer-field { font-size: 16px; }

        /* 파일 인풋 중앙 정렬 보조 */
        .apn-form .field-file {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          vertical-align: middle;
          line-height: 36px;
        }

        /* select/textarea는 기존 테두리 유지 */
        .apn-form .field-select { border: 1px solid #e5e7eb; border-radius: 4px; background:#fff; }
        .apn-form .field-textarea {
          border: 1px solid #e5e7eb; border-radius: 4px;
          height: auto; padding: 8px 12px; background:#fff;
        }

        /* 이미지 미리보기 */
        .thumb-main {
          width: 260px; height: 260px;
          border: 1px solid #e5e7eb; border-radius: 8px;
          overflow: hidden; background: #fafafa;
        }
        .thumb-main img { width:100%; height:100%; object-fit:cover; display:block; }

        .thumb-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .thumb-detail {
          position: relative;
          width:160px; height:160px;
          border:1px solid #e5e7eb; border-radius:8px;
          overflow:hidden; background:#fafafa;
        }
        .thumb-detail img { width:100%; height:100%; object-fit:cover; display:block; }
        .thumb-del-btn {
          position:absolute; top:6px; right:6px;
          font-size:12px; padding:2px 6px;
          border:1px solid #e5e7eb; border-radius:6px;
          background:rgba(255,255,255,0.92); color:#dc2626; cursor:pointer;
        }
      `}</style>
    </div>
  );
}
