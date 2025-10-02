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
  MyHospitalReservationDetail,
  MyHotelReservationDetail,
} from './venue.types';
import type { AdminBulkUpdateReservationStatusBody } from './venue.types';
import type { PageRes } from './venue.types';
import type { MyReservationLine } from './venue.types';
/**
 * 백엔드
 *  AdminVenueController, HospitalController, HotelController, VenueController 
 */
const VENUE_PATHS = {
  VENUE_ROOT: withPrefix('/venue'),
  HOSPITAL_ROOT: withPrefix('/hospital'),
  HOTEL_ROOT: withPrefix('/hotel'),
  ADMIN_ROOT: withPrefix('/admin/venue'),
} as const;



async function postWithRetry<T = any>(url: string, body: any, retry = 1): Promise<T> {
  try {
    const { data } = await http.post(url, body);
    return (data?.result ?? data) as T;
  } catch (err: any) {
    // 네트워크/5xx 계열만 1회 재시도
    const code = Number(err?.response?.status ?? 0);
    if (retry > 0 && (code === 0 || code >= 500)) {
      return postWithRetry<T>(url, body, retry - 1);
    }
    throw err;
  }
}


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
  const url = `${VENUE_PATHS.VENUE_ROOT}/${venueId}/hospital/reservations`;
  return await postWithRetry<CreateReservationRes>(url, body);
}

// 호텔 예약 생성 — POST /venue/{venueId}/hotel/reservations
export async function createHotelReservation(
  venueId: number,
  body: CreateHotelReservationReq
): Promise<CreateReservationRes> {
  const url = `${VENUE_PATHS.VENUE_ROOT}/${venueId}/hotel/reservations`;
  return await postWithRetry<CreateReservationRes>(url, body);
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



export async function listMyReservations(args: { page?: number; size?: number } = {}) {
  const page = Number(args.page ?? 1);
  const size = Number(args.size ?? 10);
  // 백엔드에서 ApiResult<T>로 감싸므로 data.result 언랩 필요: http.ts에서 공통 처리됩니다.
  const r = await http.get(withPrefix('/member/reservations'), { params: { page, size } });
  const data = (r as any)?.data ?? r;
  const payload = data?.result ?? data ?? {};
  return payload as PageRes<MyReservationLine>;
}


export async function readMyHospitalReservation(id: number) {
  const { data } = await http.get(withPrefix(`/member/reservations/hospital/${id}`));
  return (data?.result ?? data) as MyHospitalReservationDetail;
}
export async function readMyHotelReservation(id: number) {
  const { data } = await http.get(withPrefix(`/member/reservations/hotel/${id}`));
  return (data?.result ?? data) as MyHotelReservationDetail;
}
export async function cancelMyHospitalReservation(id: number) {
  const { data } = await http.post(withPrefix(`/member/reservations/hospital/${id}/cancel`), {});
  return data ?? { ok: true };
}
export async function cancelMyHotelReservation(id: number) {
  const { data } = await http.post(withPrefix(`/member/reservations/hotel/${id}/cancel`), {});
  return data ?? { ok: true };
}

// src/features/venue/data/venue.api.ts 내 추가
export async function adminReadHospitalReservation(id: number) {
  const { data } = await http.get(withPrefix(`/admin/venue/reservations/hospital/${id}`));
  return (data?.result ?? data) as MyHospitalReservationDetail;
}
export async function adminReadHotelReservation(id: number) {
  const { data } = await http.get(withPrefix(`/admin/venue/reservations/hotel/${id}`));
  return (data?.result ?? data) as MyHotelReservationDetail;
}



// ↓ venueApi 객체에 listMyReservations 추가
const venueApi = {
  listDoctors,
  listUnavailableTimes,
  createHospitalReservation,
  createHotelReservation,
  adminListReservations,
  adminBulkUpdateReservationStatus,
  listVenues,
  adminSetClosedTimes,
  listMyReservations, 
  readMyHospitalReservation,  
  readMyHotelReservation,     
  cancelMyHospitalReservation, 
  cancelMyHotelReservation,    
   adminReadHospitalReservation,
  adminReadHotelReservation,
};



export default venueApi;