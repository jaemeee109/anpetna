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
};

export type AdminReservationPage = {
  content: AdminReservationLine[];
  totalPages: number;
  totalElements: number;
  pageNumber?: number;
  pageSize?: number;
};
