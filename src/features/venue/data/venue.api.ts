// src/features/venue/data/venue.api.ts
import http from '@/shared/data/http';
import { withPrefix } from '@/lib/api';
import type {
  DoctorDTO,
  CreateHospitalReservationReq,
  CreateHotelReservationReq,
  CreateReservationRes,
  AdminReservationLine,
  AdminReservationPage,
   VenueSummary, 
} from './venue.types';
import type { AdminBulkUpdateReservationStatusBody } from './venue.types';
/**
 * ✅ 백엔드 경로 모음
 * (Back-Tree 기준: AdminVenueController, HospitalController, HotelController, VenueController 확인됨)
 */
const VENUE_PATHS = {
  VENUE_ROOT: withPrefix('/venue'),
  HOSPITAL_ROOT: withPrefix('/hospital'),
  HOTEL_ROOT: withPrefix('/hotel'),
  ADMIN_ROOT: withPrefix('/admin/venue'),
} as const;

function pickArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.items)) return data.items as T[]; 
  if (Array.isArray(data?.content)) return data.content as T[];
  if (Array.isArray(data?.list)) return data.list as T[];
  if (Array.isArray(data?.dtoList)) return data.dtoList as T[];
  return [];
}

// 매장 목록 — GET /venue/list
export async function listVenues(): Promise<VenueSummary[]> {
  const { data } = await http.get(`${VENUE_PATHS.VENUE_ROOT}/list`);
  const items = pickArray<any>(data);
  return items.map((v: any) => ({
    venueId: Number(v.venueId),
    venueName: String(v.venueName ?? ''),
  }));
}

/** (병원 예약용) 의사 목록 — GET /venue/{venueId}/doctors
 *  백엔드 필드가 { doctorId, name } 이므로
 *  프론트 DTO({ doctorId, doctorName })로 변환해서 반환합니다.
 */
export async function listDoctors(venueId: number): Promise<DoctorDTO[]> {
  const url = `${VENUE_PATHS.VENUE_ROOT}/${venueId}/doctors`;
  const { data } = await http.get(url);
  const raw = pickArray<any>(data);
  return raw.map((d: any) => ({
    doctorId: Number(d.doctorId),
    doctorName: String(d.doctorName ?? d.name ?? ''), // ← 핵심 매핑
  }));
}

/** (NEW) 의사/날짜별 예약불가 시간 — GET /hospital/unavailable-times
 *  요청: { doctorId, date(YYYY-MM-DD) }
 *  응답: { times: ["HH:mm", ...] }
 */
export async function listUnavailableTimes(params: {
  doctorId: number;
  date: string; // YYYY-MM-DD
}): Promise<string[]> {
  const { data } = await http.get(`${VENUE_PATHS.HOSPITAL_ROOT}/unavailable-times`, { params });
  return Array.isArray(data?.times) ? (data.times as string[]) : [];
}

// 병원 예약 생성 — POST /venue/{venueId}/hospital/reservations
export async function createHospitalReservation(
  venueId: number,
  body: CreateHospitalReservationReq
): Promise<CreateReservationRes> {
  // 백엔드 스펙에 맞춰 venueId를 경로에 포함
  const url = `${VENUE_PATHS.VENUE_ROOT}/${venueId}/hospital/reservations`; // :contentReference[oaicite:9]{index=9}
  const { data } = await http.post(url, body);
  return data as CreateReservationRes;
}


// 호텔 예약 생성 — POST /venue/{venueId}/hotel/reservations
export async function createHotelReservation(
  venueId: number,
  body: CreateHotelReservationReq
): Promise<CreateReservationRes> {
  const { data } = await http.post(`${VENUE_PATHS.VENUE_ROOT}/${venueId}/hotel/reservations`, body);
  return data as CreateReservationRes;
}

/** 관리자: 예약 리스트 — GET /admin/venue/reservations */
export async function adminListReservations(params: {
  venueId?: number | string;
  status?: string;
  type?: 'HOSPITAL' | 'HOTEL';
  memberId?: string;
  doctorId?: number | string;   // ← 추가
  date?: string;                // ← 추가 (YYYY-MM-DD)
  page?: number;
  size?: number;
}): Promise<AdminReservationPage> {
  const { data } = await http.get(`${VENUE_PATHS.ADMIN_ROOT}/reservations`, { params });
  const content = pickArray<AdminReservationLine>(data);
  return {
    content,
    totalPages: Number(data?.totalPages ?? 1),
    totalElements: Number(data?.totalElements ?? content.length ?? 0),
    pageNumber: Number(data?.pageNumber ?? data?.page ?? params.page ?? 1),
    pageSize: Number(data?.pageSize ?? params.size ?? 10),
  };
}

/** 관리자: 상태 일괄변경 — POST /admin/venue/reservations/status */
export async function adminBulkUpdateReservationStatus(body: {
  ids: number[];
  status: string;
}): Promise<{ updated?: number }> {
  const { data } = await http.post(`${VENUE_PATHS.ADMIN_ROOT}/reservations/status`, body);
  return data ?? {};
}
export async function adminSetClosedTimes(body: {
  doctorId: number;
  date: string;       // YYYY-MM-DD
  close: string[];    // ['09:00','09:30',...]
}): Promise<{ ok: boolean }> {
  const { data } = await http.post(`${VENUE_PATHS.ADMIN_ROOT}/hospital/closed-times`, body);
  return (data && typeof data.ok === 'boolean') ? data : { ok: true };
}

const venueApi = {
  listDoctors,
  listUnavailableTimes,
  createHospitalReservation,
  createHotelReservation,
  adminListReservations,
  adminBulkUpdateReservationStatus,
  listVenues,                
   adminSetClosedTimes,
};


export default venueApi;
