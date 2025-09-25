package com.anpetna.adminPage.controller;

import com.anpetna.ApiResult;
import com.anpetna.adminPage.dto.createBlacklist.CreateBlacklistReq;
import com.anpetna.adminPage.dto.createBlacklist.CreateBlacklistRes;
import com.anpetna.adminPage.dto.deleteBlacklist.DeleteBlacklistRes;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistReq;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistRes;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistReq;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistRes;
import com.anpetna.adminPage.service.AdminBlacklistService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Log4j2
@RestController
@RequestMapping(value = "/adminPage")
@RequiredArgsConstructor
@Validated
public class AdminBlacklistController {

    private final AdminBlacklistService adminBlacklistService;

    // ===========================================================

    /*
     * 블랙리스트 관리 컨트롤러
     * POST /adminPage/create/Blacklist?memberId=유저 ID
     * memberId는 쿼리스트링으로, 나머지는 Body 로 받음
     */
    @PreAuthorize("hasRole('ADMIN')") // 1차 가드
    @PostMapping(value = "/create/blacklist")
    public ApiResult<CreateBlacklistRes> createBlacklistRes(
            @RequestBody @Valid CreateBlacklistReq createBlacklistReq) {
        // 서비스에서 관리자 권한을 한 번 더 검증하고(KST 기준으로 기간 계산), 저장 후 PK 반환
        Long id = adminBlacklistService.createBlacklistRes(createBlacklistReq.getMemberId(), createBlacklistReq);

        // ApiResult 는 생성자에 payload 만 넣으면 isSuccess=true, resCode=200, resMessage="OK"
        return new ApiResult<>(new CreateBlacklistRes(id));
    }

    // ===========================================================
    /*
     * 블랙리스트 목록 조회 (관리자만)
     */
    @PreAuthorize("hasRole('ADMIN')")  // 1차 가드
    @GetMapping("/readAll/blacklist")
    public ApiResult<ReadBlacklistRes> list(ReadBlacklistReq readBlacklistReq,
                                            @PageableDefault(size = 20, sort = "id", direction = Sort.Direction.DESC)
                                            Pageable pageable) {
        ReadBlacklistRes readBlacklistRes = adminBlacklistService.readBlacklistRes(readBlacklistReq, pageable);
        return new ApiResult<>(readBlacklistRes);
    }

    // ===========================================================
    /*
     * 블랙리스트 수정 (사유/기한만)
     * body: { "reason": "...", "duration": "D3|D5|D7|INDEFINITE" }
     * 둘 중 하나만 보내도 됨
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/update/blacklist/{id}")
    public ApiResult<UpdateBlacklistRes> update(
            @PathVariable("id") Long id,
            @RequestBody @Valid UpdateBlacklistReq updateBlacklistReq
    ) {
        var updateBlacklistRes = adminBlacklistService.updateBlacklistRes(id, updateBlacklistReq);
        return new ApiResult<>(updateBlacklistRes); // OK(200), 빈 바디
    }

    // ===========================================================
    /*
     * 블랙리스트 삭제(해지)
     * 블랙리스트였었다는 기록은 남음
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/delete/blacklist/{id}")
    public ApiResult<DeleteBlacklistRes> delete(@PathVariable Long id) {
        return new ApiResult<>(adminBlacklistService.deleteBlacklistRes(id));
    }

    // ===========================================================
// 블랙리스트 전체 해제(활성 레코드 비활성화) + ROLE=USER 복귀
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    @PostMapping("/blacklist/active/{memberId}/deactivate")
    public ApiResult<Void> deactivateActiveByMember(@PathVariable String memberId) {
        adminBlacklistService.deactivateAllActiveForMember(memberId);
        return new ApiResult<>(null); // isSuccess=true, 200 OK
    }


}
