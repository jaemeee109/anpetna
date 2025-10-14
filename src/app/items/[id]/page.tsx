// src/app/items/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAddCart } from '@/features/cart/hooks/useCart';
import ReviewSection from '@/features/review/ui/ReviewSection';
import { pickHttpErrorMessage } from '@/shared/data/http';
import { cartApi } from '@/features/cart/data/cart.api';


/** 가격 포맷(1,000 단위 + 원) */
function formatPriceKRW(n?: number) {
  return new Intl.NumberFormat('ko-KR').format(Number(n || 0)) + '원';
}

/** 관리자 여부(로컬/세션/쿠키에서 role 확인) */
function isAdminClient(): boolean {
  try {
    const raw =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('memberRole') ??
          sessionStorage.getItem('memberRole') ??
          (() => {
            try {
              const m = document.cookie.match(/(?:^|;\s*)memberRole=([^;]+)/);
              return m ? decodeURIComponent(m[1]) : '';
            } catch {
              return '';
            }
          })())) || '';
    const role = raw.toUpperCase();
    return role === 'ADMIN' || role === 'ROLE_ADMIN';
  } catch {
    return false;
  }
}

/** 액세스 토큰/헤더 (수정 페이지와 동일 컨벤션) */
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

/** 이미지 베이스 URL 추정(개발 3000↔8000 포트 스왑) */
function resolveImgBase(): string {
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

/** API BASE (상세조회) */
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  (typeof window !== 'undefined'
    ? window.location.origin.replace(':3000', ':8000')
    : '');

/** 백엔드 SearchOneItemRes 형태(필요 필드만) */
type ItemDetailRes = {
  itemId: number;
  itemName: string;
  itemPrice: number;
  itemCategory?: string;   // 예: FEED, BATH_PRODUCT, BEUTY_PRODUCT ...
  itemDetail?: string;
  thumbnailUrl?: string;
  imageUrls?: string[];
};

/** 상세페이지 표기용 카테고리 매핑(백엔드 → 목록 표기) */
const CAT_LABEL_MAP: Record<string, string> = {
  FEED: 'FEED',
  SNACKS: 'SNACKS',
  CLOTHING: 'CLOTHING',
  BATH_PRODUCT: 'BATH',
  BEUTY_PRODUCT: 'BEAUTY',
  TOY: 'TOY',
  OTHERS: 'OTHERS',
  BATH: 'BATH',
  BEAUTY: 'BEAUTY',
};
function displayCategory(raw?: string) {
  if (!raw) return '-';
  const k = raw.toUpperCase().trim();
  return CAT_LABEL_MAP[k] ?? k;
}

/** 상대경로 이미지를 절대경로로 */
function toAbs(url?: string, base?: string) {
  const u = url || '';
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  const B = (base || '').replace(/\/+$/, '');
  const p = u.startsWith('/') ? u : `/${u}`;
  return `${B}${p}`;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [item, setItem] = useState<ItemDetailRes | null>(null);

  const [qty, setQty] = useState<number>(1);

  const IMG_BASE = resolveImgBase();
  const addMut = useAddCart();
  useEffect(() => setIsAdmin(isAdminClient()), []);

  // 상세 조회
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const resp = await fetch(`${API_BASE}/item/${id}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await resp.clone().json().catch(() => null as any);
        const payload: ItemDetailRes = (data?.result ?? data) as ItemDetailRes;
        if (!resp.ok || !payload || !payload.itemId) {
          throw new Error(data?.message || data?.resMessage || `상세 조회 실패 (HTTP ${resp.status})`);
        }
        if (alive) setItem(payload);
      } catch (e: any) {
        if (alive) setErr(e?.message || '상품을 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const price = Number(item?.itemPrice || 0);
  const total = useMemo(() => price * Math.max(1, Number(qty || 1)), [price, qty]);

  // ✅ 품절 여부(응답에 오는 다양한 키를 안전하게 검사)
  // - 문자열 상태: itemSellStatus / sellStatus 가 'SOLD_OUT'
  // - 수량/재고: itemStock / stock / quantity 가 0 이하
  const soldOut = useMemo(() => {
    const s =
      String((item as any)?.itemSellStatus ?? (item as any)?.sellStatus ?? '')
        .trim()
        .toUpperCase();
    if (s === 'SOLD_OUT') return true;
    const stockRaw =
      (item as any)?.itemStock ??
      (item as any)?.stock ??
      (item as any)?.quantity;
    const stock = Number(stockRaw);
    if (!Number.isNaN(stock)) return stock <= 0;
    return false;
  }, [item]);

  const onDec = () => setQty((q) => Math.max(1, Number(q || 1) - 1));
  const onInc = () => setQty((q) => Math.max(1, Number(q || 1) + 1));
  const onChangeQty: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const v = e.target.value.replace(/[^\d]/g, '');
    setQty(Math.max(1, v === '' ? 1 : Number(v)));
  };

  /** 삭제 요청 */
  async function onDelete() {
    try {
      // 권한/토큰 확인
      const token = getAccessToken();
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }
      if (!isAdmin) {
        alert('관리자만 삭제할 수 있습니다.');
        return;
      }
      if (!confirm('정말 이 상품을 삭제할까요?')) return;

      const resp = await fetch(`${API_BASE}/item/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: ({
          ...authHeaders(),
          Accept: 'application/json',
        } as HeadersInit),
      });

      // 응답 파싱(문자/JSON 모두 대응)
      const raw = await resp.clone().text();
      let body: any = {};
      try { body = JSON.parse(raw); } catch { body = { message: raw }; }

      if (!resp.ok) {
        throw new Error(body?.message || body?.resMessage || `삭제 실패 (HTTP ${resp.status})`);
      }

      alert('상품이 삭제되었습니다.');
      router.replace('/items');
    } catch (e: any) {
      alert(e?.message || '상품 삭제 중 문제가 발생했습니다.');
    }
  }

  if (loading)
    return (
      <main className="apn-detail px-4 py-8 text-center">
        로딩중…
      </main>
    );
  if (err || !item)
    return (
      <main className="apn-detail px-4 py-8 text-center">
        {err || '상품을 찾을 수 없습니다.'}
      </main>
    );

  const thumb = toAbs(item.thumbnailUrl, IMG_BASE);
  const detailImages = (item.imageUrls || []).map((u) => toAbs(u, IMG_BASE));

  return (
    <main className="apn-detail px-4 py-8">
      {/* 상단: 관리자만 보이는 [수정][삭제] - 오른쪽 정렬 */}
      <div className="top-actions">
        {isAdmin && (
          <>
            <Link href={`/items/${item.itemId}/edit`} className="btn-3d btn-white px-3 py-1 rounded border" prefetch={false}>
              수정
            </Link>
            <button
              type="button"
              className="btn-3d btn-white px-3 py-1 rounded border"
              onClick={onDelete}
            >
              삭제
            </button>
          </>
        )}
      </div>

      {/* 썸네일 + 정보 — 고정 너비 2열을 화면 가운데 배치 */}
      <section className="detail-top">
        {/* 왼쪽: 썸네일 고정 박스(정사각, 픽셀 고정) */}
        <div className="thumb-box">
          {thumb ? <img src={thumb} alt={item.itemName} /> : <div className="noimg">No Image</div>}
        </div>

        {/* 오른쪽: 정보 그리드(라벨 폭 고정) */}
        <div className="info-block">

          {/* ◀ 값만 왼쪽 컬럼에(라벨 자리) — 카테고리 */}
          <div className="info-row only-left">
            <span className="left-value cat-value">{displayCategory(item.itemCategory)}</span>
            <span aria-hidden="true"></span>
          </div>

          {/* ◀ 값만 왼쪽 컬럼에(라벨 자리) — 상품이름 */}
          <div className="info-row only-left name-row mt-[20px]">
            <span className="left-value name-value">{item.itemName}</span>
            <span aria-hidden="true"></span>
          </div>

          {/* 상품가격 (값은 오른쪽 컬럼의 오른쪽 끝) */}
          <div className="info-row mt-[20px]">
            <span className="info-label">가격</span>
            <span className="info-value value-right">{formatPriceKRW(item.itemPrice)}</span>
          </div>

          {/* 수량 스테퍼 (오른쪽 컬럼의 오른쪽 끝) */}
          <div className="info-row mt-[15px]">
            <span className="info-label">수량</span>
            <div className="stepper">
              <button type="button" className="btn-3d btn-white" onClick={onDec}>-</button>
              <input className="qty-input" value={qty} onChange={onChangeQty} inputMode="numeric" />
              <button type="button" className="btn-3d btn-white" onClick={onInc}>+</button>
            </div>
          </div>

          {/* 선택된수량 · 총가격 — 한 줄(4컬럼: 라벨/값/라벨/값) */}
          <div className="pair-row-4  mt-[15px]">
            <span className="info-label">구매수량</span>
            <span className="info-value value-left">{qty}</span>
            <span className="info-label">구매가격</span>
            <span className="info-value value-right">{formatPriceKRW(total)}</span>
          </div>

          {/* 행동 버튼들 (크기: --cta-w, --cta-h 로 조절) */}
          <div className="action-row  mt-[25px] mb-[25px]">
            <button
              type="button"
              className="btn-3d btn-white btn-cta rounded border"
              onClick={async () => {
              if (!getAccessToken()) { alert('로그인 후 이용이 가능합니다'); return; }
              if (soldOut) { alert('품절된 상품입니다'); return; }

              const m = location.pathname.match(/\/items\/(\d+)/);
              const parsedId = m ? Number(m[1]) : 0;
              const q = Math.max(1, Number(qty || 1));
              if (parsedId <= 0) { alert('상품 정보를 확인할 수 없습니다.'); return; }

              try {
                
                await addMut.mutateAsync({ itemId: Number(id), quantity: Math.max(1, Number(qty || 1)) });
                
              
              } catch (e: any) {
               
                const msg = e?.response?.data?.message || e?.message || '장바구니 담기 중 오류가 발생했습니다.';
                if (String(msg).includes('재고') || e?.response?.status === 409) {
                  alert('재고 수량을 초과하여 담을 수 없습니다.');
                } else {
                  alert(msg);
                }
              }
            }}


              disabled={addMut.isPending}
            >
              장바구니
            </button>
            <button
              type="button"
              className="btn-3d btn-white btn-cta rounded border"
             onClick={async () => {

                if (!getAccessToken()) {
                  alert('로그인 후 이용이 가능합니다');
                  return;
                }
                
                if (soldOut) {
                  alert('품절된 상품입니다');
                  return;
                }


                const m = location.pathname.match(/\/items\/(\d+)/);
                const parsedId = m ? Number(m[1]) : 0;
                const q = Math.max(1, Number(qty || 1));

                if (parsedId <= 0) {
                  alert('상품 정보를 확인할 수 없습니다.');
                  return;
                }

                try {
                  // 재고 부족 시 여기서 에러로 떨어져서 아래로 이동하지 않음
                  await cartApi.add({ itemId: parsedId, quantity: q });
                  location.href = `/order/checkout?itemId=${parsedId}&qty=${q}`;
                } catch (err) {
                 
                }
              }}

            >
              주문하기
            </button>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* 상세 이미지: 세로 1열(픽셀 고정 크기, 화면비율 무시) */}
      <section className="detail-images">
        {detailImages.map((u, i) => (
          <div key={i} className="detail-img mt-[30px] mb-[40px]">
            <img src={u} alt={`상품상세이미지 ${i + 1}`} />
          </div>
        ))}
      </section>

      {/* 상세 텍스트는 이미지들 밑에 */}
      {item.itemDetail && (
        <section className="detail-text mb-[50px]">
          {item.itemDetail}
        </section>
      )}

      <div className="divider mb-[20px]" />

      {/* 리뷰 영역 */}
      <ReviewSection itemId={Number(id)} />

      <hr className="faq-sep" />

      {/* 고정 안내문구 */}
      <p className="text-[13px] text-gray-600 mt-3">
        ※ 상품 리뷰는 구매자 본인 작성 원칙이며, 운영정책에 따라 수정/삭제될 수 있습니다.
      </p>

      {/* 고정 안내문 (모든 상세페이지) */}
      <section className="policy mt-[30px] mb-[30px]">
        <p>· 상품의 색상은 모니터 사양에 따라 실제 색상과 다소 차이가 있을 수 있습니다.</p>
        <p>· 인화류 및 출력물 상품의 경우 상품 공정 및 공정 시기에 따라 색상 차이가 발생할 수 있습니다.</p>
        <p>· 아웃박스는 본 상품을 보호하기 위한 보호제로, 유통과정에서 생길 수 있는 오염이나 훼손으로 인한 교환 및 환불은 되지 않습니다.</p>

        <h3 className="policy-title">교환/반품 안내</h3>
        <p className="policy-sub">교환/반품 방법</p>
        <p>· Help &gt; QNA &gt; 문의하기 &gt; 교환/반품 카테고리 선택 후 문의하기 등록하시면 신청할 수 있습니다.</p>
        <p>· 상세한 교환/반품 규정은 고객센터 FAQ에서 확인할 수 있습니다.</p>
        <p className="policy-sub">교환/반품 가능 기간</p>
        <p>· 구매자는 상품 수령 후 7일 이내에 교환 및 반품 신청이 가능합니다. (단, 단순변심의 경우 교환은 불가하며, 반품만 가능합니다.)</p>
        <p>· 상품이 표시·광고 내용과 다르거나 하자 등 계약 내용과 다르게 이행된 경우에는 상품 수령 후 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내에 QNA [문의하기]를 통해 청약 철회가 가능합니다.</p>
        <p>· 교환/반품 비용</p>
        <p>· 구매자의 단순 변심으로 교환/반품할 경우에는 구매자가 배송비를 부담합니다.</p>
        <p>· 상품 하자나 제품 불일치, 배송 문제로 교환/반품할 경우에는 판매자가 배송비를 부담합니다.</p>
        <p className="policy-sub">교환/반품 시 유의사항</p>
        <p>· 아래와 같은 경우 교환/반품이 제한될 수 있습니다.</p>
        <p>· 구매자에게 책임이 있는 사유로 상품이 멸실 또는 훼손된 경우(단, 내용 확인을 위한 포장 개봉의 경우는 예외)</p>
        <p>· 구매자의 전부 또는 일부의 사용, 소비에 의해 상품의 가치가 현저히 감소한 경우</p>
        <p>· 시간의 경과에 의하여 재판매가 곤란할 정도로 상품의 가치가 현저히 감소한경우</p>
        <p>· 주문/제작 상품의 제작이 이미 진행된 경우(판매자에게 회복 불가능한 손해가 예상되고, 그러한 예정으로 청약철회권 행사가 불가하다는 사실을 서면 동의받은 경우)</p>
        <p>· 상품의 일부 구성품을 사용하였거나, 분실하였거나 취급 부주의로 인한 파손/고장/오염으로 재판매 불가한 경우, 일부 구성품이 동봉되지 않은 채 반송된 경우</p>
        <p>· 각 상품별로 아래와 같은 사유로 반품/교환이 제한될 수 있습니다.</p>
        <p>· [음식] 개봉하거나 포장이 훼손 된 경우</p>
        <p>· [의류/가방/신발/ 패션잡화] 세탁, 상품 얼룩, 향수 냄새, 탈취제 냄새, 사용 흔적 등으로 상품의 가치가 현저히 감소한 경우</p>
        <p>· [도서/영상출판] 복제 가능한 상품의 포장이 개봉된 경우</p>
        <p>· 일부 구성품을 사용하였거나, 분실하였거나 취급 부주의로 인한 파손/고장/오염으로 재판매 불가한 경우</p>
        <p>· 일부 구성품이 동봉되지 않은 채 반송된 경우</p>
        <p>· 교환은 불량일 경우에만 동일한 상품 및 동일한 옵션에 한하여 가능합니다. 이 외에 경우에는 반품 후 재구매 절차를 진행하셔야 합니다.</p>
        <p>· 교환신청을 하더라도 판매자에게 교환할 물품의 재고가 없는 경우에는 교환이 불가능하며, 이 경우에 해당 상품의 주문을 취소 처리 후, 결제 시 선택했던 결제 수단으로 환불 처리됩니다</p>
        <p className="policy-sub">소비자 피해 보상 및 환불지연에 따른 배상</p>
        <p>· 상품의 불량에 의한 교환, 반품, A/S, 환불, 품질보증 및 피해보상 등에 관한 사항은 소비자분쟁해결기준(공정거래위원회 고시)에 준하여 처리됩니다.</p>
        <p>· 대금 환불 및 환불 지연에 따른 배상금 지급 조건, 절차 등은 전자상거래 등에서의 소비자 보호에 관한 법률에 따라 처리합니다.</p>
        <p className="policy-sub">기타</p>
        <p>· 일부 규정은 국내 구매자에게만 적용되며, 해외 구매자를 위한 상세 안내는 고객센터 FAQ 혹은 QNA [문의하기]를 통해 확인해 주시기 바랍니다.</p>
        <p>· 유의사항: 해당 상품은 판매자가 속한 국가의 거주자에게 판매됩니다. 해당 상품에 대해서는 판매자가 속한 국가의 청약철회, 환불, 결제 관련 정책이 적용됩니다.</p>
      </section>

      <div className="divider " />

      {/* '목록으로' 버튼 (가운데 정렬, /items로 이동) */}
      <div className="back-row ">
        <Link href="/items" prefetch={false} className="btn-3d btn-white px-4 py-2 rounded border mt-[30px] mb-[50px]">
          목록으로
        </Link>
      </div>

      <style jsx>{`
        /* =========================
           픽셀 고정/최대값 + 버튼/폰트 변수
           ========================= */
        .apn-detail {
          /* 본문 가운데 정렬 */
          max-width: calc(var(--thumb-w) + var(--info-w) + 72px);
          margin: 0 auto;

          /* 크기 변수 */
          --thumb-w: 260px;      /* 썸네일 가로 */
          --thumb-h: 340px;      /* 썸네일 세로 */
          --info-w: 520px;       /* 오른쪽 정보 영역 너비(px) */
          --detail-w: 640px;     /* 상세이미지 최대 가로(px) */
          --detail-h: 640px;     /* 상세이미지 최대 세로(px) */
          --label-w: 120px;      /* 라벨 칸 고정폭(px) */

          /* CTA 버튼 크기(원하면 숫자만 변경) */
          --cta-w: 260px;
          --cta-h: 40px;

          /* ▶ 카테고리/상품이름 폰트 크기 조절 위치 */
          --cat-font: 16px;
          --name-font: 28px;
        }

        /* 공통 버튼(흰색) */
        .btn-3d { box-shadow: 0 2px 0 rgba(0,0,0,0.08); }
        .btn-white { background: #fff; color: #111827; }
        .btn-3d:active { transform: translateY(1px); box-shadow: 0 1px 0 rgba(0,0,0,0.08); }

        .top-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 8px; }
        .divider { border-top: 1px solid #e5e7eb; margin: 12px 0; }

        /* 고정 2열 레이아웃을 화면 가운데 배치 */
        .detail-top {
          display: grid;
          grid-template-columns: var(--thumb-w) var(--info-w);
          justify-content: center;
          align-items: start;
          column-gap: 24px;
        }

        /* 썸네일 — 정사각 고정 */
        .thumb-box {
          width: var(--thumb-w);
          height: var(--thumb-h);
          border: 1px solid #e5e7eb; border-radius: 8px;
          overflow: hidden; background: #fafafa;
        }
        .thumb-box img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .thumb-box .noimg {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: #9ca3af; font-size: 13px;
        }

        /* 오른쪽 정보 블록(라벨 폭 고정 2컬럼) */
        .info-block { display: flex; flex-direction: column; gap: 10px; align-items: stretch; width: 100%; }
        .info-row {
          display: grid;
          grid-template-columns: var(--label-w) 1fr; /* 라벨칸 고정폭 */
          align-items: center;
          justify-items: start;
          gap: 8px;
          width: 100%;
        }

        /* 카테고리/상품이름: 값만 왼쪽 컬럼(라벨 자리)에 배치 */
        .only-left .left-value { grid-column: 1 / 2; justify-self: start; text-align: left; }
        .only-left > span:last-child { grid-column: 2 / 3; } /* 빈 자리 유지 */

        .info-label { color: #4b5563; }
        .info-value { color: #111827; }
        .cat-value  { font-size: var(--cat-font); }
        .name-value { font-size: var(--name-font); }

        /* 값 정렬 도우미 */
        .value-left  { justify-self: start; text-align: left; }
        .value-right { justify-self: end;   text-align: right; }

        /* 수량 스테퍼(오른쪽 컬럼의 오른쪽 끝) */
        .stepper { display: inline-flex; align-items: center; gap: 8px; }
        .info-row .stepper { justify-self: end; }
        .qty-input {
          width: 70px; height: 32px;
          border: 1px solid #e5e7eb; border-radius: 6px;
          text-align: center; outline: none;
        }

        /* 선택된수량 · 총가격 — 한 줄(4컬럼: 라벨/값/라벨/값) */
        .pair-row-4 {
          display: grid;
          grid-template-columns: var(--label-w) 1fr var(--label-w) 1fr;
          align-items: center;
          width: 100%;
          gap: 8px;
        }

        /* CTA 버튼 (크기 변수로 조절) */
        .action-row { display: flex; justify-content: center; gap: 8px; }
        .btn-cta {
          min-width: var(--cta-w);
          height: var(--cta-h);
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }

        /* 상세이미지 — 픽셀 고정(최대값) */
        .detail-images { display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .detail-img {
          width: var(--detail-w);
          height: var(--detail-h);
          border: 1px solid #e5e7eb; border-radius: 8px;
          overflow: hidden; background: #fafafa;
        }
        .detail-img img {
          width: 100%; height: 100%;
          object-fit: cover; display: block;
        }

        /* 상세 텍스트 */
        .detail-text { margin-top: 12px; white-space: pre-wrap; line-height: 1.7; text-align: center; }

        /* 정책 문구 */
        .policy       { font-size: 13px; color: #374151; }
        .policy-title { margin-top: 12px; font-weight: 700; }
        .policy-sub   { margin-top: 10px; font-weight: 600; }

        /* '목록으로' 버튼 가운데 정렬 */
        .back-row {
          display: flex;
          justify-content: center;
          margin: 12px 0 0;
        }

        /* 상품이름 행은 두 컬럼 전체 사용 → 짧은 이름 1줄 유지 */
        .name-row .left-value { grid-column: 1 / 3; }
        /* 함께 넣어둔 자리 채움 span은 숨김 (불필요한 줄바꿈 방지) */
        .name-row > span:last-child { display: none; }
      `}</style>
    </main>
  );
}
