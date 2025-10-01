package com.anpetna.adminPage.dto;

import com.anpetna.member.constant.MemberRole;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminPageDTO {

    String memberId;          // PK (문자열)
    String name;              // MemberEntity 에 존재(업로드 파일에 name, email 토큰 확인됨)
    String email;
    MemberRole role;          // USER / ADMIN / BLACKLIST
    String phone;
}

/*
 * 관리자 목록 테이블 한 행에 그대로 쓰기 좋은 최소 데이터 묶음.
 * - MemberEntity 전체를 내보내면 연관관계/이미지 등으로 직렬화 폭발 가능 → 안전한 요약 전용 DTO
 */