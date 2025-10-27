'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';



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

/** ▷ 타입 정의: 백엔드가 내려주는 매장 데이터 */
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

/** ▷ 네이버 지도 브라우저 키(.env.local) */
const NAVER_ID = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

/** ▷ 초기 지도 중심(서울 시청 근처) */
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 };

/** ▷ window.naver 안전 접근 */
function getNaver(): any | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).naver;
}

/** ▷ 네이버 스크립트 콜백 전역 선언 */
declare global { interface Window { __initNaverMap?: () => void } }

export default function CarePage() {
  /** 지도 DOM/인스턴스/마커 */
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markersRef = useRef<any[]>([]);

  /** 검색/자동완성 상태 */
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [typing, setTyping] = useState(false);

  /** 지도 중심/매장/상태 */
  const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [venues, setVenues] = useState<NearbyVenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  /** 지도 초기화 */
  function initMap() {
    const nv = getNaver();
    if (!mapEl.current || !nv?.maps) return;

    const nmap = new nv.maps.Map(mapEl.current, {
      center: new nv.maps.LatLng(center.lat, center.lng),
      zoom: 13,
    });
    mapRef.current = nmap;

    // 초기 진입: 기준 좌표에서 전체 매장을 거리순으로
    void fetchVenues(center.lat, center.lng, true);
  }


  /** 마커 전체 제거 */
  function clearMarkers() {
    const nv = getNaver();
    if (!nv?.maps) return;
    markersRef.current.forEach((m) => m?.setMap(null));
    markersRef.current = [];
  }

  /** 지도 갱신 + 마커 그리기 */
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

  /** 매장 목록 조회 */
  async function fetchVenues(lat: number, lng: number, all: boolean) {
    setLoading(true);
    setErr(null);
    try {
      const base = resolveApiBase();
      const path = all ? 'venue/nearby-all' : 'venue/nearby';
      const url = new URL(path, base+'/');
      const qp: Record<string, string> = { lat: String(lat), lng: String(lng) };
      if (!all) { qp.radiusKm = String(999999); qp.limit = String(10000); }
      url.search = new URLSearchParams(qp).toString();

      const r = await fetch(url.toString(), { credentials: 'include' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as NearbyRes;
      const list = Array.isArray((j as any).items) ? (j.items as NearbyVenue[]) : [];

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

  /** JS SDK 지오코딩(백엔드 실패시 폴백) — coordinate 미사용 */
  async function geocodeBySDK(q: string) {
    const nv = getNaver();
    if (!nv?.maps?.Service?.geocode) return [];
    const opts: any = { query: q };

    return await new Promise<{ label: string; lat: number; lng: number }[]>((resolve) => {
      nv.maps.Service.geocode(opts, (status: any, res: any) => {
        if (status !== nv.maps.Service.Status.OK || !Array.isArray(res?.v2?.addresses)) {
          resolve([]);
          return;
        }
        const items = res.v2.addresses
          .map((a: any) => {
            const label = a.roadAddress || a.jibunAddress || a.englishAddress || a.address || '';
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

  /** 자동완성: 백엔드 → 폴백 SDK */
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
        const url = new URL('maps/geocode', base+'/');
        url.search = new URLSearchParams({
          q: query.trim(),
          lat: String(center.lat),
          lng: String(center.lng),
        }).toString();

        const r = await fetch(url.toString(), { credentials: 'include' });
        const ok = r.ok;
        const j = ok ? await r.json() : { items: [] };
        let items: { label: string; lat: number; lng: number }[] = j?.items ?? [];

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

  /** 자동완성 선택 */
  async function handlePickSuggestion(s: { label: string; lat: number; lng: number }) {
    setQuery(s.label);
    setOpenSug(false);
    setCenter({ lat: s.lat, lng: s.lng });
    await fetchVenues(s.lat, s.lng, true);
  }

  /** 주소 검색 */
  async function handleSearchAddress(e?: React.FormEvent) {
    e?.preventDefault();
    if (!query.trim()) return;

    try {
      const base = resolveApiBase();
      const url = new URL('maps/geocode', base+'/');
      url.search = new URLSearchParams({
        q: query.trim(),
        lat: String(center.lat),
        lng: String(center.lng),
      }).toString();

      const r = await fetch(url.toString(), { credentials: 'include' });
      const ok = r.ok;
      const j = ok ? await r.json() : { items: [] };
      let items: { label: string; lat: number; lng: number }[] = j?.items ?? [];

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

const router = useRouter();

/** 예약 페이지로 이동 */
const goReserve = (v: NearbyVenue) => {
  const id = Number(v?.venueId);
  if (!id || Number.isNaN(id)) {
    alert('예약 지점 정보가 없습니다.');
    return;
  }
  const name = v?.venueName ? encodeURIComponent(v.venueName) : '';
  router.push(`/care/reserve/${id}?name=${name}`);
};

// 지도 1회 초기화 가드
const initedRef = useRef(false);

function initMapOnce(retry = 0) {
  if (initedRef.current) return;

  const nv = getNaver();
  // 스크립트가 막 로드된 직후 maps 네임스페이스가 준비되기 전에 onReady가 호출될 수 있어
  // 몇 번만 재시도하여 초기화 보장
  if (!mapEl.current || !nv?.maps) {
    if (retry < 30) {
      setTimeout(() => initMapOnce(retry + 1), 100);
    }
    return;
  }

  // 원래 initMap 내용 그대로 이곳에서 실행
  const nmap = new nv.maps.Map(mapEl.current, {
    center: new nv.maps.LatLng(center.lat, center.lng),
    zoom: 13,
  });
  mapRef.current = nmap;

  initedRef.current = true;

  // 최초 진입 시 매장 목록/마커 로드
  void fetchVenues(center.lat, center.lng, true);
}








  return (
    <main className="care-wrap" data-theme="light">
      <h1 className="sr-only">Care</h1>

      {/* 지도 */}
      {NAVER_ID ? (
        <>
          <Script
          id="naver-maps"
          src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
            NAVER_ID!
          )}&submodules=geocoder`}
          strategy="afterInteractive"
          onReady={() => { try { initMapOnce(); } catch {} }}
        />
        <div ref={mapEl} className="care-map" aria-label="케어 매장 지도" />

        </>
      ) : (
        <div className="care-map care-map-empty">
          지도 API 키(NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID)를 설정해주세요.
        </div>
      )}

      {/* 지도 '하단 중앙' 검색바 */}
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
        <button type="submit" className="btn btn-primary">검색</button>
        <button type="button" onClick={handleLocateMe} className="btn btn-ghost">내위치찾기</button>
      </form>

      {/* 구분선 */}
      <div className="care-sep" role="separator" />

      {/* 매장 리스트 */}
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
                {/* 상단 왼쪽: 매장명 */}
                <div className="care-name">{v.venueName}</div>

              {/* 오른쪽: 중간 높이의 예약 버튼 */}
                <div className="care-actions">
                  <button
                    type="button"
                    className="btn btn-reserve"
                    onClick={() => goReserve(v)}
                  >
                    예약
                  </button>
                </div>



                {/* 하단 왼쪽: 주소 + 거리(오른쪽에 붙여 표기) */}
                <div className="care-addr">
                  {v.address}
                  {typeof v.distanceKm === 'number' && (
                    <span className="care-dist-inline"> · {v.distanceKm.toFixed(2)} km</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
         <p className="mb-[60px]"></p>
      </section>

      {/* ======================== 스타일 ======================== */}
      <style jsx>{`
        :root,
        .care-wrap[data-theme="light"] {
          --color-bg: #ffffff;
          --color-surface: #f9fafb;
          --color-border: #e5e7eb;
          --color-muted: #6b7280;
          --color-text: #111827;
          --color-primary: #ffffffff;
          --color-primary-contrast: #000000ff;
          --color-link: #2563eb;

          --radius-sm: 8px;
          --radius-md: 10px;
          --radius-lg: 16px;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
          --shadow-md: 0 4px 14px rgba(0,0,0,0.06);

          --font-size-sm: 12px;
          --font-size-md: 14px;
          --font-size-lg: 16px;
          --font-size-xl: 18px;
          --line-height: 1.5;

          --space-1: 4px;
          --space-2: 8px;
          --space-3: 12px;
          --space-4: 16px;
          --space-5: 20px;
          --space-6: 24px;

          --height-input: 40px;
          --height-button: 40px;
          --map-height: 420px;
          --container-max: 880px;
        }

        .care-wrap[data-theme="dark"] {
          --color-bg: #0b1020;
          --color-surface: #0f172a;
          --color-border: #1f2937;
          --color-muted: #9aa3b2;
          --color-text: #e5e7eb;
          --color-primary: #faf760ff;
          --color-primary-contrast: #0b1020;
          --color-link: #93c5fd;
          --shadow-sm: 0 1px 2px rgba(0,0,0,0.5);
          --shadow-md: 0 6px 24px rgba(0,0,0,0.5);
        }

        /* LAYOUT */
        .care-wrap {
          max-width: 750px;
          margin: 0 auto;
          padding: var(--space-4);
          background: var(--color-bg);
          color: var(--color-text);
          font-size: var(--font-size-lg);
          line-height: var(--line-height);
        }

        /* MAP */
        .care-map {
          width: 100%;
          height: var(--map-height);
          border: 1px solid var(--color-border);
          border-radius: 15px;
          background: var(--color-surface);
          box-shadow: 0 3px 3px rgba(199,196,196,0.5);
        }
        .care-map.care-map-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-muted);
        }

        /* 지도 하단 중앙 검색바 — (3) 겹침 방지 */
        .care-searchbar {
          margin: 20px auto 0;
          width: 500px;
          display: flex;
          gap: 35px;                
          justify-content: center;
          align-items: center;
          flex-wrap: nowrap;                   /* 버튼 줄바꿈 방지 */
        }
        .care-searchbar .auto-wrap { flex: 1 1 auto; width: 300px; } 
        .care-searchbar .btn { flex: 0 0 auto; white-space: nowrap; width: 100px }   
        .auto-wrap { position: relative; }
        .care-input {
          width: 100%;
          height: var(--height-input);
          padding: 0 var(--space-3);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-bg);
          color: var(--color-text);
          outline: none;
          text-align: center;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .care-input::placeholder { text-align: center; color: var(--color-muted); }
        .care-input:not(:placeholder-shown) { text-align: left; }
        .care-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary), transparent 80%);
        }

        /* 자동완성 */
        .auto-list {
          position: absolute;
          top: calc(var(--height-input) + 4px);
          left: 0; right: 0;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          box-shadow: var(--shadow-md);
          max-height: 260px;
          overflow: auto;
          z-index: 20;
          padding: var(--space-2) 0;
          margin: 0;
          list-style: none;
        }
        .auto-item { padding: var(--space-2) var(--space-3); cursor: pointer; text-align: left; transition: background 0.15s ease; }
        .auto-item:hover { background: var(--color-surface); }
        .auto-item.muted { color: var(--color-muted); cursor: default; }

        /* BUTTONS */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 96px;
          height: var(--height-button);
          padding: 0 var(--space-3);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: var(--font-size-md);
          cursor: pointer;
          transition: transform 0.02s ease, background 0.15s ease, border 0.15s ease, color 0.15s ease;
          user-select: none;
          text-decoration: none;
        }
        .btn:active { transform: translateY(1px); }

        .btn-primary { background: var(--color-primary); color: var(--color-primary-contrast); border-color: color-mix(in oklab, var(--color-primary), #000 6%); }
        .btn-primary:hover { filter: brightness(0.96); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-ghost { 
        background: transparent; 
        color: var(--color-text);
        margin-left:-25px; }
        .btn-ghost:hover { background: var(--color-surface); }

        /* 예약 버튼: 흰색 + 회색 테두리 + 3D */
        .btn-reserve {
          background: #ffffff;
          color: var(--color-text);
          border: 1px solid #cfd4dc;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.8),
            0 2px 0 rgba(0,0,0,0.06),
            0 6px 14px rgba(0,0,0,0.06);
        }
        .btn-reserve:hover { filter: brightness(0.98); }
        .btn-reserve:active {
          transform: translateY(1px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 1px 0 rgba(0,0,0,0.06),
            0 4px 10px rgba(0,0,0,0.06);
        }

        /* DIVIDER */
        .care-sep { border-top: 1px solid var(--color-border); margin: var(--space-4) 0; }

        /* LIST (본문보다 더 좁게 중앙 정렬) */
        .care-list {
          margin-top: var(--space-4);
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
        }
        .care-msg { color: var(--color-muted); padding: var(--space-2) 0; }
        .care-err {
          color: #b91c1c;
          background: color-mix(in oklab, #fecaca, transparent 70%);
          border: 1px solid color-mix(in oklab, #fecaca, #000 10%);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
        }

        .care-ul { list-style: none; padding: 0; margin: 0; }

        /* (2) 예약 버튼을 가운데 라인에 오른쪽 정렬 */
        .care-li {
          padding: var(--space-3) var(--space-1);
          border-bottom: 1px solid var(--color-border);
          text-align: left;
          display: grid;
          grid-template-columns: 1fr auto; /* 왼쪽 내용 / 오른쪽 버튼 */
          grid-template-rows: auto auto;   /* 1행: 이름 / 2행: 주소 */
          align-items: center;             /* 각 행 세로 가운데 */
          gap: var(--space-2);
        }
        .care-name { grid-column: 1; grid-row: 1; font-weight: 700; }
        .care-addr { grid-column: 1; grid-row: 2; color: var(--color-muted); margin-top: 2px; font-size: var(--font-size-md); }
        .care-actions { grid-column: 2; grid-row: 1 / span 2; justify-self: end; align-self: center; } /* 가운데 높이 + 오른쪽 */
        .care-dist-inline { margin-left: 8px; color: var(--color-muted); font-size: var(--font-size-sm); }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          :root, .care-wrap[data-theme="light"], .care-wrap[data-theme="dark"] {
            --container-max: 100%;
            --map-height: 340px;
            --font-size-lg: 15px;
          }
          .care-searchbar { flex-direction: column; width: min(560px, 94%); }
          .care-searchbar .btn { width: 100%; }
        }
      `}</style>
    </main>
  );
}
