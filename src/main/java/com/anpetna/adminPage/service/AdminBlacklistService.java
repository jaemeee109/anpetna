package com.anpetna.adminPage.service;

import com.anpetna.adminPage.dto.createBlacklist.CreateBlacklistReq;
import com.anpetna.adminPage.dto.deleteBlacklist.DeleteBlacklistRes;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistReq;
import com.anpetna.adminPage.dto.readBlacklist.ReadBlacklistRes;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistReq;
import com.anpetna.adminPage.dto.updateBlacklist.UpdateBlacklistRes;
import org.springframework.data.domain.Pageable;

public interface AdminBlacklistService {

    /*
     * 블랙리스트 생성(3/5/7/무기한)
     * adminId는 헤더로 받지 않고 서비스 내부에서 SecurityContext 로 확인
     * @param memberId 제재 대상 회원 ID
     * @param createBlacklistReq 사유 및 기간
     * @return 생성된 블랙리스트 PK
     */
    Long createBlacklistRes(String memberId, CreateBlacklistReq createBlacklistReq);

    /*
     * 블랙리스트 목록 조회
     * - activeOnly=true  : 현재 활성만
     * - activeOnly=false : 전체 이력
     */
    ReadBlacklistRes readBlacklistRes(ReadBlacklistReq readBlacklistReq, Pageable pageable);

    /*
     * 블랙리스트 수정(사유 수정 or 기한 수정, 둘중 하나만 수정도 가능)
     * @return 생성된 블랙리스트 PK
     */
    UpdateBlacklistRes updateBlacklistRes(Long id, UpdateBlacklistReq updateBlacklistReq);

    /*
     * 블랙리스트 삭제(해지, DB 에는 블랙리스트였었다는 기록은 남아있음)
     * @return 생성된 블랙리스트 PK
     */
    DeleteBlacklistRes deleteBlacklistRes(Long id);

    void deactivateAllActiveForMember(String memberId); // ★ 추가
}
