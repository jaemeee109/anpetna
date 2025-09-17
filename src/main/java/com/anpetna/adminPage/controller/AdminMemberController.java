package com.anpetna.adminPage.controller;

import com.anpetna.ApiResult;
import com.anpetna.adminPage.dto.AdminPageDTO;
import com.anpetna.adminPage.service.AdminMemberService;
import com.anpetna.core.coreDto.PageResponseDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/adminPage")
public class AdminMemberController {

    /*
     * 관리자 전용 멤버 관리 컨트롤러
     */

    /*의존성 주입*/
    private final AdminMemberService adminMemberService;

    /*======================================================================================================*/
    /*
     * (1) 관리자: 멤버 전체 목록 페이징
     * - 예) GET /adminPage/members?page=0&size=20&sort=memberId,asc
     * - 검색을 하고 싶으면 searchKeyword 를 추가하세요.
     * 예) GET /adminPage/members?searchKeyword=user01
     */
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/AllMembers")
    public ApiResult<PageResponseDTO<AdminPageDTO>> readAllMembers(
            @RequestParam(required = false) String searchKeyword,
            @PageableDefault(size = 20, sort = "memberId") Pageable pageable
    ) {
        PageResponseDTO<AdminPageDTO> res = adminMemberService.readAllMembers(searchKeyword, pageable);
        return new ApiResult<>(res);
    }

    /*======================================================================================================*/
    /*
     * (2) 단일 회원에게 관리자 권한(ADMIN) 부여
     * - 예) POST /adminPage/members/user01/grant-admin
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/members/{memberId}/grant-admin")
    public ApiResult<Void> grantAdminRole(@PathVariable String memberId) {
        adminMemberService.grantAdminRole(memberId);
        return new ApiResult<>(null); // OK(200), 본문은 null
    }

    /*======================================================================================================*/
    /*
     * (3) 관리자 권한 회수 (ADMIN → USER)
     * - 예) POST /adminPage/members/user01/revoke-admin
     * - 바디 없이 호출하면 됩니다.
     * - 권한: ADMIN 만 접근 가능
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/members/{memberId}/revoke-admin")
    public ApiResult<Void> revokeAdminRole(@PathVariable String memberId) {
        adminMemberService.revokeAdminRole(memberId);
        return new ApiResult<>(null); // OK(200), 본문은 null
    }

    /*======================================================================================================*/

}