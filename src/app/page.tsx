//src/app/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import './home.css';
import Heading from '@/components/icons/Heading';
import HeartIcon from '@/components/icons/HeartIcon';

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

type ApiRes<T> = { result?: T };
type HomeBanner = { id?: number; imageUrl?: string; linkUrl?: string; sortOrder?: number };
type PopularItem = { itemId?: number; itemName?: string; itemPrice?: number; thumbnailUrl?: string };
type BoardRow = { bno?: number; bTitle?: string; bWriter?: string; createDate?: string };

async function unwrap<T>(r: Response): Promise<T> {
  const j = (await r.json()) as ApiRes<T> | T;
  // @ts-ignore
  return (j && (j as any).result !== undefined ? (j as any).result : j) as T;
}
async function openGet<T>(path: string): Promise<T> {
  const base = resolveApiBase();
  const u = `${base}${path}`;
  try {
    const r = await fetch(u, { method: 'GET' });
    return await unwrap<T>(r);
  } catch {
    const r2 = await fetch(u, { method: 'GET', credentials: 'include' });
    return await unwrap<T>(r2);
  }
}
function ymd(d?: string) {
  if (!d) return '-';
  const t = new Date(d);
  if (isNaN(t.getTime())) return '-';
  return `${t.getFullYear()}.${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')}`;
}

export default function HomePage() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [notice, setNotice] = useState<BoardRow[]>([]);
  const [free, setFree] = useState<BoardRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [bn, pi, no, fr] = await Promise.all([
          openGet<HomeBanner[]>('/home/Banner'),
          openGet<PopularItem[]>('/home/itemRanking'),
          openGet<BoardRow[]>('/home/noticeBoard'),
          openGet<BoardRow[]>('/home/freeBoard'),
        ]);
        setBanners(Array.isArray(bn) ? bn : []);
        setPopular(Array.isArray(pi) ? pi.slice(0, 10) : []); // 최대 10개
        setNotice(Array.isArray(no) ? no.slice(0, 5) : []);
        setFree(Array.isArray(fr) ? fr.slice(0, 5) : []);
      } catch (e: any) {
        setErr(e?.message || '메인 데이터 로드 실패');
      }
    })();
  }, []);

  // 자동재생 타이머
  useEffect(() => {
    if (!banners.length) return;
    const interval = setInterval(() => {
      setBannerIndex((i) => (i + 1) % banners.length);
    }, parseInt(getComputedStyle(document.documentElement).getPropertyValue('--home-banner-interval')) || 4000);
    return () => clearInterval(interval);
  }, [banners]);

  return (
    <main className="apn-home">
      {/* ===== 배너 슬라이드 ===== */}
      <section className="home-banner" aria-label="메인 배너">
        {banners.map((b, i) => (
          <div key={b.id || i} className={`home-banner-slide ${i === bannerIndex ? 'active' : ''}`}>
            {b.imageUrl ? (
              b.linkUrl ? (
                <a href={b.linkUrl} rel="noopener noreferrer">
                  <img src={toAbs(b.imageUrl)} alt="메인 배너" />
                </a>
              ) : (
                <img src={toAbs(b.imageUrl)} alt="메인 배너" />
              )
            ) : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#9aa1a8'}}>배너 없음</div>
            )}
          </div>
        ))}
        <div className="home-banner-dots">
          {banners.map((_, i) => (
            <div key={i} className={`home-banner-dot ${i === bannerIndex ? 'active' : ''}`} onClick={() => setBannerIndex(i)} />
          ))}
        </div>
      </section>

      {/* ===== 인기상품 + 더보기 버튼 ===== */}
      <section className="home-popular" aria-label="인기상품">
        <div className="home-more">
          {/* (1)(2) 색상/정렬은 CSS에서 처리 */}
          <Link href="/items" prefetch={false}>Trending Now &raquo;</Link>
        </div>
        <div className="home-popular-grid">
          {(popular || []).slice(0, 5).map((it) => {
            const id = Number(it.itemId);
            return (
              <Link key={id} href={Number.isFinite(id) ? `/items/${id}` : '/items'} prefetch={false} className="home-item">
                <div className="home-item-thumb">
                  {it.thumbnailUrl ? (
                    <img src={toAbs(it.thumbnailUrl)} alt={it.itemName || '상품'} />
                  ) : (
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#9aa1a8'}}>이미지 없음</div>
                  )}
                </div>
                <div className="home-item-body">
                  <div className="home-item-name mt-[10px] mb-[7px]">{it.itemName || '상품'}</div>
                  {/* (3)(4) 색상/여백은 CSS에서 처리 */}
                  <div className="home-item-price mb-[5px] ">{typeof it.itemPrice === 'number' ? it.itemPrice.toLocaleString() : '-'}원</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===== 게시판 2열 ===== */}
      <section className="home-boards ">
        <div className="home-board">
          <div className="home-board-title">※ 공지사항 ※</div>
          <ul className="home-board-list">
            {(notice || []).map((r) => (
              <li key={r.bno} className="home-board-item">
                {/* (5) 제목 필드 보정: bTitle 우선, 없으면 title/subject 대체 */}
                <Link href={`/board/NOTICE/${r.bno}`} prefetch={false}>
                  {(r as any).bTitle ?? (r as any).btitle ?? (r as any).subject ?? '제목 없음'}
                 &nbsp;{Number((r as any).commentCount ?? 0) > 0 && (
                    <span style={{ fontSize: '0.9em', color: '#a1a1a1ff' }}>
                      ({Number((r as any).commentCount ?? 0)})
                    </span>
                  )}
                </Link>

                {/* <span className="home-board-date">{ymd(r.createDate)}</span>*/}
              </li>
            ))}
          </ul>
        </div>
        <div className="home-board">
          <div className="home-board-title">COMMUNITY&nbsp;&nbsp;<HeartIcon/></div>
          <ul className="home-board-list">
            {(free || []).map((r) => (
              <li key={r.bno} className="home-board-item">
                {/* (6) 제목 필드 보정 동일 적용 */}
                <Link href={`/board/NOTICE/${r.bno}`} prefetch={false}>
                {(r as any).bTitle ?? (r as any).btitle ?? (r as any).subject ?? '제목 없음'}
               &nbsp; {Number((r as any).commentCount ?? 0) > 0 && (
                  <span style={{ fontSize: '0.9em', color: '#a1a1a1ff' }}>
                    ({Number((r as any).commentCount ?? 0)})
                  </span>
                )}
</Link>

               {/*   <span className="home-board-date">{ymd(r.createDate)}</span>*/}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {err && <div style={{marginTop:16,color:'#b91c1c'}}>로드 오류: {err}</div>}
    </main>
  );
}
