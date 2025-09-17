package com.anpetna.adminPage.service;

import com.anpetna.adminPage.dto.AdminPageDTO;
import com.anpetna.core.coreDto.PageResponseDTO;
import org.springframework.data.domain.Pageable;


public interface AdminMemberService {

    /*
     * (1) 관리자: 멤버 전체 목록 페이징 (검색어는 선택)
     */
    PageResponseDTO<AdminPageDTO> readAllMembers(String searchKeyword, Pageable pageable);

    /*
     * (2) 단일 회원에게 관리자 권한(ADMIN) 부여
     */
    void grantAdminRole(String memberId);

    /*
     * (3) 단일 회원의 관리자 권한 회수
     * 동작: 현재 역할이 ADMIN 인 경우에만 USER 로 되돌립니다.
     * 이미 USER 이거나 BLACKLIST 등 다른 역할이면 아무 것도 하지 않음(멱등하게 동작).
     */
    void revokeAdminRole(String memberId);

    /*
     * (4) 블랙리스트(ROLE = BLACKLIST)만 페이징 조회 (검색어는 선택)
     */
    PageResponseDTO<AdminPageDTO> readBlacklistMembers(String searchKeyword, Pageable pageable);
}
