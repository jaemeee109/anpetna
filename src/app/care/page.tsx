'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';

/** ▷ API 베이스 추론(NEXT_PUBLIC_API_BASE[_URL] 우선) */
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

type NearbyVenue = {
  venueId: number;
  venueName: string;
  address: string;
  phone?: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
};
type NearbyRes = { items: NearbyVenue[] };

/** ▷ 네이버 지도 키 (환경변수 필요) */
const NAVER_ID = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

/** ▷ 초기 중심(서울 시청 근처) */
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

/** ▷ window.naver 안전 접근 */
function getNaver(): any | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).naver;
}

/** 글로벌 콜백: 스크립트의 callback=__initNaverMap 에서 호출 */
declare global {
  interface Window { __initNaverMap?: () => void }
}

export default function CarePage() {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);

  // 주소 입력/자동완성 상태
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [typing, setTyping] = useState(false);

  const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [venues, setVenues] = useState<NearbyVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [err,   setErr] = useState<string | null>(null);

  /** 지도 초기화 */
  function initMap() {
    const nv = getNaver();
    if (!mapEl.current || !nv?.maps) return;

    console.debug('[Care] initMap called');
    const nmap = new nv.maps.Map(mapEl.current, {
      center: new nv.maps.LatLng(center.lat, center.lng),
      zoom: 13,
    });
    mapRef.current = nmap;

    // 초기 진입: 전체 매장 거리순 조회
    void fetchVenues(center.lat, center.lng, true);
  }

  // 콜백 등록
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).__initNaverMap = initMap;
    return () => { (window as any).__initNaverMap = undefined; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  /** 마커 제거 */
  function clearMarkers() {
    const nv = getNaver();
    if (!nv?.maps) return;
    markersRef.current.forEach((m) => m?.setMap(null));
    markersRef.current = [];
  }

  /** 지도 갱신 + 마커 */
  function refreshMap(lat: number, lng: number, vs: NearbyVenue[]) {
    const nv = getNaver();
    const nmap = mapRef.current;
    if (!nmap || !nv?.maps) return;

    const { LatLng, Marker, LatLngBounds } = nv.maps;

    nmap.setCenter(new LatLng(lat, lng));

    clearMarkers();
    const bounds = new LatLngBounds();
    const userPos = new LatLng(lat, lng);
    bounds.extend(userPos);

    vs.forEach((v) => {
      const la = Number(v.latitude), lo = Number(v.longitude);
      if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
      const m = new Marker({
        map: nmap,
        position: new LatLng(la, lo),
        title: `${v.venueName}\n${v.address}`,
      });
      markersRef.current.push(m);
      bounds.extend(m.getPosition());
    });

    if (vs.length > 0) nmap.fitBounds(bounds);
  }

  /** 매장 목록 호출 */
  async function fetchVenues(lat: number, lng: number, all: boolean) {
    setLoading(true);
    setErr(null);
    try {
      const base = resolveApiBase();
      const path = all ? '/venue/nearby-all' : '/venue/nearby';
      const url = new URL(path, base);
      const qp: Record<string, string> = { lat: String(lat), lng: String(lng) };
      if (!all) { qp.radiusKm = String(999999); qp.limit = String(10000); }
      url.search = new URLSearchParams(qp).toString();

      const r = await fetch(url.toString(), { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as NearbyRes;
      const list = Array.isArray((j as any).items) ? (j.items as NearbyVenue[]) : [];

      // 혹시 모를 서버 정렬 이상 대비
      list.sort((a, b) => (Number(a.distanceKm) || 0) - (Number(b.distanceKm) || 0));
      setVenues(list);
      refreshMap(lat, lng, list);
    } catch (e: any) {
      setErr(e?.message || '매장 목록을 불러오지 못했습니다.');
      setVenues([]);
      clearMarkers();
    } finally {
      setLoading(false);
    }
  }


/** JS SDK 지오코딩 (폴백용) — coordinate 옵션 제거 */
async function geocodeBySDK(q: string) {
  const nv = getNaver();
  if (!nv?.maps?.Service?.geocode) return [];

  // ❌ coordinate 제거 (버전별 타입 미스매치 회피)
  const opts: any = { query: q };

  // ✅ 콜백 인자 순서: (status, response)
  return await new Promise<{ label: string; lat: number; lng: number }[]>((resolve) => {
    nv.maps.Service.geocode(opts, (status: any, res: any) => {
      if (status !== nv.maps.Service.Status.OK || !Array.isArray(res?.v2?.addresses)) {
        resolve([]);
        return;
      }
      const items = res.v2.addresses
        .map((a: any) => {
          const label =
            a.roadAddress || a.jibunAddress || a.englishAddress || a.address || '';
          const lat = Number(a.y);
          const lng = Number(a.x);
          return label && Number.isFinite(lat) && Number.isFinite(lng)
            ? { label, lat, lng }
            : null;
        })
        .filter(Boolean);
      resolve(items as any);
    });
  });
}


  /** 자동완성: 백엔드 프록시 + 실패 시 SDK 폴백 */
  useEffect(() => {
    let timer: any;
    if (!query.trim()) {
      setSuggestions([]); setOpenSug(false);
      return;
    }

    async function run() {
      setTyping(true);
      try {
        const base = resolveApiBase();
        const url = new URL('/maps/geocode', base);
        url.search = new URLSearchParams({
          q: query.trim(),
          lat: String(center.lat),
          lng: String(center.lng),
        }).toString();

        // 1차: 백엔드 프록시
        const r = await fetch(url.toString(), { credentials: 'include' });
        const ok = r.ok;
        const j = ok ? await r.json() : { items: [] };
        let items: { label: string; lat: number; lng: number }[] = j?.items ?? [];

        // 2차: 실패/빈 결과 → SDK
        if (!ok || items.length === 0) {
        items = await geocodeBySDK(query.trim());

        }

        setSuggestions(items);
        setOpenSug(items.length > 0);
      } catch (e) {
        console.warn('[Care] geocode auto error', e);
        setSuggestions([]); setOpenSug(false);
      } finally {
        setTyping(false);
      }
    }

    timer = setTimeout(run, 250);
    return () => clearTimeout(timer);
  }, [query, center.lat, center.lng]);

  /** 제안 선택 → 지도 이동 + 전체 매장 거리순 */
  async function handlePickSuggestion(s: { label: string; lat: number; lng: number }) {
    setQuery(s.label);
    setOpenSug(false);
    setCenter({ lat: s.lat, lng: s.lng });
    await fetchVenues(s.lat, s.lng, true);
  }

  /** 주소 검색(엔터/버튼) */
  async function handleSearchAddress(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    try {
      const base = resolveApiBase();
      const url = new URL('/maps/geocode', base);
      url.search = new URLSearchParams({
        q: query.trim(),
        lat: String(center.lat),
        lng: String(center.lng),
      }).toString();

      // 1차: 백엔드
      const r = await fetch(url.toString(), { credentials: 'include' });
      const ok = r.ok;
      const j = ok ? await r.json() : { items: [] };
      let items: { label: string; lat: number; lng: number }[] = j?.items ?? [];

      // 2차: SDK
      if (!ok || items.length === 0) {
    items = await geocodeBySDK(query.trim());

      }

      const best = items[0];
      if (!best) { alert('주소를 찾지 못했습니다. 다른 키워드로 시도해 보세요.'); return; }

      setCenter({ lat: best.lat, lng: best.lng });
      await fetchVenues(best.lat, best.lng, true);
    } catch {
      alert('주소 검색 중 오류가 발생했습니다.');
    }
  }

  /** 내 위치 탐색 */
  async function handleLocateMe() {
    if (!('geolocation' in navigator)) { alert('이 브라우저는 위치 정보를 지원하지 않습니다.'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCenter({ lat, lng });
        await fetchVenues(lat, lng, true);
      },
      (e) => { alert('위치 권한이 거부되었거나 실패했습니다.'); console.warn(e); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  const rows = useMemo(() => venues || [], [venues]);

  return (
    <main className="care-wrap">
      <h1 className="sr-only">Care</h1>

      {/* 지도 */}
      {NAVER_ID ? (
        <>
          {/* 1차 로더: oapi + ncpClientId */}
          <Script
            id="naver-maps-1"
            src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
              NAVER_ID!
            )}&submodules=geocoder&callback=__initNaverMap`}
            strategy="afterInteractive"
            onReady={() => {
              // 콜백이 누락될 경우 대비해 수동 호출
              try { (window as any).__initNaverMap?.(); } catch {}
              // 1.5초 후에도 naver 객체가 없으면 보조 로더 주입
              setTimeout(() => {
                if (!(window as any).naver?.maps) {
                  console.warn('[Care] primary loader failed, injecting fallback loader');
                  const s = document.createElement('script');
                  s.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
                    NAVER_ID!
                  )}&submodules=geocoder&callback=__initNaverMap`;
                  s.async = true;
                  document.head.appendChild(s);
                }
              }, 1500);
            }}
          />
          <div ref={mapEl} className="care-map" aria-label="케어 매장 지도" />
        </>
      ) : (
        <div className="care-map care-map-empty">
          지도 API 키(NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID)를 설정해주세요.
        </div>
      )}

      {/* 검색바 */}
      <form className="care-searchbar" onSubmit={handleSearchAddress}>
        <div className="auto-wrap">
          <input
            className="care-input"
            placeholder="도로명/지번/읍·면·동을 입력하세요"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpenSug(true); }}
            onFocus={() => { if (suggestions.length > 0) setOpenSug(true); }}
            onBlur={() => setTimeout(() => setOpenSug(false), 120)}
          />
          {openSug && (
            <ul className="auto-list" role="listbox">
              {typing && <li className="auto-item muted">검색 중…</li>}
              {!typing && suggestions.length === 0 && (
                <li className="auto-item muted">검색 결과 없음</li>
              )}
              {!typing && suggestions.map((s, idx) => (
                <li
                  key={`${s.label}-${idx}`}
                  className="auto-item"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePickSuggestion(s)}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" className="btn">위치 탐색</button>
        <button type="button" onClick={handleLocateMe} className="btn">내위치 탐색</button>
      </form>

      {/* 구분선 */}
      <div className="care-sep" />

      {/* 리스트 */}
      <section aria-label="매장 리스트" className="care-list">
        {loading && <div className="care-msg">불러오는 중…</div>}
        {err && <div className="care-err">오류: {err}</div>}
        {!loading && !err && rows.length === 0 && (
          <div className="care-msg">주변 매장이 없습니다.</div>
        )}

        <ul className="care-ul">
          {rows.map((v, i) => {
            const id = v.venueId ?? i;
            return (
              <li key={id} className="care-li">
                <div className="care-name">{v.venueName}</div>
                <div className="care-addr">{v.address}</div>
                <div className="care-actions">
                  <Link href="#" prefetch={false} className="btn">예약</Link>
                  {typeof v.distanceKm === 'number' && (
                    <span className="care-dist">{v.distanceKm.toFixed(2)} km</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 페이지 한정 스타일 */}
      <style jsx>{`
        .care-wrap { max-width: 800px; margin: 0 auto; padding: 16px; }
        .care-map { width: 100%; height: 420px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .care-map-empty { display:flex; align-items:center; justify-content:center; color:#6b7280; background:#f9fafb; }
        .care-searchbar { margin-top: 12px; display:flex; gap:8px; align-items:flex-start; }
        .auto-wrap { position: relative; flex:1; }
        .care-input { width:100%; height:40px; padding:0 12px; border:1px solid #e5e7eb; border-radius:10px; outline:none; text-align:center; }
        .care-input::placeholder { text-align:center; }
        .care-input:not(:placeholder-shown) { text-align:left; }
        .auto-list { position:absolute; top:44px; left:0; right:0; background:#fff; border:1px solid #e5e7eb; border-radius:8px;
          box-shadow:0 4px 14px rgba(0,0,0,0.06); max-height:260px; overflow:auto; z-index:20; padding:6px 0; margin:0; list-style:none; }
        .auto-item { padding:8px 12px; cursor:pointer; text-align:left; }
        .auto-item:hover { background:#f9fafb; }
        .auto-item.muted { color:#6b7280; cursor:default; }
        .care-sep { border-top:1px solid #e5e7eb; margin:16px 0; }
        .care-list { margin-top:8px; }
        .care-ul { list-style:none; padding:0; margin:0; }
        .care-li { padding:10px 4px; border-bottom:1px solid #f3f4f6; text-align:left; }
        .care-name { font-weight:700; }
        .care-addr { color:#6b7280; margin-top:2px; }
        .care-actions { margin-top:6px; display:flex; gap:8px; align-items:center; }
        .care-dist { color:#6b7280; font-size:12px; }
      `}</style>
    </main>
  );
}
