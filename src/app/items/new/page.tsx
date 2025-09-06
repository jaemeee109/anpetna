'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/shared/data/http'; // 프로젝트에 맞춰 그대로 사용

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
  { label: 'BATH', value: 'BATH_PRODUCT' },     // 백엔드: BATH_PRODUCT
  { label: 'BEAUTY', value: 'BEUTY_PRODUCT' },  // 백엔드: BEUTY_PRODUCT (철자 주의)
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

  const [thumb, setThumb] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);

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
              const m = document.cookie.match(
                /(?:^|;\s*)memberRole=([^;]+)/
              );
              return m ? decodeURIComponent(m[1]) : '';
            } catch {
              return '';
            }
          })()) ?? ''
      ).toUpperCase();

      const admin = roleStr === 'ADMIN' || roleStr === 'ROLE_ADMIN';
      setIsAdmin(admin);
    } catch {}
  }, []);

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
      // 서버 스펙: multipart/form-data
      // 파트명: postReq(JSON), thumb(단일), files(0~N)
      const fd = new FormData();

      fd.append(
        'postReq',
        new Blob(
          [
            JSON.stringify({
              itemName: itemName,
              itemPrice: Number(itemPrice),
              itemStock: Number(itemStock),
              itemDetail: itemDetail,
              itemCategory: itemCategory,
              itemSellStatus: itemSellStatus,
            }),
          ],
          { type: 'application/json' },
        ),
        'payload.json',
      );

      fd.append('thumb', thumb);

      if (files && files.length > 0) {
        Array.from(files).forEach((f) => fd.append('files', f));
      }

      const resp = await fetch(new URL('/item', API_BASE), {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(), // Content-Type은 자동
        body: fd,
      });

      // **핵심**: ApiResult의 isSuccess 확인
      const json = await resp
        .clone()
        .json()
        .catch(() => null as any);

      if (!resp.ok || (json && json.isSuccess === false)) {
        const msg =
          json?.resMessage ||
          json?.message ||
          `등록 실패 (HTTP ${resp.status})`;
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">상품등록</h1>

      {/* 회색선 */}
      <hr className="my-6 border-gray-300" />

      {/* 폼 */}
      <form onSubmit={onSubmit} className="space-y-5">
        {/* 상품명 */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">상품명</label>
          <input
            className="col-span-3 border rounded px-3 py-2"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="상품 이름을 입력하세요"
          />
        </div>

        {/* 메인이미지(썸네일) */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">메인이미지</label>
          <input
            className="col-span-3"
            type="file"
            accept="image/*"
            onChange={(e) => setThumb(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* 카테고리 (ALL 제거) */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">카테고리</label>
          <select
            className="col-span-3 border rounded px-3 py-2"
            value={itemCategory}
            onChange={(e) =>
              setItemCategory(
                e.target.value as (typeof CATEGORIES)[number]['value'],
              )
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 작성자 */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">작성자</label>
          <input
            className="col-span-3 border rounded px-3 py-2 bg-gray-50"
            value={writer}
            readOnly
            placeholder="로그인한 작성자"
          />
        </div>

        {/* 가격 */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">가격</label>
          <div className="col-span-3 flex items-center gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-right"
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
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">재고</label>
          <input
            className="col-span-3 border rounded px-3 py-2 text-right"
            value={itemStock}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, '');
              setItemStock(v === '' ? '' : Number(v));
            }}
            inputMode="numeric"
            placeholder="0"
          />
        </div>

        {/* 상태 */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">상태</label>
          <select
            className="col-span-3 border rounded px-3 py-2"
            value={itemSellStatus}
            onChange={(e) =>
              setItemSellStatus(
                e.target.value as (typeof STATUSES)[number]['value'],
              )
            }
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* 상품상세이미지 (다중 첨부) */}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="col-span-1 font-medium">상품상세이미지</label>
          <input
            className="col-span-3"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>

        {/* 상품상세 */}
        <div className="grid grid-cols-4 gap-4 items-start">
          <label className="col-span-1 font-medium">상품상세</label>
          <textarea
            className="col-span-3 border rounded px-3 py-2 min-h-[140px]"
            value={itemDetail}
            onChange={(e) => setItemDetail(e.target.value)}
            placeholder="상세설명을 입력하세요 (이미지 설명 포함)"
          />
        </div>

        {/* 회색선 */}
        <hr className="my-6 border-gray-300" />

        {/* 액션 */}
        <div className="flex gap-3 justify-end">
          <Link
            href="/items"
            className="btn-3d btn-gray px-5 py-2 rounded border"
            prefetch={false}
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-3d btn-primary px-5 py-2 rounded border"
          >
            {submitting ? '등록 중…' : '등록'}
          </button>
        </div>

        {errMsg && (
          <p className="text-red-600 mt-2 whitespace-pre-wrap">{errMsg}</p>
        )}
      </form>

      <style jsx>{`
        .btn-3d {
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.1);
        }
        .btn-primary {
          background: #111827;
          color: white;
        }
        .btn-gray {
          background: #f3f4f6;
          color: #111827;
        }
        .btn-3d:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
