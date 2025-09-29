// src/features/venue/data/venue.types.ts
export type ReservationStatus = string; // 백엔드 enum 문자열 그대로 사용
export type PetGender = 'FEMALE' | 'MALE';
export type DoctorDTO = {
  doctorId: number;
  doctorName: string;
};

export type CreateHospitalReservationReq = {
  doctorId: number;
  /** ISO-8601 (예: 2025-09-30T10:30:00) */
  appointmentAt: string;

  reserverName: string;
  primaryPhone: string;
  secondaryPhone?: string;

  petName: string;
  petBirthYear: number;

  petSpecies: string;
  petGender: PetGender;

  memo?: string;
};

/** 호텔 예약 생성 요청 — 백엔드 DTO 1:1 매핑 */
export type CreateHotelReservationReq = {
  /** YYYY-MM-DD */
  checkIn: string;
  /** YYYY-MM-DD */
  checkOut: string;

  reserverName: string;
  primaryPhone: string;
  secondaryPhone?: string;

  petName: string;
  petBirthYear: number;

  memo?: string;
};
export type CreateReservationRes = {
  reservationId: number;
};

export type AdminReservationLine = {
  reservationId: number;
  status: ReservationStatus;
  type: 'HOSPITAL' | 'HOTEL';
  venueName: string;
  memberId?: string;

  // 병원 전용
  doctorId?: number;
  doctorName?: string;
  appointmentAt?: string;

  // 호텔 전용
  checkIn?: string;   // YYYY-MM-DD
  checkOut?: string;  // YYYY-MM-DD

  // 공통 보조
  reserverName?: string;
  primaryPhone?: string;
  petName?: string;
};


export type AdminReservationPage = {
  content: AdminReservationLine[];
  totalPages: number;
  totalElements: number;
  pageNumber?: number;
  pageSize?: number;
   appointment_at?: string;
};
// 매장 요약 타입 — Header 드롭다운/관리페이지 제목용
export type VenueSummary = { venueId: number; venueName: string };

export type ReservationType = 'HOSPITAL' | 'HOTEL';
export type AdminStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELED'
  | 'NOSHOW';

export interface AdminBulkUpdateReservationStatusBody {
  ids: number[];
  status: AdminStatus;
  /** 탭 정보 */
  type?: ReservationType;   // 서버가 필수면 ? 제거
  /** 지점 정보 */
  venueId?: number;         // 서버가 필수면 ? 제거
}

// 회원 예약내역 라인
export type MyReservationLine = {
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELED' | 'NOSHOW';
  venueName: string;                 // anpetna_venue.venue_name
  type: 'HOSPITAL' | 'HOTEL';        // 서비스 타입
  appointmentAt?: string | null;     // 병원: YYYY-MM-DDTHH:mm:ss 형태
  checkIn?: string | null;           // 호텔: YYYY-MM-DD
  checkOut?: string | null;          // 호텔: YYYY-MM-DD
  reservationId: number;
};

// 공용 페이지 응답 호환
export type PageRes<T> = {
  page?: number;
  size?: number;
  total?: number;
  totalElements?: number;
  dtoList?: T[];
  content?: T[];
  list?: T[];
};

// 병원 예약
export type MyHospitalReservationDetail = {
  reservationId: number;
  venueName: string;
  service: 'HOSPITAL';
  status: ReservationStatus;

  appointmentAt: string;     
  doctorName?: string;

  reserverName: string;
  primaryPhone: string;
  secondaryPhone?: string;

  petName: string;
  petBirthYear: number;
  petSpecies: string;
  petGender: PetGender;

  memo?: string;
};

// 호텔 예약
export type MyHotelReservationDetail = {
  reservationId: number;
  venueName: string;
  service: 'HOTEL';
  status: ReservationStatus;

  checkIn: string;   // YYYY-MM-DD
  checkOut: string;  // YYYY-MM-DD

  reserverName: string;
  primaryPhone: string;
  secondaryPhone?: string;

  petName: string;
  petBirthYear: number;

  memo?: string;
};

